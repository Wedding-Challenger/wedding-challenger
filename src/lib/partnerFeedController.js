import { FRESH_MS, failedFeed, pickRotation, refetchAt, toFeed, visibleItems } from './partnerFeed';
import { tokenNeedsRefresh } from './partnerMetrics';

// 한 슬롯 제휴 목록의 재조회·만료 스케줄러 (React 없이 테스트할 수 있게 훅에서 뺐다).
// 타이머 두 개를 따로 둔다:
// - 만료 타이머: 카드 종료(visibleUntil)·60초 신선도 만료 시각에 다시 판정한다. 재조회 요청이 진행 중이어도 그대로 돈다.
// - 재조회 타이머: 서버 refreshAt(최대 50초)·실패 뒤 재시도 시각에 다시 받는다.
// 응답은 요청 세대(seq)로 묶어, 탭 복귀 등으로 나중에 시작한 요청보다 늦게 온 응답은 버린다.
// setTimeout 지연은 32비트(2^31-1 ms)를 넘으면 바로 실행된다. 여기서 잡는 지연은 모두 그 아래로 자른다
// (자른 타이머가 먼저 깨면 다시 판정해 재예약한다).
// 화면에 내보내는 목록은 업종 순환(pickRotation)으로 그룹당 1개다. 그룹별 고정은 주입한 페이지뷰 저장소(pins)에 둔다.
// 측정 전송 전 토큰 준비(prepareSend): hidden 복귀 뒤·토큰 남은 시간 11초 이하면 재조회가 끝난 다음 그 item 의 토큰을 준다.
// 재조회가 다른 재조회에 추월되면 최신 세대가 실제 반영될 때까지 기다린 뒤 hidden·토큰 신선도를 다시 검사한다.
// 기다림은 특정 요청 promise 가 아니라 「요청 세대 변경·최신 응답 반영·stop」 신호로 깬다(추월당한 낡은 요청이 끝나지 않아도
// 최신 응답이 반영되면 진행). 전송 준비 제한시간(SEND_PREPARE_TIMEOUT_MS)을 넘기거나 stop 이면 보내지 않는다(null —
// 측정 손실은 허용하고 낡은 토큰은 보내지 않는다).
export const SEND_PREPARE_TIMEOUT_MS = 5000;
export const MAX_TIMER_DELAY = 2 ** 31 - 2;
export const safeDelay = (ms) => Math.min(Math.max(ms, 0), MAX_TIMER_DELAY);

function memoryPins() {
  let pins = {};
  return { read: () => pins, write: (next) => { pins = next; } };
}

export function createPartnerFeedController({ load, onUpdate, pins = memoryPins() }) {
  let feed = null;
  let seq = 0;
  let stopped = false;
  let expiryTimer = null;
  let refetchTimer = null;
  let appliedSeq = 0; // 마지막으로 반영된 응답의 요청 세대(seq 와 같으면 기다릴 요청이 없다)
  let hiddenEpoch = 0; // markHidden 마다 +1
  let freshEpoch = 0; // 마지막으로 반영된 응답을 요청할 때의 hiddenEpoch

  // 대기 신호: 세대 변경·응답 반영·stop 때마다 지금 신호를 깨우고 새로 만든다
  let wake;
  let changed;
  const resetSignal = () => {
    changed = new Promise((resolve) => { wake = resolve; });
  };
  resetSignal();
  const notify = () => {
    const resolve = wake;
    resetSignal();
    resolve();
  };

  const emit = () => {
    const { items, pins: next } = pickRotation(visibleItems(feed, Date.now()), pins.read());
    // 보이는 카드가 없으면 고정을 지우지 않는다(잠깐 실패한 뒤 같은 페이지뷰에서 같은 업체로 돌아오게)
    if (items.length) pins.write({ ...pins.read(), ...next });
    onUpdate(items);
  };

  // 다음으로 화면이 바뀔 시각: 신선도 만료 직후 또는 가장 빠른 카드 종료.
  // 이미 신선도가 끝난 목록은 비어 있으므로 새 응답까지 타이머를 잡지 않는다(먼 종료 시각으로 32비트 지연을 넘기지 않게).
  function scheduleExpiry() {
    clearTimeout(expiryTimer);
    expiryTimer = null;
    const now = Date.now();
    const staleAt = feed.fetchedAt + FRESH_MS + 1;
    if (now >= staleAt) return;
    const ends = feed.items.map((i) => i.visibleUntil).filter((t) => t != null && t > now);
    const at = Math.min(staleAt, ...ends);
    expiryTimer = setTimeout(() => {
      emit();
      scheduleExpiry();
    }, safeDelay(at - now));
  }

  async function run(id, epoch) {
    let next;
    try {
      next = toFeed(await load(), Date.now());
    } catch {
      next = failedFeed(Date.now());
    }
    if (stopped || id !== seq) return;
    feed = next;
    appliedSeq = id;
    if (next.ok) freshEpoch = epoch;
    emit();
    scheduleExpiry();
    refetchTimer = setTimeout(refresh, safeDelay(refetchAt(feed) - Date.now()));
    notify();
  }

  function refresh() {
    if (stopped) return Promise.resolve();
    const id = ++seq;
    clearTimeout(refetchTimer);
    refetchTimer = null;
    const promise = run(id, hiddenEpoch);
    notify();
    return promise;
  }

  // 지금 보이는(신선도·종료 판정을 통과한) 목록에서 그 배치의 토큰. 화면 순환과 무관하게 서버가 준 후보 전체에서 찾는다.
  function currentItem(placementId) {
    return feed ? visibleItems(feed, Date.now()).find((i) => i.placementId === placementId) ?? null : null;
  }

  const isStale = (placementId) => freshEpoch < hiddenEpoch || tokenNeedsRefresh(currentItem(placementId), Date.now());

  async function prepareSend(placementId) {
    let timedOut = false;
    let timer;
    const expired = new Promise((resolve) => {
      timer = setTimeout(() => {
        timedOut = true;
        resolve();
      }, SEND_PREPARE_TIMEOUT_MS);
    });
    try {
      let refreshed = false;
      for (;;) {
        // 최신 세대가 반영될 때까지(그 사이 더 새 요청이 시작되면 그것까지) 기다린다. 기다릴 요청이 없으면 곧바로 판정한다
        // (동시에 부른 전송이 같은 재조회 하나를 함께 기다리게)
        while (appliedSeq !== seq && !stopped && !timedOut) await Promise.race([changed, expired]);
        if (stopped || timedOut) return null;
        if (!isStale(placementId)) break;
        // 직접 시작한(또는 그 뒤 추월한) 최신 재조회가 반영됐는데도 hidden 뒤 미갱신·잔여 11초 이하면 측정만 포기
        if (refreshed) return null;
        refreshed = true;
        refresh();
      }
      const item = currentItem(placementId);
      if (!item?.measurementToken) return null;
      if (item.measurementTokenExpiresAt != null && item.measurementTokenExpiresAt <= Date.now()) return null;
      return item.measurementToken;
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    start: refresh,
    refresh,
    prepareSend,
    // 탭이 숨으면 표시한다. 다음 전송 전에 숨은 뒤 시작한 재조회가 끝나야 한다
    markHidden() {
      hiddenEpoch += 1;
    },
    stop() {
      stopped = true;
      clearTimeout(expiryTimer);
      clearTimeout(refetchTimer);
      expiryTimer = null;
      refetchTimer = null;
      notify();
    },
  };
}
