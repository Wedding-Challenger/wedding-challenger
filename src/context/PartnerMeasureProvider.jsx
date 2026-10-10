import { useMemo, useReducer, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { initialOverlay, overlayReducer, overlaySummary } from '../lib/partnerOverlay';
import { createPageViewLedger } from '../lib/partnerMetrics';
import { PartnerMeasureContext } from './partnerMeasureShared';

// 공개 레이아웃 전용. 페이지뷰 = 공개 route(pathname) 진입 — pathname 이 바뀔 때만 ledger(측정 1회 기록·업종 순환 고정)를 새로 만든다.
// StrictMode 재마운트·50초 재조회·bfcache 복원에는 그대로 둔다. 식별자·쿠키·저장소를 쓰지 않는 메모리 상태다.
export default function PartnerMeasureProvider({ children }) {
  const { pathname } = useLocation();
  const [view, setView] = useState(() => ({ pathname, ledger: createPageViewLedger() }));
  if (view.pathname !== pathname) setView({ pathname, ledger: createPageViewLedger() });
  const [overlayState, dispatch] = useReducer(overlayReducer, initialOverlay);
  const { suspended, bannerHeight } = overlaySummary(overlayState);
  const value = useMemo(
    () => ({ ledger: view.ledger, overlay: { suspended, bannerHeight }, dispatch }),
    [view.ledger, suspended, bannerHeight],
  );
  return <PartnerMeasureContext.Provider value={value}>{children}</PartnerMeasureContext.Provider>;
}
