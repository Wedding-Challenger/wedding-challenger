import { Link } from 'react-router-dom';
import { useOverlayBanner } from '../context/partnerMeasureShared';

// 열림 여부·저장은 App 이 관리. 첫 방문 시 자동 표시, 이후 푸터 「광고 동의 설정」으로 다시 열림.
// 제휴 노출 측정은 배너가 가린 아래쪽만 뺀다(계획서 C1·D1): open=true 로 렌더된 배너 div 에 ref 가 붙을 때 실측 높이를
// 등록하고, 닫히거나 언마운트되면 0 으로 해제한다. hook 은 조기 return 보다 위에 둔다. 문구는 바꾸지 않는다.
export default function ConsentBanner({ open, onDecide }) {
  const bannerRef = useOverlayBanner();
  // PIPA 적합성 검토 필요 — 김경수 P0 게이트 (docs/privacy/consent-banner-copy.ko.md 와 정합)
  if (!open) return null;

  const decide = (ads) => onDecide({ necessary: true, ads });

  return (
    <div ref={bannerRef} className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-warm-beige/40 shadow-lg p-6">
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-start md:items-center gap-4">
        <div className="flex-1">
          <h3 className="text-charcoal font-semibold mb-1">쿠키 및 광고 동의</h3>
          <p className="text-sm text-charcoal/60">
            웨딩챌린저는 서비스 운영(필수)과 맞춤 광고(선택)를 위해 쿠키를 사용합니다.
            자세한 내용은{' '}
            <Link to="/privacy" className="text-deep-rose underline">개인정보처리방침</Link> 참조.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => decide(false)}
            className="px-4 py-2 text-sm border border-warm-beige/60 rounded-lg text-charcoal hover:bg-warm-beige/20"
          >
            필수만 허용
          </button>
          <button
            onClick={() => decide(true)}
            className="px-4 py-2 text-sm bg-soft-gold text-white rounded-lg hover:bg-soft-gold/90"
          >
            전체 동의
          </button>
        </div>
      </div>
    </div>
  );
}
