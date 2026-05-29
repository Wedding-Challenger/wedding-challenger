import { useBudget } from '../context/BudgetContext';
import { REGIONS, PCT_KEYS, PCT_LABELS, STUDIO_STATS, DRESS_STATS, MAKEUP_STATS, getRange } from '../data/sdmeStats';

function fmt(n) {
  if (n == null) return '-';
  if (n >= 10000000) return (n / 10000000).toFixed(1) + '천만';
  if (n >= 10000) return Math.round(n / 10000) + '만';
  return new Intl.NumberFormat('ko-KR').format(n);
}

const CATEGORIES = [
  { key: 'studio', label: '스튜디오', icon: '📸', stats: STUDIO_STATS, dispatchSet: 'SET_STUDIO_SEL', dispatchClear: 'CLEAR_STUDIO_SEL' },
  { key: 'dress',  label: '드레스',   icon: '👗', stats: DRESS_STATS,  dispatchSet: 'SET_DRESS_SEL',  dispatchClear: 'CLEAR_DRESS_SEL'  },
  { key: 'makeup', label: '메이크업', icon: '💄', stats: MAKEUP_STATS, dispatchSet: 'SET_MAKEUP_SEL', dispatchClear: 'CLEAR_MAKEUP_SEL' },
];

function RangeRow({ cat, sel, dispatch }) {
  const { stats, label, icon, dispatchSet } = cat;
  const region = sel?.region ?? '전국';
  const pct    = sel?.pct   ?? null;
  const row    = stats[region] ?? stats['전국'];
  const range  = getRange(stats, region);

  const handleRegion = (e) => {
    dispatch({ type: dispatchSet, payload: { region: e.target.value, pct: pct ?? 'mid' } });
  };

  const handlePct = (key) => {
    if (row[key] == null) return; // no data
    if (pct === key) {
      dispatch({ type: cat.dispatchClear });
    } else {
      dispatch({ type: dispatchSet, payload: { region, pct: key } });
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-warm-beige/40 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="font-bold text-charcoal flex items-center gap-2 text-sm">
          <span>{icon}</span>{label}
        </span>
        <select
          value={region}
          onChange={handleRegion}
          className="text-xs border border-warm-beige/50 rounded-lg px-2 py-1 text-charcoal/70 focus:outline-none focus:border-soft-gold bg-white"
        >
          {REGIONS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      {/* Percentile buttons */}
      <div className="flex gap-1.5 flex-wrap">
        {PCT_KEYS.map((key) => {
          const val = row[key];
          const isSelected = pct === key;
          const noData = val == null;
          return (
            <button
              key={key}
              onClick={() => handlePct(key)}
              disabled={noData}
              className={`flex-1 min-w-0 py-2 px-1 rounded-xl border-2 text-center transition-all text-xs font-medium
                ${noData ? 'border-transparent bg-warm-beige/10 text-charcoal/20 cursor-not-allowed' :
                  isSelected ? 'border-soft-gold bg-soft-gold/10 text-soft-gold' :
                  'border-warm-beige/40 bg-warm-beige/10 text-charcoal/50 hover:border-soft-gold/40 hover:text-charcoal'}`}
            >
              <div className="text-[10px] leading-tight">{PCT_LABELS[key]}</div>
              <div className="font-bold mt-0.5 leading-tight">{noData ? '-' : fmt(val)}</div>
            </button>
          );
        })}
      </div>

      {/* Range info */}
      <div className="flex items-center gap-2 text-[11px] text-charcoal/40">
        <span>범위</span>
        <span className="text-soft-gold font-semibold">{fmt(range.min)}원</span>
        <div className="flex-1 h-0.5 bg-gradient-to-r from-soft-gold/40 to-deep-rose/30 rounded" />
        <span className="text-deep-rose/60 font-semibold">{fmt(range.max)}원</span>
        {pct && (
          <span className="ml-1 bg-soft-gold/10 text-soft-gold px-2 py-0.5 rounded-full font-bold">
            선택 {fmt(row[pct])}원
          </span>
        )}
      </div>
    </div>
  );
}

export default function SdmeRangePicker() {
  const { studioSel, dressSel, makeupSel, dispatch } = useBudget();
  const sels = { studio: studioSel, dress: dressSel, makeup: makeupSel };

  const totalMin = CATEGORIES.reduce((sum, cat) => sum + getRange(cat.stats, sels[cat.key]?.region ?? '전국').min, 0);
  const totalMax = CATEGORIES.reduce((sum, cat) => sum + getRange(cat.stats, sels[cat.key]?.region ?? '전국').max, 0);
  const totalSel = CATEGORIES.reduce((sum, cat) => {
    const sel = sels[cat.key];
    if (!sel?.pct) return sum;
    return sum + (cat.stats[sel.region ?? '전국']?.[sel.pct] ?? 0);
  }, 0);
  const hasAnySel = CATEGORIES.some((cat) => sels[cat.key]?.pct != null);

  return (
    <div className="space-y-3">
      {CATEGORIES.map((cat) => (
        <RangeRow key={cat.key} cat={cat} sel={sels[cat.key]} dispatch={dispatch} />
      ))}

      {/* Summary */}
      <div className="bg-soft-gold/5 border border-soft-gold/20 rounded-2xl p-4 space-y-2">
        <div className="flex items-center justify-between text-xs text-charcoal/50">
          <span className="font-semibold">스드메 합산 범위</span>
          {hasAnySel && (
            <span className="text-soft-gold font-bold">선택 기준 {fmt(totalSel)}원</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-soft-gold font-bold text-sm">{fmt(totalMin)}원</span>
          <div className="flex-1 h-1.5 bg-gradient-to-r from-soft-gold/30 to-deep-rose/30 rounded-full" />
          <span className="text-deep-rose/70 font-bold text-sm">{fmt(totalMax)}원</span>
        </div>
        <p className="text-[10px] text-charcoal/30 text-center">
          각 항목 하위10% 합산 ~ 상위10% 합산 기준
        </p>
      </div>
    </div>
  );
}
