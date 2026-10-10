import { useState } from 'react';
import { PARTNER_CATEGORIES } from '../lib/partnerFeed';

// 광고 표기는 서버 문구와 무관하게 항상 이 고정 배지를 업체명 근처에 보인다
export const PARTNER_DISCLOSURE = '광고 · 제휴 업체';

const categoryLabel = (value) => PARTNER_CATEGORIES.find((c) => c.value === value)?.label ?? null;

// 제휴 업체 카드: 카드 전체가 업체 홈페이지로 가는 외부 링크다(새 창·sponsored). 예산에 담거나 토글을 바꾸지 않는다.
// 업체 서비스 가격·광고 단가는 보이지 않는다. 이미지는 배포된 /images/partners/ 자산만(외부 추적 없음, no-referrer).
// inert 복제 트랙(PartnerMarquee)에서도 같은 모양을 쓰므로 DOM id 를 두지 않는다.
export default function PartnerCard({ item, className = '' }) {
  const [imageFailed, setImageFailed] = useState(false);
  const meta = [categoryLabel(item.category), item.region].filter(Boolean).join(' · ');
  const showImage = item.imageUrl && !imageFailed;

  return (
    <a
      href={item.destinationUrl}
      target="_blank"
      rel="sponsored noopener noreferrer"
      aria-label={`${item.name} — ${PARTNER_DISCLOSURE}, 업체 홈페이지 보기 (새 창)`}
      className={`block bg-white rounded-2xl shadow-sm border border-warm-beige/30 overflow-hidden hover:shadow-md transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-soft-gold focus-visible:ring-offset-2 ${className}`}
    >
      <div className="h-36 bg-warm-beige/20 overflow-hidden flex items-center justify-center">
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
          <span aria-hidden="true" className="text-3xl text-charcoal/20">🤝</span>
        )}
      </div>
      <div className="p-4 space-y-1.5">
        <span className="inline-block text-[11px] font-semibold text-deep-rose bg-deep-rose/10 border border-deep-rose/20 px-2 py-0.5 rounded-full">
          {PARTNER_DISCLOSURE}
        </span>
        <p className="font-semibold text-charcoal text-sm break-words">{item.name}</p>
        {meta && <p className="text-xs text-charcoal/50">{meta}</p>}
        {item.summary && <p className="text-xs text-charcoal/60 line-clamp-2 break-words">{item.summary}</p>}
        <p className="text-xs font-medium text-soft-gold pt-1">업체 홈페이지 보기 (새 창) ↗</p>
      </div>
    </a>
  );
}
