import { areaCounts } from '../lib/halls';

// 지역 칩 + 검색. area=null 이 전체
export default function HallFilter({ halls, area, onAreaChange, query, onQueryChange, resultCount }) {
  const areas = areaCounts(halls);
  const chip = (active) =>
    `shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
      active ? 'bg-soft-gold text-white border-soft-gold' : 'bg-white text-charcoal/60 border-warm-beige/50 hover:border-soft-gold/40'
    }`;

  return (
    <div className="space-y-3 mb-5">
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
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
        <div className="flex items-center gap-3">
          <input
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="웨딩홀 이름·지역 검색"
            className="flex-1 max-w-sm px-4 py-2 border border-warm-beige/50 rounded-xl text-sm text-charcoal focus:outline-none focus:border-soft-gold"
          />
          <span className="text-xs text-charcoal/40">{resultCount}곳</span>
        </div>
      )}
    </div>
  );
}
