import { useEffect, useState } from 'react';
import { getPartners } from '../api/partners';
import { FRESH_MS, failedFeed, nextWakeAt, refetchAt, toFeed, visibleItems } from '../lib/partnerFeed';

// 한 슬롯의 공개 제휴 카드 목록. 사전 렌더링·첫 렌더는 빈 목록(제휴 없음)으로 같게 시작하고, 하이드레이션 뒤 읽는다.
// 서버 refreshAt(최대 50초)마다·탭 복귀·창 focus 때 다시 받고, 카드 종료·60초 신선도 만료 시각에 다시 판정한다.
// 목록은 이 페이지 메모리에만 둔다(localStorage·정적 HTML 에 굽지 않음).
export default function usePartnerFeed(slot) {
  const [feed, setFeed] = useState(null);
  const [now, setNow] = useState(0);

  useEffect(() => {
    let alive = true;
    let seq = 0;
    let timer = null;
    let current = null;

    const wakeAt = (at, fn) => {
      clearTimeout(timer);
      timer = setTimeout(fn, Math.max(at - Date.now(), 0));
    };

    const tick = () => {
      const t = Date.now();
      setNow(t);
      if (t >= refetchAt(current)) load();
      else wakeAt(nextWakeAt(current, t), tick);
    };

    async function load() {
      const id = ++seq;
      // 응답이 늦어도 60초 신선도 만료에는 화면을 비운다
      if (current) wakeAt(current.fetchedAt + FRESH_MS + 1, () => setNow(Date.now()));
      let next;
      try {
        next = toFeed(await getPartners(slot), Date.now());
      } catch {
        next = failedFeed(Date.now());
      }
      if (!alive || id !== seq) return;
      current = next;
      setFeed(next);
      setNow(next.fetchedAt);
      wakeAt(nextWakeAt(next, next.fetchedAt), tick);
    }

    const onReturn = () => {
      if (document.visibilityState === 'visible') load();
    };

    load();
    document.addEventListener('visibilitychange', onReturn);
    window.addEventListener('focus', onReturn);
    return () => {
      alive = false;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onReturn);
      window.removeEventListener('focus', onReturn);
    };
  }, [slot]);

  return visibleItems(feed, now);
}
