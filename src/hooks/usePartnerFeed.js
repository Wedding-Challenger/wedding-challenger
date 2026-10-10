import { useEffect, useState } from 'react';
import { getPartners } from '../api/partners';
import { createPartnerFeedController } from '../lib/partnerFeedController';

// 한 슬롯의 공개 제휴 카드 목록. 사전 렌더링·첫 렌더는 빈 목록(제휴 없음)으로 같게 시작하고, 하이드레이션 뒤 읽는다.
// 재조회·카드 종료·60초 신선도 판정은 src/lib/partnerFeedController.js 가 맡고, 여기서는 탭 복귀·창 focus 때 다시 받게만 한다.
// 목록은 이 페이지 메모리에만 둔다(localStorage·정적 HTML 에 굽지 않음).
export default function usePartnerFeed(slot) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const controller = createPartnerFeedController({ load: () => getPartners(slot), onUpdate: setItems });
    const onReturn = () => {
      if (document.visibilityState === 'visible') controller.refresh();
    };
    controller.start();
    document.addEventListener('visibilitychange', onReturn);
    window.addEventListener('focus', onReturn);
    return () => {
      controller.stop();
      document.removeEventListener('visibilitychange', onReturn);
      window.removeEventListener('focus', onReturn);
    };
  }, [slot]);

  return items;
}
