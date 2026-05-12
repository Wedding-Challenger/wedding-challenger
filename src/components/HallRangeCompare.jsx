import { useState, useEffect } from 'react';
import { useBudget } from '../context/BudgetContext';

// 260501 예식장.xlsx 데이터
const EXCEL_HALLS = [
  { id: 1, name: '더파티움여의도',    food: { min: 121000, max: 121000 }, rent: { min: 7150000,  max: 7150000  }, deco: { min: 0,        max: 0        } },
  { id: 2, name: '제이케이아트',      food: { min: 67980,  max: 82400  }, rent: { min: 1000000,  max: 7000000  }, deco: { min: 3000000,  max: 3000000  } },
  { id: 3, name: '플로팅아일랜드',    food: { min: 99000,  max: 132000 }, rent: { min: 3300000,  max: 5500000  }, deco: { min: 10450000, max: 11000000 } },
  { id: 4, name: '마리나파크 웨딩홀', food: { min: 88000,  max: 110000 }, rent: { min: 13200000, max: 13200000 }, deco: { min: 0,        max: 0        } },
  { id: 5, name: '소노펠리체 컨벤션', food: { min: 70550,  max: 88000  }, rent: { min: 4500000,  max: 9000000  }, deco: { min: 0,        max: 0        } },
];

function fmt(n) {
  if (n == null || n === 0) return null;
  if (n >= 100000000) return (n / 100000000).toFixed(1) + '억';
  if (n >= 10000) return Math.round(n / 10000) + '만';
  return new Intl.NumberFormat('ko-KR').format(n);
}

function fmtRange(min, max) {
  if (min === max) return fmt(min) + '원';
  return fmt(min) + ' ~ ' + fmt(max) + '원';
}

function calcRange(hall, guests) {
  return {
    min: hall.food.min * guests + hall.rent.min + hall.deco.min,
    max: hall.food.max * guests + hall.rent.max + hall.deco.max,
    food: { min: hall.food.min * guests, max: hall.food.max * guests },
    rent: hall.rent,
    deco: hall.deco,
  };
}

export default function HallRangeCompare() {
  const { guestCount } = useBudget();
  const halls = EXCEL_HALLS;
  const [selected, setSelected] = useState(new Set(halls.map((h) => h.id)));
  const [guests, setGuests] = useState(guestCount);

  useEffect(() => {
    setGuests(guestCount);
  }, [guestCount]);

  const toggle = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleAll = () => {
    if (selected.size === halls.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(halls.map((h) => h.id)));
    }
  };

  const ranges = halls.map((h) => ({ hall: h, range: calcRange(h, guests) }));
  const selectedRanges = ranges.filter((r) => selected.has(r.hall.id));
  const globalMax = Math.max(...ranges.map((r) => r.range.max), 1);

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm text-charcoal/60">하객 수</span>
          <input
            type="number"
            value={guests}
            min={1}
            onChange={(e) => setGuests(Math.max(1, Number(e.target.value)))}
            className="w-20 px-3 py-1.5 border border-warm-beige/50 rounded-xl text-sm text-charcoal text-center focus:outline-none focus:border-soft-gold"
          />
          <span className="text-sm text-charcoal/40">명</span>
        </div>
        <button
          onClick={toggleAll}
          className="text-xs px-3 py-1.5 rounded-lg border border-warm-beige/50 text-charcoal/40 hover:text-soft-gold hover:border-soft-gold/40 transition-all"
        >
          {selected.size === halls.length ? '전체 해제' : '전체 선택'}
        </button>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-charcoal/40">
        <div className="flex items-center gap-1.5">
          <div className="w-8 h-2 bg-soft-gold/30 rounded-full" />
          <span>최소~최대 범위</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 bg-soft-gold rounded-full" />
          <span>최소</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 bg-deep-rose/60 rounded-full" />
          <span>최대</span>
        </div>
      </div>

      {/* Rows */}
      <div className="space-y-3">
        {ranges.map(({ hall, range }) => {
          const isSelected = selected.has(hall.id);
          const minPct = (range.min / globalMax) * 100;
          const maxPct = (range.max / globalMax) * 100;
          const hasRange = range.min !== range.max;

          return (
            <div
              key={hall.id}
              onClick={() => toggle(hall.id)}
              className={`p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${
                isSelected
                  ? 'border-soft-gold/40 bg-white shadow-sm'
                  : 'border-transparent bg-warm-beige/10 opacity-40'
              }`}
            >
              {/* Top row */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggle(hall.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-4 h-4 accent-amber-500 shrink-0"
                />
                <span className="font-semibold text-charcoal text-sm w-36 shrink-0 truncate">
                  {hall.name}
                </span>

                {/* Range bar */}
                <div className="flex-1 relative h-5 bg-warm-beige/30 rounded-full overflow-visible">
                  {isSelected && (
                    <>
                      {/* Range fill */}
                      <div
                        className="absolute top-0 h-full bg-soft-gold/25 rounded-full"
                        style={{ left: `${minPct}%`, width: `${Math.max(maxPct - minPct, 1)}%` }}
                      />
                      {/* Min dot */}
                      <div
                        className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-soft-gold rounded-full shadow border-2 border-white z-10"
                        style={{ left: `calc(${minPct}% - 6px)` }}
                      />
                      {/* Max dot */}
                      {hasRange && (
                        <div
                          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-deep-rose/70 rounded-full shadow border-2 border-white z-10"
                          style={{ left: `calc(${maxPct}% - 6px)` }}
                        />
                      )}
                    </>
                  )}
                </div>

                {/* Amount */}
                <div className="text-right text-xs font-semibold text-charcoal w-36 shrink-0">
                  {hasRange ? (
                    <>
                      <span className="text-soft-gold">{fmt(range.min)}</span>
                      <span className="text-charcoal/30"> ~ </span>
                      <span className="text-deep-rose/70">{fmt(range.max)}</span>
                      <span className="text-charcoal/50">원</span>
                    </>
                  ) : (
                    <span>{fmt(range.min)}원</span>
                  )}
                </div>
              </div>

              {/* Breakdown row */}
              {isSelected && (
                <div className="mt-2.5 ml-7 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-charcoal/40">
                  <span>
                    🍽 식대 {fmtRange(range.food.min, range.food.max)}
                  </span>
                  {range.rent.max > 0 && (
                    <span>
                      🏛 대관료 {fmtRange(range.rent.min, range.rent.max)}
                    </span>
                  )}
                  {range.deco.max > 0 && (
                    <span>
                      🌸 데코 {fmtRange(range.deco.min, range.deco.max)}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary bar: selected halls min/max */}
      {selectedRanges.length > 0 && (
        <div className="bg-soft-gold/5 border border-soft-gold/20 rounded-2xl p-4 space-y-2">
          <p className="text-xs font-semibold text-charcoal/50">선택된 {selectedRanges.length}개 홀 전체 범위</p>
          <div className="flex items-center gap-3">
            <span className="text-soft-gold font-bold text-sm">
              {fmt(Math.min(...selectedRanges.map((r) => r.range.min)))}원
            </span>
            <div className="flex-1 h-1.5 bg-warm-beige/40 rounded-full">
              <div className="h-full bg-gradient-to-r from-soft-gold to-deep-rose/60 rounded-full" />
            </div>
            <span className="text-deep-rose/70 font-bold text-sm">
              {fmt(Math.max(...selectedRanges.map((r) => r.range.max)))}원
            </span>
          </div>
          <p className="text-[11px] text-charcoal/30 text-center">
            하객 {guests}명 기준 · 식대 + 대관료 + 데코 합산
          </p>
        </div>
      )}
    </div>
  );
}
