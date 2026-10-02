import { areaCounts } from '../lib/halls';

// 지역 칩 + 검색. area=null 이 전체. leading 은 칩 줄 맨 앞(계산기의 '조건' 칩), total 이 있으면 'N곳 / 전체 T곳'
export default function HallFilter({ halls, area, onAreaChange, query, onQueryChange, resultCount, leading, total }) {
  const areas = areaCounts(halls);
  const chip = (active) =>
    `shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
      active ? 'bg-soft-gold text-white border-soft-gold' : 'bg-white text-charcoal/60 border-warm-beige/50 hover:border-soft-gold/40'
    }`;

  return (
    <div className="space-y-3 mb-5">
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {leading}
        <button type="button" onClick={() => onAreaChange(null)} className={chip(area === null)}>
          전체 {halls.length}
        </button>
        {areas.map(({ area: a, count }) => (
          <button key={a} type="button" onClick={() => onAreaChange(a)} className={chip(area === a)}>
            {a} {count}
          </button>
        ))}
      </div>
      {onQueryChange && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <input
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="웨딩홀 이름·지역 검색"
            className="flex-1 min-w-[12rem] max-w-sm px-4 py-2 border border-warm-beige/50 rounded-xl text-sm text-charcoal focus:outline-none focus:border-soft-gold"
          />
          <span className="text-xs text-charcoal/40 shrink-0">
            {total != null && total !== resultCount ? `조건에 맞는 ${resultCount}곳 / 전체 ${total}곳` : `${resultCount}곳`}
          </span>
        </div>
      )}
    </div>
  );
}
