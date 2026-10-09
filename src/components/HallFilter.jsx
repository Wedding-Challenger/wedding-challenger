import { areaCounts, districtCounts } from '../lib/halls';

// 지역 칩 + 검색. area=null 이 전체. leading 은 칩 줄 맨 앞(계산기의 '조건' 칩), total 이 있으면 'N곳 / 전체 T곳'
// 시·도를 고르면 바로 아래 시·군·구 칩 줄(district=null 이 그 시·도 전체). 시·군·구가 하나뿐이면 줄을 그리지 않는다
export default function HallFilter({
  halls, area, onAreaChange, district = null, onDistrictChange, query, onQueryChange, resultCount, leading, total,
}) {
  const areas = areaCounts(halls);
  const districts = area && onDistrictChange ? districtCounts(halls, area) : [];
  const areaTotal = areas.find((a) => a.area === area)?.count ?? 0;
  const chip = (active) =>
    `shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
      active ? 'bg-soft-gold text-white border-soft-gold' : 'bg-white text-charcoal/60 border-warm-beige/50 hover:border-soft-gold/40'
    }`;
  // 옅은 배경 위 작은 글자라 글자색은 대비 4.5:1 이상(deep-gold 5.2:1, charcoal/70 5.2:1)
  const subChip = (active) =>
    `shrink-0 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
      active ? 'bg-soft-gold/10 text-deep-gold border-soft-gold/50' : 'bg-white/70 text-charcoal/70 border-warm-beige/40 hover:border-soft-gold/30'
    }`;
  // 시·도를 바꾸거나 전체로 가면 시·군·구는 처음부터
  const pickArea = (a) => {
    onAreaChange(a);
    onDistrictChange?.(null);
  };

  return (
    <div className="space-y-3 mb-5">
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {leading}
        <button type="button" onClick={() => pickArea(null)} aria-pressed={area === null} className={chip(area === null)}>
          전체 {halls.length}
        </button>
        {areas.map(({ area: a, count }) => (
          <button key={a} type="button" onClick={() => pickArea(a)} aria-pressed={area === a} className={chip(area === a)}>
            {a} {count}
          </button>
        ))}
      </div>
      {districts.length > 1 && (
        <div
          role="group"
          aria-label={`${area} 시·군·구`}
          className="flex gap-1.5 overflow-x-auto pb-1 -mt-1"
          style={{ scrollbarWidth: 'none' }}
        >
          <button type="button" onClick={() => onDistrictChange(null)} aria-pressed={district === null} className={subChip(district === null)}>
            {area} 전체 {areaTotal}
          </button>
          {districts.map(({ district: d, count }) => (
            <button key={d} type="button" onClick={() => onDistrictChange(d)} aria-pressed={district === d} className={subChip(district === d)}>
              {d} {count}
            </button>
          ))}
        </div>
      )}
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
