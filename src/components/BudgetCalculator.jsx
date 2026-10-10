import { useLocation, useNavigate } from 'react-router-dom';
import { useBudget } from '../context/budgetContextShared';
import Onboarding from './Onboarding';
import WeddingHallCard from './WeddingHallCard';
import SdmeCustomizer from './SdmeCustomizer';
import BudgetBasket from './BudgetBasket';
import HorizontalScroll from './HorizontalScroll';
import PartnerSection from './PartnerSection';
import HallRangeCompare from './HallRangeCompare';
import AdSlot from './AdSlot';
import { AD_SLOTS } from '../config/ads';
import { useState, useEffect, useMemo, useRef } from 'react';
import { getHalls } from '../api/halls';
import HallFilter from './HallFilter';
import { budgetFilter, filterHalls, hallArea } from '../lib/halls';
import { ConditionChip, ConditionPanel, NoHallResults } from './BudgetConditions';
import { FALLBACK_HALLS } from '../data/fallback';

function HallSection() {
  const [weddingHalls, setWeddingHalls] = useState(FALLBACK_HALLS);
  const [viewMode, setViewMode] = useState('card');
  const [area, setArea] = useState(null);
  const [district, setDistrict] = useState(null);
  const [query, setQuery] = useState('');
  const [panelOpen, setPanelOpen] = useState(false);
  const { guestCount, rentRange, foodRange, getHallBudget } = useBudget();
  const hallBudget = getHallBudget();

  // 돈 조건 → 지역 칩 → 검색 순서. 지역 칩 숫자도 돈 조건을 통과한 웨딩홀 기준
  const { passed, excludedBy } = useMemo(
    () => budgetFilter(weddingHalls, { hallBudget, guestCount, rentRange, foodRange }),
    [weddingHalls, hallBudget, guestCount, rentRange, foodRange],
  );
  // 고른 지역이 조건 때문에 사라지면 전체로, 고른 시·군·구가 사라지면 그 시·도 전체로 본다
  const activeArea = area && passed.some((h) => hallArea(h) === area) ? area : null;
  const activeDistrict =
    activeArea && district && filterHalls(passed, { area: activeArea, district }).length > 0 ? district : null;
  const filtered = useMemo(
    () => filterHalls(passed, { area: activeArea, district: activeDistrict, query }),
    [passed, activeArea, activeDistrict, query],
  );

  useEffect(() => {
    getHalls().then(setWeddingHalls).catch(console.error);
  }, []);

  return (
    <section id="halls" className="scroll-mt-24">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 bg-soft-gold/10 rounded-xl flex items-center justify-center text-lg">🏛</span>
          <div>
            <h2 className="text-xl font-bold text-charcoal">웨딩홀 선택</h2>
            <p className="text-sm text-charcoal/40">마음에 드는 웨딩홀을 선택해 보세요</p>
          </div>
        </div>
        <div className="flex items-center bg-warm-beige/20 rounded-xl p-1 gap-1">
          <button
            onClick={() => setViewMode('card')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${viewMode === 'card' ? 'bg-white text-charcoal shadow-sm' : 'text-charcoal/40 hover:text-charcoal'}`}
          >
            카드
          </button>
          <button
            onClick={() => setViewMode('compare')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${viewMode === 'compare' ? 'bg-white text-charcoal shadow-sm' : 'text-charcoal/40 hover:text-charcoal'}`}
          >
            범위 비교
          </button>
        </div>
      </div>

      <HallFilter
        halls={passed}
        area={activeArea}
        onAreaChange={setArea}
        district={activeDistrict}
        onDistrictChange={setDistrict}
        query={query}
        onQueryChange={setQuery}
        resultCount={filtered.length}
        total={weddingHalls.length}
        leading={<ConditionChip open={panelOpen} onToggle={() => setPanelOpen((v) => !v)} />}
      />
      {panelOpen && <ConditionPanel onClose={() => setPanelOpen(false)} />}

      {filtered.length === 0 ? (
        <NoHallResults excludedBy={excludedBy} budgetPassedCount={passed.length} hallBudget={hallBudget} onEdit={() => setPanelOpen(true)} />
      ) : viewMode === 'card' ? (
        <HorizontalScroll>
          {filtered.map((hall) => (
            <div key={hall.id} className="min-w-[300px] max-w-[300px] shrink-0">
              <WeddingHallCard hall={hall} />
            </div>
          ))}
        </HorizontalScroll>
      ) : (
        <HallRangeCompare halls={filtered} />
      )}
    </section>
  );
}

