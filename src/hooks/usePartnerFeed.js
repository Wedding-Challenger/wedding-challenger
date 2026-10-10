import { useEffect, useState } from 'react';
import { getPartners } from '../api/partners';
import { createPartnerFeedController } from '../lib/partnerFeedController';
import { usePartnerMeasure } from '../context/partnerMeasureShared';

// 한 슬롯의 공개 제휴 카드 목록. 사전 렌더링·첫 렌더는 빈 목록(제휴 없음)으로 같게 시작하고, 하이드레이션 뒤 읽는다.
// 재조회·카드 종료·60초 신선도 판정·업종 순환은 src/lib/partnerFeedController.js 가 맡고, 여기서는 탭 복귀·창 focus 때
// 다시 받고 탭이 숨으면 표시만 한다(측정 전송 전 재조회). 업종 순환 고정은 페이지뷰 ledger 에 둔다.
// 목록은 이 페이지 메모리에만 둔다(localStorage·정적 HTML 에 굽지 않음).
// 돌려주는 prepareSend(placementId) 는 측정 전송에 쓸 그 item 의 토큰(필요하면 재조회 뒤) 또는 null.
const NO_SEND = async () => null;

export default function usePartnerFeed(slot) {
  const { ledger } = usePartnerMeasure();
  const [state, setState] = useState({ items: [], prepareSend: NO_SEND });

  useEffect(() => {
    const controller = createPartnerFeedController({
      load: () => getPartners(slot),
      onUpdate: (items) => setState({ items, prepareSend: controller.prepareSend }),
      pins: ledger.pinsFor(slot),
    });
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') controller.markHidden();
      else controller.refresh();
    };
    const onFocus = () => {
      if (document.visibilityState === 'visible') controller.refresh();
    };
    controller.start();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onFocus);
    return () => {
      controller.stop();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onFocus);
    };
  }, [slot, ledger]);

  return state;
}
