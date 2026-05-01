import { useRef, useState, useEffect } from 'react';

export default function HorizontalScroll({ children }) {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);
    return () => {
      if (el) el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [children]);

  const scroll = (direction) => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.firstElementChild?.offsetWidth || 300;
    el.scrollBy({ left: direction * (cardWidth + 20), behavior: 'smooth' });
  };

  return (
    <div className="relative group">
      {/* Left Arrow */}
      {canScrollLeft && (
        <button
          onClick={() => scroll(-1)}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10 w-10 h-10 bg-white rounded-full shadow-lg border border-warm-beige/30 flex items-center justify-center text-charcoal/60 hover:text-soft-gold hover:border-soft-gold/30 transition-all opacity-0 group-hover:opacity-100"
        >
          ‹
        </button>
      )}

      {/* Scrollable Area */}
      <div
        ref={scrollRef}
        className="flex gap-5 overflow-x-auto scroll-smooth pb-2"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        <style>{`div::-webkit-scrollbar { display: none; }`}</style>
        {children}
      </div>

      {/* Right Arrow */}
      {canScrollRight && (
        <button
          onClick={() => scroll(1)}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10 w-10 h-10 bg-white rounded-full shadow-lg border border-warm-beige/30 flex items-center justify-center text-charcoal/60 hover:text-soft-gold hover:border-soft-gold/30 transition-all opacity-0 group-hover:opacity-100"
        >
          ›
        </button>
      )}

      {/* Scroll Indicator Dots */}
      {canScrollRight && (
        <div className="flex justify-center mt-3 gap-1">
          <span className="text-xs text-charcoal/30">← 스크롤하여 더 보기 →</span>
        </div>
      )}
    </div>
  );
}
