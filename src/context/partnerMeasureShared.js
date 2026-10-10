import { createContext, useCallback, useContext, useEffect, useId, useMemo } from 'react';
import { createBannerObserver, initialOverlay, overlaySummary } from '../lib/partnerOverlay';
import { createPageViewLedger } from '../lib/partnerMetrics';

// 제휴 측정 context (계획서 §3.2 C8·D1). 공개 레이아웃(PartnerMeasureProvider)이 페이지뷰 ledger 와 가림 상태를 준다.
// 공급자 밖(단독 렌더·테스트)에서는 비어 있는 기본값으로 동작한다 — 측정 등록은 아무 일도 하지 않는다.
const FALLBACK = {
  ledger: createPageViewLedger(),
  overlay: overlaySummary(initialOverlay),
  dispatch: () => {},
};

export const PartnerMeasureContext = createContext(FALLBACK);

export const usePartnerMeasure = () => useContext(PartnerMeasureContext);

// 전체 화면 모달(Onboarding): 마운트 동안 모든 노출 타이머를 멈춘다
export function useOverlayModal() {
  const { dispatch } = usePartnerMeasure();
  const owner = useId();
  useEffect(() => {
    dispatch({ type: 'MODAL_OPEN', owner });
    return () => dispatch({ type: 'MODAL_CLOSE', owner });
  }, [dispatch, owner]);
}

// 하단 배너(ConsentBanner): 돌려준 ref 콜백을 open=true 로 렌더한 배너 div 에 붙인다.
// 붙을 때 ResizeObserver 로 실측 높이를 등록하고, 떨어질 때(닫힘·언마운트) 0 으로 해제한다.
// 컴포넌트의 조기 return 보다 위에서 부른다(닫힌 채 마운트 → 열림, 푸터에서 다시 열기 모두 ref 재부착으로 다시 잰다).
export function useOverlayBanner() {
  const { dispatch } = usePartnerMeasure();
  const owner = useId();
  const observer = useMemo(
    () => createBannerObserver({
      onHeight: (height) => dispatch({ type: 'BANNER_HEIGHT', owner, height }),
      ResizeObserverImpl: typeof ResizeObserver === 'undefined' ? undefined : ResizeObserver,
    }),
    [dispatch, owner],
  );
  return useCallback((node) => observer.attach(node), [observer]);
}
