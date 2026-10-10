import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { sendPartnerMetric } from '../api/partnerMetrics';
import { usePartnerMeasure } from '../context/partnerMeasureShared';
import { overlayRootMargin } from '../lib/partnerOverlay';
import { countableActivation, createImpressionTracker } from '../lib/partnerMetrics';

// 한 슬롯 카드들의 가시 노출·최초 클릭 측정 (판정은 src/lib/partnerMetrics.js, 가림 신호는 partnerMeasureShared context).
// - IntersectionObserver(clipping 포함 비율) + performance.now() 타이머. 동의 배너 실측 높이만큼 rootMargin 아래쪽을 줄이고,
//   상단 sticky Header 실측 높이만큼 위쪽도 줄인다. Header·배너 높이·뷰포트 높이가 바뀌면 observer 를 새로 만들어 연속 시간을
//   처음부터 다시 잰다. 온보딩 모달·탭 hidden 은 전체 정지.
// - 원본·inert 복제 DOM 은 cardRef(item, copy) 로 같은 카드(placementId)에 묶는다. 클릭은 원본 링크에만 붙인다.
// - 전송 전 prepareSend 로 그 item 의 토큰을 받는다(만료 임박·hidden 복귀면 재조회 뒤). 실패하면 측정만 포기한다.
// - 링크 기본 이동은 막지 않고 집계 결과를 기다리지 않는다. 토큰이 없는 item(집계 off)은 관찰·전송하지 않는다.

// 타이머·전송을 맡는 React 밖 객체. latest 는 렌더마다 update() 로 받는 { items, prepareSend, ledger }.
function createMeasurer(slot) {
  const tracker = createImpressionTracker();
  let timer = null;
  let active = false;
  const latest = { current: { items: [], prepareSend: async () => null, ledger: null } };

  function send(placementId, eventType) {
    const { prepareSend, ledger } = latest.current;
    prepareSend(placementId).then((measurementToken) => {
      // 재조회 대기 중 화면을 떠났거나(정지) 페이지뷰가 바뀌면 보내지 않는다
      if (!measurementToken || !active || latest.current.ledger !== ledger) return;
      sendPartnerMetric({ placementId, slot, eventType, measurementToken });
    });
  }

  function fire() {
    timer = null;
    for (const placementId of tracker.due(performance.now())) {
      // 타이머 완료 시점의 최신 목록(신선도·종료 판정 통과)에 있고 토큰이 있을 때만
      const item = latest.current.items.find((i) => i.placementId === placementId);
      if (!item?.measurementToken) continue;
      if (latest.current.ledger.markOnce(slot, placementId, 'IMPRESSION')) send(placementId, 'IMPRESSION');
    }
    schedule();
  }

  function schedule() {
    clearTimeout(timer);
    timer = null;
    const at = tracker.nextDueAt();
    if (active && at != null) timer = setTimeout(fire, Math.max(0, at - performance.now()));
  }

  return {
    tracker,
    schedule,
    update(next) {
      latest.current = next;
    },
    click(item, event) {
      if (!countableActivation(event)) return;
      if (latest.current.ledger.markOnce(slot, item.placementId, 'CLICK')) send(item.placementId, 'CLICK');
    },
    start() {
      active = true;
      tracker.setDocumentVisible(document.visibilityState === 'visible', performance.now());
      schedule();
    },
    stop() {
      active = false;
      clearTimeout(timer);
      timer = null;
    },
  };
}

export default function usePartnerMetrics({ slot, items, prepareSend }) {
  const { ledger, overlay } = usePartnerMeasure();
  const { bannerHeight, headerHeight } = overlay;
  const [viewportHeight, setViewportHeight] = useState(0);
  const measurer = useMemo(() => createMeasurer(slot), [slot]);
  const elements = useRef(new Map()); // element → placementId
  const refs = useRef(new Map()); // `${placementId}:${copy}` → 안정된 ref 콜백
  const observer = useRef(null);

  useEffect(() => {
    measurer.update({ items, prepareSend, ledger });
  });

  // 마운트 동안 타이머·탭 visible·뷰포트 높이
  useEffect(() => {
    measurer.start();
    const onVisibility = () => {
      measurer.tracker.setDocumentVisible(document.visibilityState === 'visible', performance.now());
      measurer.schedule();
    };
    const onResize = () => setViewportHeight(window.innerHeight);
    onResize();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('resize', onResize);
    return () => {
      measurer.stop();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('resize', onResize);
    };
  }, [measurer]);

  // 온보딩 모달: 전체 정지·초기화
  useEffect(() => {
    measurer.tracker.setSuspended(overlay.suspended, performance.now());
    measurer.schedule();
  }, [overlay.suspended, measurer]);

  // Header·배너 높이·뷰포트 높이가 바뀌면 observer 를 새로 만든다
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined' || !viewportHeight) return undefined;
    const { tracker } = measurer;
    tracker.reset();
    const io = new IntersectionObserver((entries) => {
      const now = performance.now();
      for (const entry of entries) {
        const placementId = elements.current.get(entry.target);
        if (placementId == null) continue;
        tracker.observe(placementId, entry.target, entry.isIntersecting ? entry.intersectionRatio : 0, now);
      }
      measurer.schedule();
    }, { rootMargin: overlayRootMargin({ bannerHeight, headerHeight }, viewportHeight), threshold: [0, 0.25, 0.5, 0.75, 1] });
    observer.current = io;
    elements.current.forEach((_, el) => io.observe(el));
    measurer.schedule();
    return () => {
      io.disconnect();
      if (observer.current === io) observer.current = null;
    };
  }, [bannerHeight, headerHeight, viewportHeight, measurer]);

  // 카드 DOM ref. copy 는 원본 0, inert 복제 1 (같은 placementId 로 합친다)
  const cardRef = useCallback((item, copy = 0) => {
    if (!item.measurementToken) return undefined;
    const key = `${item.placementId}:${copy}`;
    if (!refs.current.has(key)) {
      let current = null;
      refs.current.set(key, (node) => {
        if (current) {
          observer.current?.unobserve(current);
          elements.current.delete(current);
          measurer.tracker.forget(item.placementId, current, performance.now());
          current = null;
        }
        if (node) {
          current = node;
          elements.current.set(node, item.placementId);
          observer.current?.observe(node);
        }
      });
    }
    return refs.current.get(key);
  }, [measurer]);

  // 원본 링크의 클릭 핸들러(기본 이동은 그대로)
  const linkProps = useCallback((item) => {
    if (!item.measurementToken) return {};
    const onActivate = (event) => measurer.click(item, event);
    return { onClick: onActivate, onAuxClick: onActivate };
  }, [measurer]);

  return { cardRef, linkProps };
}
