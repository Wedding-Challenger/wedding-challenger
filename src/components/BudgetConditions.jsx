import { useBudget } from '../context/budgetContextShared';
import { FOOD_PRESETS, RENT_PRESETS, filterSummary, formatMan } from '../lib/budgetPresets';
import { BudgetInput, GuestInput, RangeInput } from './ConditionInputs';

// 계산기 웨딩홀 칩 줄 맨 앞의 '조건' 칩
export function ConditionChip({ open, onToggle }) {
  const { foodRange, rentRange, getHallBudget } = useBudget();
  const active = !!(foodRange || rentRange);
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all ${
        active || open ? 'border-soft-gold text-soft-gold bg-soft-gold/10' : 'border-warm-beige/60 text-charcoal/60 bg-white hover:border-soft-gold/40'
      }`}
    >
      {filterSummary({ foodRange, rentRange, hallBudget: getHallBudget() })}
    </button>
  );
}

// 칩을 누르면 펼쳐지는 조건 수정 패널. 바꾸는 즉시 반영·저장 (온보딩을 다시 거치지 않음)
export function ConditionPanel({ onClose }) {
  const { totalBudget, guestCount, rentRange, foodRange, getNonHallCostMin, getHallBudget, dispatch } = useBudget();
  const set = (payload) => dispatch({ type: 'SET_CONDITIONS', payload });
  const nonHall = getNonHallCostMin();
  const hallBudget = getHallBudget();

  const section = (title, hint, children) => (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-charcoal">
        {title} {hint && <span className="text-xs font-normal text-charcoal/40">{hint}</span>}
      </p>
      {children}
    </div>
  );

  return (
    <div className="mb-5 p-4 sm:p-5 bg-white border-2 border-soft-gold/30 rounded-2xl space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold text-charcoal">웨딩홀 조건</p>
          <p className="text-xs text-charcoal/50 mt-0.5">
            식대·대관료는 웨딩홀 가격 범위가 설정 범위 안에 모두 들어올 때만 보여요
          </p>
        </div>
        <button type="button" onClick={onClose} className="shrink-0 text-xs px-3 py-1.5 rounded-lg border border-warm-beige/50 text-charcoal/50 hover:text-charcoal">
          닫기
        </button>
      </div>

      {section('전체 예산', null, <BudgetInput compact value={totalBudget} onChange={(v) => set({ totalBudget: v })} />)}
      {section('대관료', null, <RangeInput compact presets={RENT_PRESETS} value={rentRange} onChange={(v) => set({ rentRange: v })} unitExample={['3000000', '7000000']} />)}
      {section('식대', '(1인)', <RangeInput compact presets={FOOD_PRESETS} value={foodRange} onChange={(v) => set({ foodRange: v })} unitExample={['50000', '70000']} />)}
      {section('하객 수', null, <GuestInput compact value={guestCount} onChange={(v) => set({ guestCount: v })} />)}

      <div className="bg-cream rounded-xl px-4 py-3 text-xs text-charcoal/60 space-y-1">
        <div className="flex justify-between"><span>전체 예산</span><span>{formatMan(totalBudget)}</span></div>
        <div className="flex justify-between"><span>− 담은 스드메·스냅 등 (최소)</span><span>{formatMan(nonHall) || '0원'}</span></div>
        <div className="flex justify-between font-semibold text-charcoal">
          <span>= 웨딩홀에 쓸 수 있는 예산</span>
          <span className={hallBudget > 0 ? '' : 'text-red-500'}>{hallBudget > 0 ? formatMan(hallBudget) : '없음'}</span>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => dispatch({ type: 'RESET_RANGES' })}
          disabled={!rentRange && !foodRange}
          className="text-xs px-3 py-1.5 rounded-lg border border-warm-beige/50 text-charcoal/50 hover:text-deep-rose disabled:opacity-40"
        >
          식대·대관료 조건 초기화
        </button>
      </div>
    </div>
  );
}

// 결과가 없을 때: 어떤 조건 때문에 몇 곳이 빠졌는지
export function NoHallResults({ excludedBy, budgetPassedCount, hallBudget, onEdit }) {
  const { dispatch, foodRange, rentRange } = useBudget();
  // 돈 조건은 통과했는데 지역·검색에서 걸린 경우
  if (budgetPassedCount > 0) {
    return <p className="text-sm text-charcoal/40 text-center py-8">지역·검색에 맞는 웨딩홀이 없어요</p>;
  }
  const reasons = [
    excludedBy.food > 0 && `식대 조건으로 ${excludedBy.food}곳`,
    excludedBy.rent > 0 && `대관료 조건으로 ${excludedBy.rent}곳`,
    excludedBy.total > 0 && `남은 예산 초과로 ${excludedBy.total}곳`,
  ].filter(Boolean);
  return (
    <div className="text-center py-8 space-y-3">
      <p className="text-sm font-semibold text-charcoal/70">조건에 맞는 웨딩홀이 없어요</p>
      {hallBudget <= 0 && <p className="text-xs text-red-500">담은 스드메·스냅 등이 예산을 모두 쓰고 있어요</p>}
      {reasons.length > 0 && <p className="text-xs text-charcoal/50">{reasons.join(' · ')} 제외됐어요</p>}
      <div className="flex justify-center gap-2">
        {(foodRange || rentRange) && (
          <button type="button" onClick={() => dispatch({ type: 'RESET_RANGES' })} className="text-xs px-3 py-1.5 rounded-lg bg-soft-gold text-white">
            식대·대관료 조건 초기화
          </button>
        )}
        <button type="button" onClick={onEdit} className="text-xs px-3 py-1.5 rounded-lg border border-warm-beige/50 text-charcoal/60">
          조건 수정
        </button>
      </div>
    </div>
  );
}
