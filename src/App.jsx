import { useState } from 'react';
import { useBudget } from './context/BudgetContext';
import Onboarding from './components/Onboarding';
import WeddingHallCard from './components/WeddingHallCard';
import SdmeCustomizer from './components/SdmeCustomizer';
import BudgetBasket from './components/BudgetBasket';
import SearchTab from './components/SearchTab';
import HorizontalScroll from './components/HorizontalScroll';
import { weddingHalls } from './data/mockData';
import './App.css';

function MainContent() {
  const { onboardingComplete, dispatch } = useBudget();
  const [activeTab, setActiveTab] = useState('home');

  const handleReset = () => {
    dispatch({ type: 'RESET' });
    setActiveTab('home');
  };

  if (!onboardingComplete) {
    return <Onboarding />;
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-warm-beige/30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setActiveTab('home')} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <span className="text-2xl">💍</span>
              <h1 className="text-xl font-bold text-charcoal">웨딩첼린저</h1>
            </button>
            <button
              onClick={handleReset}
              className="text-xs px-3 py-1.5 rounded-lg border border-warm-beige/50 text-charcoal/40 hover:text-deep-rose hover:border-deep-rose/30 transition-all"
              title="예산·하객 다시 설정"
            >
              ↺ 초기설정
            </button>
          </div>
          <nav className="flex items-center gap-1 bg-warm-beige/20 rounded-xl p-1">
            <button
              onClick={() => setActiveTab('home')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'home' ? 'bg-white text-charcoal shadow-sm' : 'text-charcoal/50 hover:text-charcoal'
              }`}
            >
              🏠 홈
            </button>
            <button
              onClick={() => setActiveTab('search')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'search' ? 'bg-white text-charcoal shadow-sm' : 'text-charcoal/50 hover:text-charcoal'
              }`}
            >
              🔍 검색
            </button>
          </nav>
        </div>
      </header>

      {activeTab === 'home' && (
        <>
          {/* Hero */}
          <section className="bg-gradient-to-b from-warm-beige/30 to-cream py-16 px-6">
            <div className="max-w-4xl mx-auto text-center space-y-4">
              <h2 className="text-3xl md:text-4xl font-bold text-charcoal leading-tight">
                예산에 딱 맞는<br/>
                <span className="text-soft-gold">나만의 웨딩</span>을 설계하세요
              </h2>
              <p className="text-charcoal/50 max-w-md mx-auto">
                원하는 항목을 선택하면 견적 바구니에 실시간으로 반영됩니다.
                예산을 확인하며 편하게 비교해 보세요.
              </p>
            </div>
          </section>
        </>
      )}

      {/* Main Layout: Content + Sidebar */}
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Content */}
          <div className="flex-1 min-w-0 space-y-12">
            {activeTab === 'home' && (
              <>
                {/* Wedding Halls */}
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

                {/* SDME + Snap */}
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
              </>
            )}

            {activeTab === 'search' && (
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <span className="w-10 h-10 bg-soft-gold/10 rounded-xl flex items-center justify-center text-lg">🔍</span>
                  <div>
                    <h2 className="text-xl font-bold text-charcoal">업체 통합 검색</h2>
                    <p className="text-sm text-charcoal/40">웨딩홀, 스튜디오, 드레스, 메이크업, 스냅을 한 곳에서 검색하세요</p>
                  </div>
                </div>
                <SearchTab />
              </section>
            )}
          </div>

          {/* Sidebar */}
          <div className="w-full lg:w-[360px] shrink-0">
            <BudgetBasket />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-warm-beige/30 py-8 mt-16">
        <div className="max-w-7xl mx-auto px-6 text-center text-sm text-charcoal/30">
          <p>웨딩첼린저 — 예산에 맞는 완벽한 웨딩 플래닝</p>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return <MainContent />;
}
