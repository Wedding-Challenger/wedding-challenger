import { displayName, hasPhoto } from '../lib/halls';

// 사진이 없으면 이름 첫 글자와 위치로 썸네일을 그린다
export default function HallThumb({ hall, className = '' }) {
  if (hasPhoto(hall)) {
    return <img src={hall.image} alt={displayName(hall.name)} className={`w-full h-full object-cover ${className}`} />;
  }
  const name = displayName(hall.name);
  return (
    <div
      role="img"
      aria-label={name}
      className={`w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-warm-beige/60 via-cream to-soft-gold/20 ${className}`}
    >
      <span className="text-4xl font-bold text-soft-gold/80">{name.slice(0, 1)}</span>
      {hall.location && <span className="mt-2 text-xs text-charcoal/40">{hall.location}</span>}
    </div>
  );
}
