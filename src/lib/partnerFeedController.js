import { FRESH_MS, failedFeed, refetchAt, toFeed, visibleItems } from './partnerFeed';

// 한 슬롯 제휴 목록의 재조회·만료 스케줄러 (React 없이 테스트할 수 있게 훅에서 뺐다).
// 타이머 두 개를 따로 둔다:
// - 만료 타이머: 카드 종료(visibleUntil)·60초 신선도 만료 시각에 다시 판정한다. 재조회 요청이 진행 중이어도 그대로 돈다.
// - 재조회 타이머: 서버 refreshAt(최대 50초)·실패 뒤 재시도 시각에 다시 받는다.
// 응답은 요청 세대(seq)로 묶어, 탭 복귀 등으로 나중에 시작한 요청보다 늦게 온 응답은 버린다.
export function createPartnerFeedController({ load, onUpdate }) {
  let feed = null;
  let seq = 0;
  let stopped = false;
  let expiryTimer = null;
  let refetchTimer = null;

  const emit = () => onUpdate(visibleItems(feed, Date.now()));

  // 다음으로 화면이 바뀔 시각: 신선도 만료 직후 또는 가장 빠른 카드 종료
  function scheduleExpiry() {
    clearTimeout(expiryTimer);
    expiryTimer = null;
    const now = Date.now();
    const ends = feed.items.map((i) => i.visibleUntil).filter((t) => t != null && t > now);
    const staleAt = feed.fetchedAt + FRESH_MS + 1;
    const at = Math.min(...ends, ...(staleAt > now ? [staleAt] : []));
    if (!Number.isFinite(at)) return;
    expiryTimer = setTimeout(() => {
      emit();
      scheduleExpiry();
    }, at - now);
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
    refetchTimer = setTimeout(refresh, Math.max(refetchAt(feed) - Date.now(), 0));
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
