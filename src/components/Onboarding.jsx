import { useState } from 'react';
import { useBudget } from '../context/budgetContextShared';
import { FOOD_PRESETS, RENT_PRESETS } from '../lib/budgetPresets';
import { BudgetInput, ConditionSummary, GuestInput, RangeInput } from './ConditionInputs';

// 단계: 0 인사 → 1 전체 예산 → 2 대관료 범위 → 3 식대 범위 → 4 하객 수 (2026-10-02 형과 합의한 순서)
const STEPS = [
  null,
  { title: '전체 예산을 알려주세요', desc: '웨딩홀 + 스드메 포함 총 예산이에요' },
  { title: '대관료는 어느 정도 생각하세요?', desc: '이 범위 안에 대관료가 모두 들어오는 웨딩홀만 보여 드려요' },
  { title: '1인 식대는 어느 정도 생각하세요?', desc: '이 범위 안에 식대가 모두 들어오는 웨딩홀만 보여 드려요' },
  { title: '예상 하객 수를 알려주세요', desc: '웨딩홀 수용 인원과 식대를 계산할 때 사용돼요' },
];
const LAST = STEPS.length - 1;

export default function Onboarding({ picked }) {
  const ctx = useBudget();
  const { dispatch, reopened } = ctx;
  // 다시 설정할 때는 인사 단계를 건너뛰고 현재 값을 채워 둔다
  const [step, setStep] = useState(reopened ? 1 : 0);
  const [totalBudget, setTotalBudget] = useState(ctx.totalBudget);
  const [rentRange, setRentRange] = useState(ctx.rentRange);
  const [foodRange, setFoodRange] = useState(ctx.foodRange);
  const [guestCount, setGuestCount] = useState(ctx.guestCount);

  const handleComplete = () => {
    dispatch({ type: 'COMPLETE_ONBOARDING', payload: { budget: totalBudget, guestCount, rentRange, foodRange } });
  };

  const nav = (
    <div className="flex gap-3">
      <button onClick={() => setStep(step - 1)} className="flex-1 py-4 border-2 border-warm-beige rounded-2xl font-semibold text-charcoal/60 hover:bg-warm-beige/20 transition-all">이전</button>
      {step < LAST ? (
        <button onClick={() => setStep(step + 1)} className="flex-1 py-4 bg-soft-gold text-white rounded-2xl font-semibold hover:bg-soft-gold/90 transition-all active:scale-[0.98]">다음</button>
      ) : (
        <button onClick={handleComplete} className="flex-1 py-4 bg-soft-gold text-white rounded-2xl font-semibold hover:bg-soft-gold/90 transition-all active:scale-[0.98]">견적 시작하기 ✨</button>
      )}
    </div>
  );

  // 쿠키 동의 배너(z-50, 화면 아래 고정)보다 위(z-60)에 둔다 — 단계가 늘어 길어진 창의 버튼을 배너가 가리지 않게. 배너는 닫은 뒤 다시 보인다
  return (
    <div className="fixed inset-0 bg-charcoal/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[calc(100dvh-2rem)] overflow-y-auto">
        {reopened && (
          <button
            type="button"
            onClick={() => dispatch({ type: 'CANCEL_ONBOARDING' })}
            className="absolute top-4 right-4 w-8 h-8 rounded-full text-charcoal/40 hover:text-charcoal hover:bg-warm-beige/30 transition-all"
            aria-label="닫기 (이전 설정 유지)"
            title="닫기 (이전 설정 유지)"
          >
            ✕
          </button>
        )}
        {/* Progress */}
        <div className="flex gap-1 p-6 pb-0">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-500 ${i <= step ? 'bg-soft-gold' : 'bg-warm-beige'}`} />
          ))}
        </div>

        <div className="p-6 sm:p-8">
          {step === 0 ? (
            <div className="text-center space-y-6 animate-fade-in">
              <div className="text-5xl">💍</div>
              <h2 className="text-2xl font-bold text-charcoal">웨딩챌린저에 오신 것을 환영합니다</h2>
              <p className="text-charcoal/60">예산에 맞는 완벽한 웨딩을 함께 설계해요.<br/>몇 가지만 알려주시면 맞춤 견적을 준비해 드릴게요.</p>
              {picked && (
                <p className="text-sm text-soft-gold bg-soft-gold/10 rounded-xl px-4 py-2.5">
                  「<span className="font-semibold">{picked}</span>」 견적을 바로 이어서 볼 수 있게 준비해 둘게요
                </p>
              )}
              <button
                onClick={() => setStep(1)}
                className="w-full py-4 bg-soft-gold text-white rounded-2xl font-semibold text-lg hover:bg-soft-gold/90 transition-all active:scale-[0.98]"
              >
                시작하기
              </button>
            </div>
          ) : (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-xl font-bold text-charcoal">{STEPS[step].title}</h2>
                <p className="text-charcoal/50 text-sm mt-1">{STEPS[step].desc}</p>
              </div>
              {step === 1 && <BudgetInput value={totalBudget} onChange={setTotalBudget} />}
              {step === 2 && <RangeInput presets={RENT_PRESETS} value={rentRange} onChange={setRentRange} unitExample={['3000000', '7000000']} />}
              {step === 3 && <RangeInput presets={FOOD_PRESETS} value={foodRange} onChange={setFoodRange} unitExample={['50000', '70000']} />}
              {step === 4 && (
                <>
                  <GuestInput value={guestCount} onChange={setGuestCount} />
                  <ConditionSummary totalBudget={totalBudget} rentRange={rentRange} foodRange={foodRange} guestCount={guestCount} />
                </>
              )}
              {nav}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