// 홈 카드에서 넘어온 항목: 웨딩홀·스냅은 담고, 스드메는 시세 선택 섹션으로만 안내
const PICK_SECTION = { HALL: 'halls', SNAP: 'sdme', SDME: 'sdme' };

export default function BudgetCalculator({ adsEnabled }) {
  const { onboardingComplete, hydrated, dispatch } = useBudget();
  const navigate = useNavigate();
  const location = useLocation();
  const [pick] = useState(() => location.state?.pick ?? null);
  const pendingScroll = useRef(pick ? PICK_SECTION[pick.type] : null);

  // 넘어온 항목을 한 번만 담고, 새로고침 때 다시 담지 않도록 history state 를 비운다
  useEffect(() => {
    if (!pick) return;
    if (pick.type === 'HALL') dispatch({ type: 'SELECT_HALL', payload: pick.item });
    if (pick.type === 'SNAP') {
      dispatch({ type: 'TOGGLE_SNAP', payload: true });
      dispatch({ type: 'SELECT_SNAP', payload: pick.item });
    }
    navigate(location.pathname, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 온보딩이 끝난 뒤(또는 이미 끝났으면 바로) 해당 섹션으로 이동
  useEffect(() => {
    if (!hydrated || !onboardingComplete || !pendingScroll.current) return;
    document.getElementById(pendingScroll.current)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    pendingScroll.current = null;
  }, [hydrated, onboardingComplete]);

  const handleClear = () => {
    if (window.confirm('담아 둔 웨딩홀·스드메·스냅을 모두 비울까요? 예산과 하객 수는 그대로 둡니다.')) {
      dispatch({ type: 'CLEAR_SELECTIONS' });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* 저장된 온보딩 값을 읽은 뒤에만 띄워 재방문 때 깜빡이지 않게 한다. 사전 렌더링에는 계산기 본문이 들어간다 */}
      {hydrated && !onboardingComplete && <Onboarding picked={pick?.label} />}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
        <h1 className="text-2xl font-bold text-charcoal">웨딩 견적 계산기</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => dispatch({ type: 'REOPEN_ONBOARDING' })}
            className="text-xs px-3 py-1.5 rounded-lg border border-warm-beige/50 text-charcoal/50 hover:text-soft-gold hover:border-soft-gold/40 transition-all"
            title="담아 둔 견적은 그대로 두고 예산·하객 수만 다시 설정"
          >
            ✎ 예산·하객 다시 설정
          </button>
          <button
            onClick={handleClear}
            className="text-xs px-3 py-1.5 rounded-lg border border-warm-beige/50 text-charcoal/40 hover:text-deep-rose hover:border-deep-rose/30 transition-all"
            title="예산·하객 수는 그대로 두고 담아 둔 항목만 비우기"
          >
            ↺ 견적 비우기
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 min-w-0 space-y-12">
          <HallSection />

          <section id="sdme" className="scroll-mt-24">
            <div className="flex items-center gap-3 mb-6">
              <span className="w-10 h-10 bg-soft-gold/10 rounded-xl flex items-center justify-center text-lg">✨</span>
              <div>
                <h2 className="text-xl font-bold text-charcoal">스드메 + 스냅 커스텀</h2>
                <p className="text-sm text-charcoal/40">필요한 항목만 골라 나만의 패키지를 만들어 보세요</p>
              </div>
            </div>
            <SdmeCustomizer />
          </section>

          {/* AdSense 는 aside 밖 본문 열 하단(계획서 C6). 데스크톱 표시·동의·환경 게이트는 그대로 */}
          <AdSlot enabled={adsEnabled} slot={AD_SLOTS.calcSidebar} format="auto" className="hidden lg:block" />
        </div>

        <aside className="w-full lg:w-[360px] shrink-0">
          {/* 바구니와 바로 아래 제휴 세로 목록을 한 sticky 래퍼로 묶는다(계획서 B1·C7). 큰 화면에서만 붙잡고, 화면 높이를 넘으면
              래퍼 안에서 스크롤한다(바깥 페이지로 스크롤이 넘어가지 않음). 상단은 고정 Header 아래에 둔다. 모바일은 본문 뒤 같은 순서. */}
          <div
            role="region"
            aria-label="견적 바구니와 제휴 업체"
            className="space-y-4 lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto lg:overscroll-contain lg:pb-2"
          >
            <BudgetBasket />
            <PartnerSection />
          </div>
        </aside>
      </div>
    </div>
  );
}
