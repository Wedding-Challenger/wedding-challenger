import { useState } from 'react';
import { useBudget } from '../context/BudgetContext';

function formatWon(n) {
  if (n >= 100000000) return (n / 100000000).toFixed(1) + '억';
  if (n >= 10000) return (n / 10000).toFixed(0) + '만';
  return new Intl.NumberFormat('ko-KR').format(n);
}

function formatFullWon(n) {
  return new Intl.NumberFormat('ko-KR').format(n) + '원';
}

export default function BudgetBasket() {
  const {
    totalBudget, guestCount,
    selectedHall, selectedStudio, selectedDress, selectedMakeup, selectedSnap, selectedRing, selectedBouquet, selectedHanbok,
    includeStudio, includeDress, includeMakeup, includeSnap, includeRing, includeBouquet, includeHanbok,
    getHallCost, getStudioCost, getDressCost, getMakeupCost, getSnapCost, getRingCost, getBouquetCost, getHanbokCost,
    getTotalCost, getRemainingBudget, getBudgetPercent, isOverBudget,
  } = useBudget();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const percent = getBudgetPercent();
  const overBudget = isOverBudget();
  const remaining = getRemainingBudget();

  const items = [
    selectedHall && { label: `🏛 ${selectedHall.name}`, detail: `${guestCount}명 × ${formatWon(selectedHall.pricePerPerson)}원`, cost: getHallCost() },
    includeStudio && selectedStudio && { label: `📸 ${selectedStudio.name}`, cost: getStudioCost() },
    includeDress && selectedDress && { label: `👗 ${selectedDress.name}`, cost: getDressCost() },
    includeMakeup && selectedMakeup && { label: `💄 ${selectedMakeup.name}`, cost: getMakeupCost() },
    includeSnap && selectedSnap && { label: `📷 ${selectedSnap.name}`, cost: getSnapCost() },
    includeRing && selectedRing && { label: `💍 ${selectedRing.name}`, cost: getRingCost() },
    includeBouquet && selectedBouquet && { label: `💐 ${selectedBouquet.name}`, cost: getBouquetCost() },
    includeHanbok && selectedHanbok && { label: `👘 ${selectedHanbok.name}`, cost: getHanbokCost() },
  ].filter(Boolean);

  const getBarColor = () => {
    if (overBudget) return 'bg-red-400';
    if (percent > 80) return 'bg-amber-400';
    return 'bg-soft-gold';
  };

  return (
    <div className="sticky top-6">
      <div className={`bg-white rounded-3xl shadow-lg border-2 transition-all duration-500 ${overBudget ? 'border-red-300 shadow-red-100' : 'border-warm-beige/30'}`}>
        {/* Header */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full p-5 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🧺</span>
            <div className="text-left">
              <h3 className="font-bold text-charcoal">견적 바구니</h3>
              <p className="text-xs text-charcoal/40">예산 {formatWon(totalBudget)}원</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {overBudget && (
              <span className="bg-red-50 text-red-500 text-xs font-bold px-3 py-1 rounded-full animate-pulse">
                초과!
              </span>
            )}
            <span className={`text-xl transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`}>⌃</span>
          </div>
        </button>

        {!isCollapsed && (
          <div className="px-5 pb-5 space-y-4">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-charcoal/50">사용 {formatWon(getTotalCost())}원</span>
                <span className={`font-bold ${overBudget ? 'text-red-500' : 'text-soft-gold'}`}>{percent.toFixed(0)}%</span>
              </div>
              <div className="h-3 bg-warm-beige/30 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out ${getBarColor()}`}
                  style={{ width: `${Math.min(percent, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-charcoal/40">
                <span>0</span>
                <span>{formatWon(totalBudget)}원</span>
              </div>
            </div>

            {/* Selected Items */}
            {items.length > 0 ? (
              <div className="space-y-2">
                {items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-cream rounded-xl">
                    <div>
                      <p className="text-sm font-semibold text-charcoal">{item.label}</p>
                      {item.detail && <p className="text-[11px] text-charcoal/40">{item.detail}</p>}
                    </div>
                    <p className="text-sm font-bold text-charcoal">{formatFullWon(item.cost)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-charcoal/30">
                <p className="text-3xl mb-2">🛒</p>
                <p className="text-sm">아직 선택된 항목이 없어요</p>
              </div>
            )}

            {/* Divider + Total */}
            <div className="border-t-2 border-dashed border-warm-beige/50 pt-4 space-y-3">
              <div className="flex justify-between">
                <span className="font-semibold text-charcoal">총 견적</span>
                <span className={`text-xl font-bold ${overBudget ? 'text-red-500' : 'text-charcoal'}`}>{formatFullWon(getTotalCost())}</span>
              </div>
              <div className={`flex justify-between p-3 rounded-xl ${overBudget ? 'bg-red-50' : 'bg-sage/10'}`}>
                <span className="text-sm text-charcoal/60">{overBudget ? '초과 금액' : '잔여 예산'}</span>
                <span className={`text-sm font-bold ${overBudget ? 'text-red-500' : 'text-sage'}`}>
                  {overBudget ? '+' : ''}{formatFullWon(Math.abs(remaining))}
                </span>
              </div>
            </div>

            {/* Not selected categories */}
            {(!includeStudio || !includeDress || !includeMakeup || !includeSnap || !includeRing || !includeBouquet || !includeHanbok) && (
              <div className="text-xs text-charcoal/30 space-y-1">
                {!includeStudio && <p>📸 스튜디오 — 제외됨</p>}
                {!includeDress && <p>👗 드레스 — 제외됨</p>}
                {!includeMakeup && <p>💄 메이크업 — 제외됨</p>}
                {!includeSnap && <p>📷 스냅 — 제외됨</p>}
                {!includeRing && <p>💍 반지 — 제외됨</p>}
                {!includeBouquet && <p>💐 부케 — 제외됨</p>}
                {!includeHanbok && <p>👘 혼주한복 — 제외됨</p>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
