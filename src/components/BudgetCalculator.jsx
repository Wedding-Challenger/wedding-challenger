import { useNavigate } from 'react-router-dom';
import { useBudget } from '../context/BudgetContext';
import Onboarding from './Onboarding';
import WeddingHallCard from './WeddingHallCard';
import SdmeCustomizer from './SdmeCustomizer';
import BudgetBasket from './BudgetBasket';
import HorizontalScroll from './HorizontalScroll';
import AdSlot from './AdSlot';
import { weddingHalls as weddingHallsMock } from '../data/mockData';
import { getWeddingHalls, adaptHallFromApi } from '../services/api';
import { useApiList } from '../hooks/useApiList';

function HallSection() {
  const { data, loading, error } = useApiList(getWeddingHalls, weddingHallsMock);
  const weddingHalls = (data ?? []).map((h) =>
    h.id && String(h.id).startsWith('wh') ? h : adaptHallFromApi(h)
  );

  if (loading) return <div className="text-center py-12 text-charcoal/40">불러오는 중...</div>;
  if (error) return <div className="text-center py-12 text-deep-rose">데이터를 불러올 수 없습니다.</div>;

  return (
    <section id="halls">
      <div className="flex items-center gap-3 mb-6">
        <span className="w-10 h-10 bg-soft-gold/10 rounded-xl flex items-center justify-center text-lg">🏛</span>
        <div>
          <h2 className="text-xl font-bold text-charcoal">웨딩홀 선택</h2>
          <p className="text-sm text-charcoal/40">마음에 드는 웨딩홀을 선택해 보세요</p>
        </div>
      </div>
      <HorizontalScroll>
        {weddingHalls.map((hall) => (
          <div key={hall.id} className="min-w-[300px] max-w-[300px] shrink-0">
            <WeddingHallCard hall={hall} />
          </div>
        ))}
      </HorizontalScroll>
    </section>
  );
}

export default function BudgetCalculator({ adsEnabled }) {
  const { onboardingComplete, dispatch } = useBudget();
  const navigate = useNavigate();

  if (!onboardingComplete) {
    return <Onboarding />;
  }

  const handleReset = () => {
    dispatch({ type: 'RESET' });
    navigate('/calc');
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-charcoal">웨딩 견적 계산기</h1>
        <button
          onClick={handleReset}
          className="text-xs px-3 py-1.5 rounded-lg border border-warm-beige/50 text-charcoal/40 hover:text-deep-rose hover:border-deep-rose/30 transition-all"
          title="예산·하객 다시 설정"
        >
          ↺ 초기설정
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 min-w-0 space-y-12">
          <HallSection />

          <section id="sdme">
            <div className="flex items-center gap-3 mb-6">
              <span className="w-10 h-10 bg-soft-gold/10 rounded-xl flex items-center justify-center text-lg">✨</span>
              <div>
                <h2 className="text-xl font-bold text-charcoal">스드메 + 스냅 커스텀</h2>
                <p className="text-sm text-charcoal/40">필요한 항목만 골라 나만의 패키지를 만들어 보세요</p>
              </div>
            </div>
            <SdmeCustomizer />
          </section>
        </div>

        <aside className="w-full lg:w-[360px] shrink-0">
          <BudgetBasket />
          {adsEnabled && (
            <AdSlot enabled slot="9999000002" format="auto" className="hidden lg:block mt-6" />
          )}
        </aside>
      </div>
    </div>
  );
}
