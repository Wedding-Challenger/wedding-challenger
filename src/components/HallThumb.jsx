import { displayName, hallIllustration, hasPhoto } from '../lib/halls';

// 사진이 있으면 사진, 없으면 업체·지역 일러스트 (실제 사진으로 오해하지 않게 '일러스트' 표시)
export default function HallThumb({ hall, className = '' }) {
  const name = displayName(hall.name);
  if (hasPhoto(hall)) {
    return <img src={hall.image} alt={name} loading="lazy" className={`w-full h-full object-cover ${className}`} />;
  }
  const src = hallIllustration(hall);
  // 지역 일러스트는 정사각형 랜드마크라 자르지 않고 전체를 보여 주고, 여백은 같은 이미지를 흐리게 깔고 좌우 끝을 페이드해 이어 붙인다
  const isRegion = src.includes('/regions/');
  return (
    <div className="relative w-full h-full overflow-hidden bg-warm-beige/40">
      {isRegion && (
        <img src={src} alt="" aria-hidden="true" loading="lazy" className="absolute inset-0 w-full h-full object-cover scale-125 blur-2xl" />
      )}
      {isRegion ? (
        // 그림 크기의 정사각형 틀 기준으로 좌우 끝을 페이드
        <div className="relative h-full aspect-square mx-auto [mask-image:linear-gradient(to_right,transparent,black_18%,black_82%,transparent)]">
          <img src={src} alt={`${name} (일러스트)`} loading="lazy" decoding="async" className={`w-full h-full object-cover ${className}`} />
        </div>
      ) : (
        <img src={src} alt={`${name} (일러스트)`} loading="lazy" decoding="async" className={`w-full h-full object-cover ${className}`} />
      )}
      <span className="absolute bottom-2 left-2 bg-white/80 backdrop-blur-sm text-[10px] text-charcoal/50 px-2 py-0.5 rounded-full">
        일러스트
      </span>
    </div>
  );
}
