import { useState } from 'react';
import { useBudget } from '../context/BudgetContext';

const BUDGET_OPTIONS = [
  { label: '3,000만원 이하', value: 30000000 },
  { label: '3,000~5,000만원', value: 50000000 },
  { label: '5,000~7,000만원', value: 70000000 },
  { label: '7,000만원~1억', value: 100000000 },
  { label: '1억 이상', value: 150000000 },
];

const GUEST_OPTIONS = [
  { label: '100명 이하', value: 100, icon: '👥' },
  { label: '100~200명', value: 200, icon: '👥' },
  { label: '200~300명', value: 300, icon: '👥' },
  { label: '300명 이상', value: 400, icon: '👥' },
];

export default function Onboarding() {
  const { dispatch } = useBudget();
  const [step, setStep] = useState(0);
  const [budget, setBudget] = useState(50000000);
  const [guestCount, setGuestCount] = useState(200);
  const [customBudget, setCustomBudget] = useState('');

  const handleComplete = () => {
    const finalBudget = customBudget ? parseInt(customBudget) : budget;
    dispatch({ type: 'COMPLETE_ONBOARDING', payload: { budget: finalBudget, guestCount } });
  };

  const formatPrice = (n) => new Intl.NumberFormat('ko-KR').format(n);

  return (
    <div className="fixed inset-0 bg-charcoal/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Progress */}
        <div className="flex gap-1 p-6 pb-0">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-500 ${i <= step ? 'bg-soft-gold' : 'bg-warm-beige'}`} />
          ))}
        </div>

        <div className="p-8">
          {/* Step 0: Welcome */}
          {step === 0 && (
            <div className="text-center space-y-6 animate-fade-in">
              <div className="text-5xl">💍</div>
              <h2 className="text-2xl font-bold text-charcoal">웨딩첼린저에 오신 것을 환영합니다</h2>
              <p className="text-charcoal/60">예산에 맞는 완벽한 웨딩을 함께 설계해요.<br/>몇 가지만 알려주시면 맞춤 견적을 준비해 드릴게요.</p>
              <button
                onClick={() => setStep(1)}
                className="w-full py-4 bg-soft-gold text-white rounded-2xl font-semibold text-lg hover:bg-soft-gold/90 transition-all active:scale-[0.98]"
              >
                시작하기
              </button>
            </div>
          )}

          {/* Step 1: Budget */}
          {step === 1 && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-xl font-bold text-charcoal">전체 예산을 알려주세요</h2>
                <p className="text-charcoal/50 text-sm mt-1">웨딩홀 + 스드메 포함 총 예산이에요</p>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {BUDGET_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { setBudget(opt.value); setCustomBudget(''); }}
                    className={`p-4 rounded-2xl border-2 text-left transition-all ${
                      budget === opt.value && !customBudget
                        ? 'border-soft-gold bg-soft-gold/10 text-soft-gold font-semibold'
                        : 'border-warm-beige/50 hover:border-soft-gold/30'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div>
                <label className="text-sm text-charcoal/50 mb-1 block">직접 입력</label>
                <input
                  type="text"
                  placeholder="예: 45000000"
                  value={customBudget}
                  onChange={(e) => setCustomBudget(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full p-4 border-2 border-warm-beige/50 rounded-2xl focus:outline-none focus:border-soft-gold transition-colors"
                />
                {customBudget && (
                  <p className="text-sm text-soft-gold mt-1">{formatPrice(parseInt(customBudget || 0))}원</p>
                )}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(0)} className="flex-1 py-4 border-2 border-warm-beige rounded-2xl font-semibold text-charcoal/60 hover:bg-warm-beige/20 transition-all">이전</button>
                <button onClick={() => setStep(2)} className="flex-1 py-4 bg-soft-gold text-white rounded-2xl font-semibold hover:bg-soft-gold/90 transition-all active:scale-[0.98]">다음</button>
              </div>
            </div>
          )}

          {/* Step 2: Guest Count */}
          {step === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-xl font-bold text-charcoal">예상 하객 수를 알려주세요</h2>
                <p className="text-charcoal/50 text-sm mt-1">웨딩홀 수용 인원과 식대를 계산할 때 사용돼요</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {GUEST_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setGuestCount(opt.value)}
                    className={`p-5 rounded-2xl border-2 text-center transition-all ${
                      guestCount === opt.value
                        ? 'border-soft-gold bg-soft-gold/10'
                        : 'border-warm-beige/50 hover:border-soft-gold/30'
                    }`}
                  >
                    <div className="text-2xl mb-1">{opt.icon}</div>
                    <div className={`font-semibold ${guestCount === opt.value ? 'text-soft-gold' : 'text-charcoal'}`}>{opt.label}</div>
                  </button>
                ))}
              </div>
              <div className="bg-cream rounded-2xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-charcoal/60">설정 예산</span>
                  <span className="font-bold text-charcoal">{formatPrice(customBudget ? parseInt(customBudget) : budget)}원</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-charcoal/60">예상 하객</span>
                  <span className="font-bold text-charcoal">{guestCount}명</span>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 py-4 border-2 border-warm-beige rounded-2xl font-semibold text-charcoal/60 hover:bg-warm-beige/20 transition-all">이전</button>
                <button onClick={handleComplete} className="flex-1 py-4 bg-soft-gold text-white rounded-2xl font-semibold hover:bg-soft-gold/90 transition-all active:scale-[0.98]">견적 시작하기 ✨</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
