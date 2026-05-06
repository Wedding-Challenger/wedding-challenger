import { Routes, Route, NavLink, Link } from 'react-router-dom';
import { useState } from 'react';
import ConsentBanner from './components/ConsentBanner';
import { getConsent } from './lib/consent';
import AdSenseLoader from './components/AdSenseLoader';
import AdSlot from './components/AdSlot';
import PublicLanding from './components/PublicLanding';
import BudgetCalculator from './components/BudgetCalculator';
import About from './components/About';
import Guide from './components/Guide';
import Checklist from './components/Checklist';
import PrivacyPolicy from './components/PrivacyPolicy';
import Terms from './components/Terms';
import './App.css';

const navLinkClass = ({ isActive }) =>
  `px-4 py-2 rounded-lg text-sm font-medium transition-all ${
    isActive ? 'bg-white text-charcoal shadow-sm' : 'text-charcoal/50 hover:text-charcoal'
  }`;

function Header() {
  return (
    <header className="bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-warm-beige/30">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <NavLink to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <span className="text-2xl">💍</span>
          <h1 className="text-xl font-bold text-charcoal">웨딩첼린저</h1>
        </NavLink>
        <nav className="flex items-center gap-1 bg-warm-beige/20 rounded-xl p-1">
          <NavLink to="/" end className={navLinkClass}>홈</NavLink>
          <NavLink to="/calc" className={navLinkClass}>예산 계산</NavLink>
          <NavLink to="/guide" className={navLinkClass}>가이드</NavLink>
          <NavLink to="/checklist" className={navLinkClass}>체크리스트</NavLink>
        </nav>
      </div>
    </header>
  );
}

function Footer({ adsEnabled }) {
  return (
    <footer className="bg-white border-t border-warm-beige/30 py-8 mt-16">
      <div className="max-w-7xl mx-auto px-6">
        {adsEnabled && (
          <AdSlot enabled slot="9999000003" format="horizontal" className="mb-6" />
        )}
        <div className="text-center text-sm text-charcoal/30 space-y-3">
          <p>웨딩첼린저 — 예산에 맞는 완벽한 웨딩 플래닝</p>
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
          </nav>
          <p className="text-xs text-charcoal/20">© 2026 웨딩첼린저. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

export default function App() {
  const [consent, setConsent] = useState(getConsent);

  return (
    <div className="min-h-screen">
      <AdSenseLoader enabled={consent.ads} />
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<PublicLanding adsEnabled={consent.ads} />} />
          <Route path="/calc" element={<BudgetCalculator adsEnabled={consent.ads} />} />
          <Route path="/about" element={<About />} />
          <Route path="/guide" element={<Guide />} />
          <Route path="/checklist" element={<Checklist />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<Terms />} />
        </Routes>
      </main>
      <Footer adsEnabled={consent.ads} />
      <ConsentBanner onChange={setConsent} />
    </div>
  );
}
