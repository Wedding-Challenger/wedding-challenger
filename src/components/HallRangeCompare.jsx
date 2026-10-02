import { useState, useEffect } from 'react';
import { useBudget } from '../context/BudgetContext';
import { displayName } from '../lib/halls';

// 목록이 길어 처음에는 이만큼만 그리고 '더 보기'로 늘린다
const PAGE = 20;

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
  const { food, rent, deco } = hall.priceBreakdown;
  return {
    min: food.min * guests + rent.min + deco.min,
    max: food.max * guests + rent.max + deco.max,
    food: { min: food.min * guests, max: food.max * guests },
    rent,
    deco,
  };
}

// halls: api/halls.js 가 정규화한 웨딩홀 (priceBreakdown 포함). 상위에서 지역·검색 필터를 적용해 넘긴다
export default function HallRangeCompare({ halls }) {
  const { guestCount } = useBudget();
  // 체크 해제한 홀만 기억 — 필터가 바뀌거나 API 데이터가 늦게 와도 기본은 전체 선택
  const [excluded, setExcluded] = useState(() => new Set());
  const [guests, setGuests] = useState(guestCount);
  const [shown, setShown] = useState(PAGE);

  useEffect(() => {
    setGuests(guestCount);
  }, [guestCount]);

  // 필터 결과가 바뀌면 처음 PAGE 개부터 다시
  useEffect(() => setShown(PAGE), [halls]);

  const isSelected = (id) => !excluded.has(id);
  const toggle = (id) =>
    setExcluded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const allSelected = halls.every((h) => isSelected(h.id));
  const toggleAll = () =>
    setExcluded((prev) => {
      const next = new Set(prev);
      halls.forEach((h) => (allSelected ? next.add(h.id) : next.delete(h.id)));
      return next;
    });

  const ranges = halls.map((h) => ({ hall: h, range: calcRange(h, guests) }));
  const selectedRanges = ranges.filter((r) => isSelected(r.hall.id));
  const globalMax = Math.max(...ranges.map((r) => r.range.max), 1);
  const visible = ranges.slice(0, shown);

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
          {allSelected ? '전체 해제' : '전체 선택'}
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
        {halls.length === 0 && (
          <p className="text-sm text-charcoal/40 text-center py-8">조건에 맞는 웨딩홀이 없어요</p>
        )}
        {visible.map(({ hall, range }) => {
          const selected = isSelected(hall.id);
          const minPct = (range.min / globalMax) * 100;
          const maxPct = (range.max / globalMax) * 100;
          const hasRange = range.min !== range.max;

          return (
            <div
              key={hall.id}
              onClick={() => toggle(hall.id)}
              className={`p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${
                selected
                  ? 'border-soft-gold/40 bg-white shadow-sm'
                  : 'border-transparent bg-warm-beige/10 opacity-40'
              }`}
            >
              {/* Top row */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => toggle(hall.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-4 h-4 accent-amber-500 shrink-0"
                />
                <span className="font-semibold text-charcoal text-sm w-36 shrink-0 truncate" title={hall.name}>
                  {displayName(hall.name)}
                </span>

                {/* Range bar */}
                <div className="flex-1 relative h-5 bg-warm-beige/30 rounded-full overflow-visible">
                  {selected && (
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
              {selected && (
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

      {shown < ranges.length && (
        <button
          type="button"
          onClick={() => setShown((n) => n + PAGE)}
          className="w-full py-2.5 text-sm border-2 border-dashed border-warm-beige/60 rounded-2xl text-charcoal/50 hover:text-soft-gold hover:border-soft-gold/40 transition-all"
        >
          더 보기 ({shown}/{ranges.length})
        </button>
      )}

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
