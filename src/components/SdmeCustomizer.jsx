import { useState, useEffect } from 'react';
import { useBudget } from '../context/BudgetContext';
import { getVendors } from '../api/vendors';
import HorizontalScroll from './HorizontalScroll';
import SdmeRangePicker from './SdmeRangePicker';

function formatPrice(n) {
  if (n >= 10000) return (n / 10000).toFixed(0) + '만';
  return new Intl.NumberFormat('ko-KR').format(n);
}

function VendorCard({ item, isSelected, onToggle }) {
  return (
    <div
      onClick={onToggle}
      className={`rounded-2xl overflow-hidden border-2 transition-all duration-300 cursor-pointer hover:shadow-md group ${
        isSelected ? 'border-soft-gold shadow-md shadow-soft-gold/10' : 'border-transparent bg-white shadow-sm'
      }`}
    >
      <div className="relative h-36 overflow-hidden">
        <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute top-2 right-2">
          <span className="bg-white/90 backdrop-blur-sm text-xs font-bold px-2 py-1 rounded-full text-soft-gold">★ {item.rating}</span>
        </div>
        {isSelected && (
          <div className="absolute inset-0 bg-soft-gold/20 flex items-center justify-center">
            <div className="bg-soft-gold text-white w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold shadow-lg">✓</div>
          </div>
        )}
      </div>
      <div className="p-4 space-y-2">
        <h4 className="font-bold text-charcoal">{item.name}</h4>
        <p className="text-xs text-charcoal/50">{item.description}</p>
        <div className="flex flex-wrap gap-1">
          {item.includes.map((inc) => (
            <span key={inc} className="bg-cream text-charcoal/50 text-[11px] px-2 py-0.5 rounded-full">{inc}</span>
          ))}
        </div>
        <p className="font-bold text-soft-gold text-lg">{formatPrice(item.price)}원</p>
      </div>
    </div>
  );
}

function CategoryToggle({ label, icon, enabled, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-full border-2 text-sm font-semibold transition-all ${
        enabled
          ? 'border-soft-gold bg-soft-gold/10 text-soft-gold'
          : 'border-warm-beige/50 bg-white text-charcoal/40 line-through'
      }`}
    >
      <span>{icon}</span>
      <span>{label}</span>
      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${enabled ? 'bg-soft-gold text-white' : 'bg-warm-beige/50 text-charcoal/30'}`}>
        {enabled ? '✓' : '✕'}
      </span>
    </button>
  );
}

