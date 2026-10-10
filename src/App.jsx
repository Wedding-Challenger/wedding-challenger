import { Routes, Route, NavLink, Link, Outlet, useLocation, useOutletContext } from 'react-router-dom';
import { useEffect, useState } from 'react';
import ConsentBanner from './components/ConsentBanner';
import { DEFAULT_CONSENT, STORAGE_KEY, getConsent, hasStoredConsent, setConsent as saveConsent } from './lib/consent';
import AdSenseLoader from './components/AdSenseLoader';
import AdSlot from './components/AdSlot';
import { AD_SLOTS } from './config/ads';
import { ROUTES } from './config/routes';
import { adsEnabled } from './config/environment';
import PublicLanding from './components/PublicLanding';
import BudgetCalculator from './components/BudgetCalculator';
import About from './components/About';
import Guide from './components/Guide';
import Checklist from './components/Checklist';
import PrivacyPolicy from './components/PrivacyPolicy';
import PrivacyPolicyPrevious from './components/PrivacyPolicyPrevious';
import Terms from './components/Terms';
import AdminLayout from './components/admin/AdminLayout';
import PartnerMeasureProvider from './context/PartnerMeasureProvider';
import { useOverlayHeader } from './context/partnerMeasureShared';
import './App.css';

const navLinkClass = ({ isActive }) =>
  `px-2.5 sm:px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
    isActive ? 'bg-white text-charcoal shadow-sm' : 'text-charcoal/50 hover:text-charcoal'
  }`;

function Header() {
  // sticky Header 가 가린 화면 위쪽은 제휴 노출 판정에서 뺀다(실측 높이 → IntersectionObserver rootMargin 위쪽)
  const headerRef = useOverlayHeader();
  return (
    <header ref={headerRef} className="bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-warm-beige/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
        <NavLink to="/" className="flex items-center gap-2 sm:gap-3 shrink-0 hover:opacity-80 transition-opacity">
          <span className="text-2xl">💍</span>
          <h1 className="sr-only min-[400px]:not-sr-only text-lg sm:text-xl font-bold text-charcoal whitespace-nowrap">웨딩챌린저</h1>
        </NavLink>
        <nav className="flex items-center gap-0.5 sm:gap-1 bg-warm-beige/20 rounded-xl p-1">
          <NavLink to="/" end className={navLinkClass}>홈</NavLink>
          <NavLink to="/calc" className={navLinkClass}>예산 계산</NavLink>
          <NavLink to="/guide" className={navLinkClass}>가이드</NavLink>
          <NavLink to="/checklist" className={navLinkClass}>체크리스트</NavLink>
        </nav>
      </div>
    </header>
  );
}

function Footer({ adsEnabled, onOpenConsent }) {
  return (
    <footer className="bg-white border-t border-warm-beige/30 py-8 mt-16">
      <div className="max-w-7xl mx-auto px-6">
        <AdSlot enabled={adsEnabled} slot={AD_SLOTS.footer} format="horizontal" className="mb-6" />
        <div className="text-center text-sm text-charcoal/30 space-y-3">
          <p>웨딩챌린저 — 예산에 맞는 완벽한 웨딩 플래닝</p>
          <nav className="flex items-center justify-center gap-4 text-charcoal/50">
            <Link to="/about" className="hover:text-deep-rose transition-colors">소개</Link>
            <span className="text-charcoal/20">|</span>
            <Link to="/guide" className="hover:text-deep-rose transition-colors">가이드</Link>
            <span className="text-charcoal/20">|</span>
            <Link to="/checklist" className="hover:text-deep-rose transition-colors">체크리스트</Link>
            <span className="text-charcoal/20">|</span>
            <Link to="/privacy" className="hover:text-deep-rose transition-colors">개인정보처리방침</Link>
            <span className="text-charcoal/20">|</span>
            <Link to="/terms" className="hover:text-deep-rose transition-colors">이용약관</Link>
            <span className="text-charcoal/20">|</span>
            <button type="button" onClick={onOpenConsent} className="hover:text-deep-rose transition-colors">
              광고 동의 설정
            </button>
          </nav>
          <p className="text-xs text-charcoal/20">© 2026 웨딩챌린저. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

// 첫 로드 제목은 사전 렌더링 HTML 에 들어 있고, 이후 클라이언트 이동 시 여기서 갱신
function useRouteTitle() {
  const { pathname } = useLocation();
  useEffect(() => {
    const route = ROUTES.find((r) => r.path === pathname);
    if (route) document.title = route.title;
  }, [pathname]);
}

// 공개 레이아웃: Header·Footer·광고·동의 배너. 관리 화면(/admin/*)은 이 레이아웃 밖이다(제휴 측정 context 도 공개 화면에만).
function PublicLayout() {
  useRouteTitle();
  // 사전 렌더링 HTML 과 첫 렌더를 맞추려고 기본값(미동의·배너 닫힘)으로 시작한 뒤 저장값을 읽는다.
  const [consent, setConsent] = useState(DEFAULT_CONSENT);
  const [bannerOpen, setBannerOpen] = useState(false);

  useEffect(() => {
    // 하이드레이션 직후 1회 localStorage 동기화 — 렌더 중 읽으면 서버 HTML 과 어긋남
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConsent(getConsent());
    setBannerOpen(!hasStoredConsent());
  }, []);

  const handleDecide = (next) => {
    saveConsent(next); // gtag consent update 포함
    setBannerOpen(false);
    // 이미 로드된 adsbygoogle.js 와 표시된 광고는 깔끔히 내릴 방법이 없어 새로고침.
    // 새로고침 후엔 동의=false 라 스크립트·슬롯 모두 로드되지 않음.
    if (consent.ads && !next.ads) {
      window.location.reload();
      return;
    }
    setConsent(next);
  };

  // 다른 탭에서 철회해도 이 탭 광고를 내리도록 같은 방식(새로고침)으로 처리
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== STORAGE_KEY) return;
      if (consent.ads && !getConsent().ads) window.location.reload();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [consent.ads]);

  // 광고는 운영 빌드 + 사용자 동의 둘 다 있어야 켠다
  const adsAllowed = adsEnabled && consent.ads;

  return (
    <PartnerMeasureProvider>
      <div className="min-h-screen">
        <AdSenseLoader enabled={adsAllowed} />
        <Header />
        <main>
          <Outlet context={{ adsEnabled: adsAllowed }} />
        </main>
        <Footer adsEnabled={adsAllowed} onOpenConsent={() => setBannerOpen(true)} />
        <ConsentBanner open={bannerOpen} onDecide={handleDecide} />
      </div>
    </PartnerMeasureProvider>
  );
}

function Landing() {
  const { adsEnabled: ads } = useOutletContext();
  return <PublicLanding adsEnabled={ads} />;
}

function Calculator() {
  const { adsEnabled: ads } = useOutletContext();
  return <BudgetCalculator adsEnabled={ads} />;
}

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/calc" element={<Calculator />} />
        <Route path="/about" element={<About />} />
        <Route path="/guide" element={<Guide />} />
        <Route path="/checklist" element={<Checklist />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/privacy/previous" element={<PrivacyPolicyPrevious />} />
        <Route path="/terms" element={<Terms />} />
        {/* 없는 공개 경로도 Header·Footer 는 그대로 그린다 */}
        <Route path="*" element={null} />
      </Route>
      {/* 관리 셸(admin.html)로만 들어온다. 사전 렌더링·sitemap 대상이 아니다 */}
      <Route path="/admin/*" element={<AdminLayout />} />
    </Routes>
  );
}
