import usePartnerFeed from '../hooks/usePartnerFeed';
import usePartnerMetrics from '../hooks/usePartnerMetrics';
import PartnerCard from './PartnerCard';

// 가이드·체크리스트 사이드 1구좌(GUIDE_SIDEBAR·CHECKLIST_SIDEBAR). 레이아웃 플래그 on 일 때만 그린다.
// 사이드 슬롯은 서버가 rotationGroup 을 슬롯 하나(SLOT)로 줘서 순환 결과가 1건이다(조율자 H2). 그래도 첫 카드만 보인다.
// PC 는 tile, 모바일(첫 본문 묶음 뒤)은 compact 모양 — 같은 카드 DOM 하나를 CSS 로만 바꾼다(숨긴 중복 광고 없음).
// 0건·실패·슬롯 off 면 아무것도 그리지 않는다(모바일은 자리를 접고, PC 는 고정 열만 남는다).
export default function PartnerSidebar({ slot }) {
  const { items, prepareSend } = usePartnerFeed(slot);
  const { cardRef, linkProps } = usePartnerMetrics({ slot, items, prepareSend });
  const item = items[0];
  if (!item) return null;

  return (
    <section aria-labelledby={`${slot}-title`} data-partner-slot={slot} className="space-y-2">
      <h2 id={`${slot}-title`} className="text-xs font-bold text-charcoal/60">제휴 업체</h2>
      <PartnerCard item={item} variant="side" measureRef={cardRef(item)} linkProps={linkProps(item)} />
    </section>
  );
}
