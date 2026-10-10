import { useCallback, useEffect, useRef, useState } from 'react';
import { scrollFromThumbDrag, scrollFromTrackClick, thumbGeometry } from '../lib/scrollbar';
import { prefersReducedMotion, scrollBehavior } from '../lib/scrollMotion';

// 가로로 넘치는 카드 목록. 트랙패드 없는 마우스로도 넘길 수 있게
// 카드 아래에 항상 보이는 스크롤바(끌기·트랙 클릭)와 데스크톱 좌우 화살표(보이는 폭만큼 이동)를 둔다.
// 네이티브 스크롤바는 이 목록에서만 숨긴다(터치 스와이프·트랙패드는 그대로 동작).
export default function HorizontalScroll({ children, gapClass = 'gap-5', label = '목록' }) {
  const scrollRef = useRef(null);
  const trackRef = useRef(null);
  const drag = useRef(null);
  const [geo, setGeo] = useState(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const measure = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 1);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
    setGeo(thumbGeometry(el));
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;
    measure();
    el.addEventListener('scroll', measure, { passive: true });
    // 카드 수가 바뀌거나(필터) 창 크기가 바뀌면 다시 잰다
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    if (el.firstElementChild) ro?.observe(el.firstElementChild);
    window.addEventListener('resize', measure);
    return () => {
      el.removeEventListener('scroll', measure);
      ro?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [children, measure]);

  const page = (direction) => {
    const el = scrollRef.current;
    if (!el) return;
    // 움직임 줄이기 설정이면 부드러운 스크롤 없이 바로 이동
    el.scrollBy({ left: direction * Math.max(el.clientWidth * 0.9, 200), behavior: scrollBehavior(prefersReducedMotion()) });
  };

  const onThumbPointerDown = (e) => {
    const el = scrollRef.current;
    const track = trackRef.current;
    if (!el || !track) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drag.current = { startX: e.clientX, startScrollLeft: el.scrollLeft, trackWidth: track.clientWidth };
  };

  const onThumbPointerMove = (e) => {
    const el = scrollRef.current;
    if (!drag.current || !el) return;
    el.scrollLeft = scrollFromThumbDrag({
      startScrollLeft: drag.current.startScrollLeft,
      dx: e.clientX - drag.current.startX,
      trackWidth: drag.current.trackWidth,
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
    });
  };

  const endDrag = () => {
    drag.current = null;
  };

  const onTrackPointerDown = (e) => {
    const el = scrollRef.current;
    const track = trackRef.current;
    if (!el || !track) return;
    const rect = track.getBoundingClientRect();
    // 목록이 길면(웨딩홀 258곳) 부드러운 스크롤이 길게 늘어지므로 누른 곳으로 바로 이동
    el.scrollLeft = scrollFromTrackClick({ x: e.clientX - rect.left, trackWidth: rect.width, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth });
  };

  const onTrackKeyDown = (e) => {
    if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); page(1); }
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); page(-1); }
  };

  const arrowClass =
    'absolute top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white rounded-full shadow-lg border border-warm-beige/30 hidden sm:flex items-center justify-center text-charcoal/60 hover:text-soft-gold hover:border-soft-gold/30 transition-all';

  return (
    <div className="relative">
      <div className="relative">
        {canScrollLeft && (
          <button type="button" onClick={() => page(-1)} aria-label={`${label} 이전으로`} className={`${arrowClass} left-0 -translate-x-3`}>
            ‹
          </button>
        )}

        <div
          ref={scrollRef}
          className={`flex ${gapClass} overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {children}
        </div>

        {canScrollRight && (
          <button type="button" onClick={() => page(1)} aria-label={`${label} 다음으로`} className={`${arrowClass} right-0 translate-x-3`}>
            ›
          </button>
        )}
      </div>

      {/* 항상 보이는 가로 스크롤바 — 끌거나 트랙을 눌러 이동 */}
      {geo && (
        <div
          ref={trackRef}
          role="scrollbar"
          aria-orientation="horizontal"
          aria-label={`${label} 가로 스크롤`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round((geo.left / Math.max(100 - geo.width, 1)) * 100)}
          tabIndex={0}
          onPointerDown={onTrackPointerDown}
          onKeyDown={onTrackKeyDown}
          className="relative mt-3 h-2.5 rounded-full bg-warm-beige/40 cursor-pointer touch-none focus:outline-none focus-visible:ring-2 focus-visible:ring-soft-gold/50"
        >
          <div
            onPointerDown={onThumbPointerDown}
            onPointerMove={onThumbPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            className="absolute inset-y-0 rounded-full bg-soft-gold/70 hover:bg-soft-gold active:bg-soft-gold cursor-grab active:cursor-grabbing transition-colors"
            style={{ left: `${geo.left}%`, width: `${geo.width}%` }}
          />
        </div>
      )}
    </div>
  );
}
