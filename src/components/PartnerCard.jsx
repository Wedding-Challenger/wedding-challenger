import { useState } from 'react';
import { PARTNER_CATEGORIES } from '../lib/partnerFeed';
import { AD_LABEL } from '../lib/partnerDisclosure';
import AdDisclosure from './AdDisclosure';

const categoryLabel = (value) => PARTNER_CATEGORIES.find((c) => c.value === value)?.label ?? null;

// 제휴 업체 카드: 본문 전체가 업체 홈페이지로 가는 외부 링크다(새 창·sponsored). 예산에 담거나 토글을 바꾸지 않는다.
// 업체 서비스 가격·광고 단가는 보이지 않는다. 이미지는 배포된 /images/partners/ 자산만(외부 추적 없음, no-referrer).
// 광고 표시는 카드 오른쪽 아래 「광고 ⓘ」(AdDisclosure, 링크 밖 형제 — 링크 안에 버튼을 중첩하지 않는다).
// variant: tile(홈 마키, 위 이미지) | compact(예산 바구니 아래 세로 목록, 왼쪽 썸네일)
//   | side(가이드·체크리스트: 1024px 미만 compact, 이상 tile — 같은 DOM 하나를 CSS 로만 바꾼다).
// measureRef·linkProps 는 usePartnerMetrics 가 준다(inert 복제 트랙은 linkProps 없이 measureRef 만).
// inert 복제 트랙(PartnerMarquee)에서도 같은 모양을 쓰므로 고정 DOM id 를 두지 않는다.
// variant 별 클래스: 링크(배치) · 이미지 틀 · 본문 · 「홈페이지 보기」 줄
const LAYOUT = {
  tile: {
    link: 'block',
    image: 'h-36',
    body: 'p-4 pb-7 space-y-1.5',
    more: 'pt-1',
  },
  compact: {
    link: 'flex gap-3 items-center p-3 pb-6',
    image: 'w-16 h-16 shrink-0 rounded-xl',
    body: 'min-w-0 flex-1 space-y-0.5',
    more: 'hidden',
  },
  side: {
    link: 'flex gap-3 items-center p-3 pb-6 lg:block lg:p-0',
    image: 'w-16 h-16 shrink-0 rounded-xl lg:w-auto lg:h-44 lg:rounded-none',
    body: 'min-w-0 flex-1 space-y-0.5 lg:p-4 lg:pb-7 lg:space-y-1.5',
    more: 'hidden lg:block pt-1',
  },
};

export default function PartnerCard({ item, variant = 'tile', measureRef, linkProps, className = '' }) {
  const [imageFailed, setImageFailed] = useState(false);
  const meta = [categoryLabel(item.category), item.region].filter(Boolean).join(' · ');
  const showImage = item.imageUrl && !imageFailed;
  const label = item.disclosure ?? AD_LABEL;
  const layout = LAYOUT[variant] ?? LAYOUT.tile;

  return (
    <div
      ref={measureRef}
      className={`relative bg-white rounded-2xl shadow-sm border border-warm-beige/30 hover:shadow-md transition-shadow ${className}`}
    >
      <a
        href={item.destinationUrl}
        target="_blank"
        rel="sponsored noopener noreferrer"
        aria-label={`${item.name} — ${label}, 업체 홈페이지 보기 (새 창)`}
        {...linkProps}
        className={`${layout.link} rounded-2xl overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-soft-gold focus-visible:ring-offset-2`}
      >
        <div className={`${layout.image} bg-warm-beige/20 overflow-hidden flex items-center justify-center`}>
          {showImage ? (
            <img
              src={item.imageUrl}
              alt=""
              width={260}
              height={144}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              onError={() => setImageFailed(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <span aria-hidden="true" className="text-2xl text-charcoal/20">🤝</span>
          )}
        </div>
        <div className={layout.body}>
          <p className="font-semibold text-charcoal text-sm break-words">{item.name}</p>
          {meta && <p className="text-xs text-charcoal/50">{meta}</p>}
          {item.summary && <p className="text-xs text-charcoal/60 line-clamp-2 break-words">{item.summary}</p>}
          <p className={`${layout.more} text-xs font-medium text-soft-gold`}>업체 홈페이지 보기 (새 창) ↗</p>
        </div>
      </a>
      <AdDisclosure label={label} notice={item.disclosureNotice} className="absolute right-3 bottom-2" />
    </div>
  );
}
