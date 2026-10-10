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
  let inflight = null; // 가장 최근 요청이 반영될 때까지의 promise
  let hiddenEpoch = 0; // markHidden 마다 +1
  let freshEpoch = 0; // 마지막으로 반영된 응답을 요청할 때의 hiddenEpoch

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
    if (next.ok) freshEpoch = epoch;
    emit();
    scheduleExpiry();
    refetchTimer = setTimeout(refresh, safeDelay(refetchAt(feed) - Date.now()));
  }

  function refresh() {
    if (stopped) return Promise.resolve();
    const id = ++seq;
    clearTimeout(refetchTimer);
    refetchTimer = null;
    const promise = run(id, hiddenEpoch).finally(() => {
      if (inflight === promise) inflight = null;
    });
    inflight = promise;
    return promise;
  }

  // 지금 보이는(신선도·종료 판정을 통과한) 목록에서 그 배치의 토큰. 화면 순환과 무관하게 서버가 준 후보 전체에서 찾는다.
  function currentItem(placementId) {
    return feed ? visibleItems(feed, Date.now()).find((i) => i.placementId === placementId) ?? null : null;
  }

  async function prepareSend(placementId) {
    if (stopped) return null;
    // 진행 중인 재조회(탭 복귀 등)가 있으면 그 결과를 먼저 본다
    if (inflight) await inflight;
    const stale = freshEpoch < hiddenEpoch || tokenNeedsRefresh(currentItem(placementId), Date.now());
    if (stale && !stopped) await refresh();
    if (stopped) return null;
    const item = currentItem(placementId);
    if (!item?.measurementToken) return null;
    if (item.measurementTokenExpiresAt != null && item.measurementTokenExpiresAt <= Date.now()) return null;
    return item.measurementToken;
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
    },
  };
}
