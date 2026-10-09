import usePartnerFeed from '../hooks/usePartnerFeed';
import HorizontalScroll from './HorizontalScroll';
import PartnerCard from './PartnerCard';

// 예산 계산 「제휴 업체」(BUDGET_PARTNERS). 스드메 범위 다음·스냅 촬영 바로 위, 스냅을 꺼도 보인다.
// 0건·실패·슬롯 off 면 제목·자리 모두 그리지 않는다. 카드는 예산 합계·선택과 연결하지 않는다.
export default function PartnerSection() {
  const items = usePartnerFeed('BUDGET_PARTNERS');
  if (items.length === 0) return null;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-bold text-charcoal flex items-center gap-2">
          <span className="w-8 h-8 bg-soft-gold/10 rounded-lg flex items-center justify-center text-sm">🤝</span>
          제휴 업체
        </h3>
        <p className="text-xs text-charcoal/50 mt-1">광고료를 받고 노출하는 제휴 업체입니다</p>
      </div>
      <HorizontalScroll label="제휴 업체">
        {items.map((item) => (
          <div key={item.placementId} className="w-[250px] max-w-[calc(100vw-4rem)] shrink-0">
            <PartnerCard item={item} />
          </div>
        ))}
      </HorizontalScroll>
    </div>
  );
}
