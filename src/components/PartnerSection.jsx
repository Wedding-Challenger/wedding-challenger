import usePartnerFeed from '../hooks/usePartnerFeed';
import usePartnerMetrics from '../hooks/usePartnerMetrics';
import PartnerCard from './PartnerCard';

// 예산 계산 「제휴 업체」(BUDGET_PARTNERS). 견적 바구니와 같은 sticky 래퍼 안, 바구니 바로 아래의 세로 컴팩트 목록이다
// (가로 스크롤 없음, 계획서 B1·C7). 0건·실패·슬롯 off 면 제목·자리 모두 그리지 않는다. 카드는 예산 합계·선택과 연결하지 않는다.
// 광고 표시는 카드마다 「광고 ⓘ」(G4) — 섹션 안내 문장은 두지 않는다.
const SLOT = 'BUDGET_PARTNERS';

export default function PartnerSection() {
  const { items, prepareSend } = usePartnerFeed(SLOT);
  const { cardRef, linkProps } = usePartnerMetrics({ slot: SLOT, items, prepareSend });
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="budget-partners-title" data-partner-slot={SLOT} className="bg-white/70 rounded-3xl border border-warm-beige/30 p-4 space-y-3">
      <h3 id="budget-partners-title" className="text-sm font-bold text-charcoal flex items-center gap-2">
        <span aria-hidden="true" className="w-7 h-7 bg-soft-gold/10 rounded-lg flex items-center justify-center text-xs">🤝</span>
        제휴 업체
      </h3>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.placementId}>
            <PartnerCard item={item} variant="compact" measureRef={cardRef(item)} linkProps={linkProps(item)} />
          </li>
        ))}
      </ul>
    </section>
  );
}