export default function SdmeCustomizer() {
  const {
    includeStudio, includeDress, includeMakeup, includeSnap, includeRing, includeBouquet, includeHanbok,
    selectedStudio, selectedDress, selectedMakeup, selectedSnap, selectedRing, selectedBouquet, selectedHanbok,
    dispatch,
  } = useBudget();

  const [vendors, setVendors] = useState({});

  useEffect(() => {
    const categories = ['studio', 'dress', 'makeup', 'snap', 'ring', 'bouquet', 'hanbok'];
    Promise.all(categories.map(getVendors))
      .then((results) => {
        const map = Object.fromEntries(categories.map((c, i) => [c, results[i]]));
        setVendors(map);
      })
      .catch(console.error);
  }, []);

  const handleSelect = (type, item, currentSelected) => {
    if (currentSelected?.id === item.id) {
      dispatch({ type: `DESELECT_${type}` });
    } else {
      dispatch({ type: `SELECT_${type}`, payload: item });
    }
  };

  return (
    <div className="space-y-8">
      {/* Toggle bar */}
      <div className="flex flex-wrap gap-3">
        <CategoryToggle label="스튜디오" icon="📸" enabled={includeStudio} onToggle={() => dispatch({ type: 'TOGGLE_STUDIO', payload: !includeStudio })} />
        <CategoryToggle label="드레스" icon="👗" enabled={includeDress} onToggle={() => dispatch({ type: 'TOGGLE_DRESS', payload: !includeDress })} />
        <CategoryToggle label="메이크업" icon="💄" enabled={includeMakeup} onToggle={() => dispatch({ type: 'TOGGLE_MAKEUP', payload: !includeMakeup })} />
        <CategoryToggle label="스냅" icon="📷" enabled={includeSnap} onToggle={() => dispatch({ type: 'TOGGLE_SNAP', payload: !includeSnap })} />
        <CategoryToggle label="반지" icon="💍" enabled={includeRing} onToggle={() => dispatch({ type: 'TOGGLE_RING', payload: !includeRing })} />
        <CategoryToggle label="부케" icon="💐" enabled={includeBouquet} onToggle={() => dispatch({ type: 'TOGGLE_BOUQUET', payload: !includeBouquet })} />
        <CategoryToggle label="혼주한복" icon="👘" enabled={includeHanbok} onToggle={() => dispatch({ type: 'TOGGLE_HANBOK', payload: !includeHanbok })} />
      </div>

      {/* 스드메 범위 추정 */}
      {(includeStudio || includeDress || includeMakeup) && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-charcoal flex items-center gap-2">
            <span className="w-8 h-8 bg-soft-gold/10 rounded-lg flex items-center justify-center text-sm">✨</span>
            스드메 가격 범위
            <span className="text-xs font-normal text-charcoal/40 ml-1">지역별 통계 기준</span>
          </h3>
          <SdmeRangePicker />
        </div>
      )}

      {/* Snap */}
      {includeSnap && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-charcoal flex items-center gap-2">
            <span className="w-8 h-8 bg-soft-gold/10 rounded-lg flex items-center justify-center text-sm">📷</span>
            스냅 촬영
          </h3>
          <HorizontalScroll>
            {(vendors.snap ?? []).map((s) => (
              <div key={s.id} className="min-w-[250px] max-w-[250px] shrink-0">
                <VendorCard item={s} isSelected={selectedSnap?.id === s.id} onToggle={() => handleSelect('SNAP', s, selectedSnap)} />
              </div>
            ))}
          </HorizontalScroll>
        </div>
      )}

      {/* Ring */}
      {includeRing && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-charcoal flex items-center gap-2">
            <span className="w-8 h-8 bg-soft-gold/10 rounded-lg flex items-center justify-center text-sm">💍</span>
            반지
          </h3>
          <HorizontalScroll>
            {(vendors.ring ?? []).map((r) => (
              <div key={r.id} className="min-w-[250px] max-w-[250px] shrink-0">
                <VendorCard item={r} isSelected={selectedRing?.id === r.id} onToggle={() => handleSelect('RING', r, selectedRing)} />
              </div>
            ))}
          </HorizontalScroll>
        </div>
      )}

      {/* Bouquet */}
      {includeBouquet && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-charcoal flex items-center gap-2">
            <span className="w-8 h-8 bg-soft-gold/10 rounded-lg flex items-center justify-center text-sm">💐</span>
            부케
          </h3>
          <HorizontalScroll>
            {(vendors.bouquet ?? []).map((b) => (
              <div key={b.id} className="min-w-[250px] max-w-[250px] shrink-0">
                <VendorCard item={b} isSelected={selectedBouquet?.id === b.id} onToggle={() => handleSelect('BOUQUET', b, selectedBouquet)} />
              </div>
            ))}
          </HorizontalScroll>
        </div>
      )}

      {/* Hanbok */}
      {includeHanbok && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-charcoal flex items-center gap-2">
            <span className="w-8 h-8 bg-soft-gold/10 rounded-lg flex items-center justify-center text-sm">👘</span>
            혼주한복
          </h3>
          <HorizontalScroll>
            {(vendors.hanbok ?? []).map((h) => (
              <div key={h.id} className="min-w-[250px] max-w-[250px] shrink-0">
                <VendorCard item={h} isSelected={selectedHanbok?.id === h.id} onToggle={() => handleSelect('HANBOK', h, selectedHanbok)} />
              </div>
            ))}
          </HorizontalScroll>
        </div>
      )}
    </div>
  );
}
