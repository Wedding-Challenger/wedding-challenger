import { useState, useMemo } from 'react';
import { useBudget } from '../context/BudgetContext';
import { weddingHalls as weddingHallsMock, studios as studiosMock, dresses as dressesMock, makeups as makeupsMock, snaps as snapsMock, rings as ringsMock, bouquets as bouquetsMock, hanboks as hanboksMock } from '../data/mockData';
import { getWeddingHalls, getVendors, adaptHallFromApi, adaptVendorFromApi } from '../services/api';
import { useApiList } from '../hooks/useApiList';

function makeVendorFetcher(category) {
  return async () => {
    const page = await getVendors(category);
    return page.items.map(adaptVendorFromApi);
  };
}

const hallsFetcher = getWeddingHalls;
const studiosFetcher = makeVendorFetcher('STUDIO');
const dressesFetcher = makeVendorFetcher('DRESS');
const makeupsFetcher = makeVendorFetcher('MAKEUP');
const snapsFetcher = makeVendorFetcher('SNAP');
const ringsFetcher = makeVendorFetcher('RING');
const bouquetsFetcher = makeVendorFetcher('BOUQUET');
const hanboksFetcher = makeVendorFetcher('HANBOK');

function formatPrice(n) {
  if (n >= 10000) return (n / 10000).toFixed(0) + '만';
  return new Intl.NumberFormat('ko-KR').format(n);
}

const CATEGORIES = [
  { key: 'all', label: '전체', icon: '🔍' },
  { key: 'hall', label: '웨딩홀', icon: '🏛' },
  { key: 'studio', label: '스튜디오', icon: '📸' },
  { key: 'dress', label: '드레스', icon: '👗' },
  { key: 'makeup', label: '메이크업', icon: '💄' },
  { key: 'snap', label: '스냅', icon: '📷' },
  { key: 'ring', label: '반지', icon: '💍' },
  { key: 'bouquet', label: '부케', icon: '💐' },
  { key: 'hanbok', label: '혼주한복', icon: '👘' },
];

function buildAllItems(guestCount, weddingHalls, studios, dresses, makeups, snaps, rings, bouquets, hanboks) {
  const halls = weddingHalls.map((h) => ({
    ...h,
    category: 'hall',
    categoryLabel: '웨딩홀',
    icon: '🏛',
    displayPrice: h.pricePerPerson * guestCount,
    priceLabel: `${guestCount}명 기준`,
    selectType: 'HALL',
  }));
  const studioItems = studios.map((s) => ({
    ...s,
    categoryLabel: '스튜디오',
    icon: '📸',
    displayPrice: s.price,
    priceLabel: '',
    selectType: 'STUDIO',
  }));
  const dressItems = dresses.map((d) => ({
    ...d,
    categoryLabel: '드레스',
    icon: '👗',
    displayPrice: d.price,
    priceLabel: '',
    selectType: 'DRESS',
  }));
  const makeupItems = makeups.map((m) => ({
    ...m,
    categoryLabel: '메이크업',
    icon: '💄',
    displayPrice: m.price,
    priceLabel: '',
    selectType: 'MAKEUP',
  }));
  const snapItems = snaps.map((s) => ({
    ...s,
    categoryLabel: '스냅',
    icon: '📷',
    displayPrice: s.price,
    priceLabel: '',
    selectType: 'SNAP',
  }));
  const ringItems = rings.map((r) => ({
    ...r,
    categoryLabel: '반지',
    icon: '💍',
    displayPrice: r.price,
    priceLabel: '',
    selectType: 'RING',
  }));
  const bouquetItems = bouquets.map((b) => ({
    ...b,
    categoryLabel: '부케',
    icon: '💐',
    displayPrice: b.price,
    priceLabel: '',
    selectType: 'BOUQUET',
  }));
  const hanbokItems = hanboks.map((h) => ({
    ...h,
    categoryLabel: '혼주한복',
    icon: '👘',
    displayPrice: h.price,
    priceLabel: '',
    selectType: 'HANBOK',
  }));
  return [...halls, ...studioItems, ...dressItems, ...makeupItems, ...snapItems, ...ringItems, ...bouquetItems, ...hanbokItems];
}

function isItemSelected(item, state) {
  switch (item.selectType) {
    case 'HALL': return state.selectedHall?.id === item.id;
    case 'STUDIO': return state.selectedStudio?.id === item.id;
    case 'DRESS': return state.selectedDress?.id === item.id;
    case 'MAKEUP': return state.selectedMakeup?.id === item.id;
    case 'SNAP': return state.selectedSnap?.id === item.id;
    case 'RING': return state.selectedRing?.id === item.id;
    case 'BOUQUET': return state.selectedBouquet?.id === item.id;
    case 'HANBOK': return state.selectedHanbok?.id === item.id;
    default: return false;
  }
}

