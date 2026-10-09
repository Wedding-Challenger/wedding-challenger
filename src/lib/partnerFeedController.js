import { FRESH_MS, failedFeed, refetchAt, toFeed, visibleItems } from './partnerFeed';

// 한 슬롯 제휴 목록의 재조회·만료 스케줄러 (React 없이 테스트할 수 있게 훅에서 뺐다).
// 타이머 두 개를 따로 둔다:
// - 만료 타이머: 카드 종료(visibleUntil)·60초 신선도 만료 시각에 다시 판정한다. 재조회 요청이 진행 중이어도 그대로 돈다.
// - 재조회 타이머: 서버 refreshAt(최대 50초)·실패 뒤 재시도 시각에 다시 받는다.
// 응답은 요청 세대(seq)로 묶어, 탭 복귀 등으로 나중에 시작한 요청보다 늦게 온 응답은 버린다.
// setTimeout 지연은 32비트(2^31-1 ms)를 넘으면 바로 실행된다. 여기서 잡는 지연은 모두 그 아래로 자른다
// (자른 타이머가 먼저 깨면 다시 판정해 재예약한다).
export const MAX_TIMER_DELAY = 2 ** 31 - 2;
export const safeDelay = (ms) => Math.min(Math.max(ms, 0), MAX_TIMER_DELAY);

export function createPartnerFeedController({ load, onUpdate }) {
  let feed = null;
  let seq = 0;
  let stopped = false;
  let expiryTimer = null;
  let refetchTimer = null;

  const emit = () => onUpdate(visibleItems(feed, Date.now()));

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

  async function refresh() {
    if (stopped) return;
    const id = ++seq;
    clearTimeout(refetchTimer);
    refetchTimer = null;
    let next;
    try {
      next = toFeed(await load(), Date.now());
    } catch {
      next = failedFeed(Date.now());
    }
    if (stopped || id !== seq) return;
    feed = next;
    emit();
    scheduleExpiry();
    refetchTimer = setTimeout(refresh, safeDelay(refetchAt(feed) - Date.now()));
  }

  return {
    start: refresh,
    refresh,
    stop() {
      stopped = true;
      clearTimeout(expiryTimer);
      clearTimeout(refetchTimer);
      expiryTimer = null;
      refetchTimer = null;
    },
  };
}