export default function SearchTab() {
  const budget = useBudget();
  const { dispatch, guestCount } = budget;
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const { data: rawHalls = weddingHallsMock } = useApiList(hallsFetcher, weddingHallsMock);
  const { data: studios = studiosMock } = useApiList(studiosFetcher, studiosMock);
  const { data: dresses = dressesMock } = useApiList(dressesFetcher, dressesMock);
  const { data: makeups = makeupsMock } = useApiList(makeupsFetcher, makeupsMock);
  const { data: snaps = snapsMock } = useApiList(snapsFetcher, snapsMock);
  const { data: rings = ringsMock } = useApiList(ringsFetcher, ringsMock);
  const { data: bouquets = bouquetsMock } = useApiList(bouquetsFetcher, bouquetsMock);
  const { data: hanboks = hanboksMock } = useApiList(hanboksFetcher, hanboksMock);

  const weddingHalls = useMemo(
    () => rawHalls.map((h) => (h.id && String(h.id).startsWith('wh') ? h : adaptHallFromApi(h))),
    [rawHalls]
  );

  const allItems = useMemo(
    () => buildAllItems(guestCount, weddingHalls, studios, dresses, makeups, snaps, rings, bouquets, hanboks),
    [guestCount, weddingHalls, studios, dresses, makeups, snaps, rings, bouquets, hanboks]
  );

  const filtered = useMemo(() => {
    return allItems.filter((item) => {
      const matchCategory = activeCategory === 'all' || item.category === activeCategory;
      const matchQuery = !query ||
        item.name.toLowerCase().includes(query.toLowerCase()) ||
        (item.location && item.location.includes(query)) ||
        (item.description && item.description.includes(query)) ||
        (item.features && item.features.some((f) => f.includes(query))) ||
        (item.includes && item.includes.some((inc) => inc.includes(query)));
      return matchCategory && matchQuery;
    });
  }, [allItems, activeCategory, query]);

  const handleSelect = (item) => {
    const selected = isItemSelected(item, budget);
    if (selected) {
      dispatch({ type: `DESELECT_${item.selectType}` });
    } else {
      dispatch({ type: `SELECT_${item.selectType}`, payload: item });
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Input */}
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-charcoal/30 text-lg">🔍</span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="업체명, 지역, 특징으로 검색..."
          className="w-full pl-12 pr-4 py-4 bg-white border-2 border-warm-beige/50 rounded-2xl text-charcoal focus:outline-none focus:border-soft-gold transition-colors text-sm"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-charcoal/30 hover:text-charcoal transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      {/* Category Filter Chips */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeCategory === cat.key
                ? 'bg-soft-gold text-white shadow-sm'
                : 'bg-white border border-warm-beige/50 text-charcoal/60 hover:border-soft-gold/30'
            }`}
          >
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Results Count */}
      <p className="text-sm text-charcoal/40">
        {filtered.length}개의 업체를 찾았어요
        {query && <span className="text-soft-gold font-medium"> &middot; "{query}"</span>}
      </p>

      {/* Results Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((item) => {
            const selected = isItemSelected(item, budget);
            return (
              <div
                key={`${item.category}-${item.id}`}
                onClick={() => handleSelect(item)}
                className={`flex gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all hover:shadow-md group ${
                  selected ? 'border-soft-gold bg-soft-gold/5 shadow-sm' : 'border-transparent bg-white shadow-sm'
                }`}
              >
                {/* Thumbnail */}
                <div className="w-24 h-24 rounded-xl overflow-hidden shrink-0 relative">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  {selected && (
                    <div className="absolute inset-0 bg-soft-gold/30 flex items-center justify-center">
                      <span className="bg-soft-gold text-white w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold">✓</span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="bg-cream text-charcoal/50 text-[11px] px-2 py-0.5 rounded-full">{item.icon} {item.categoryLabel}</span>
                    <span className="text-xs text-soft-gold font-bold">★ {item.rating}</span>
                  </div>
                  <h4 className="font-bold text-charcoal truncate">{item.name}</h4>
                  <p className="text-xs text-charcoal/40 truncate">{item.description || item.location}</p>
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-soft-gold">{formatPrice(item.displayPrice)}원</p>
                    {item.priceLabel && <span className="text-[11px] text-charcoal/30">{item.priceLabel}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 text-charcoal/30">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-sm">검색 결과가 없어요</p>
          <p className="text-xs mt-1">다른 키워드로 검색해 보세요</p>
        </div>
      )}
    </div>
  );
}
