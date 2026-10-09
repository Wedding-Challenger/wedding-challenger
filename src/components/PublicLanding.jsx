import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getHalls } from '../api/halls';
import { getVendors } from '../api/vendors';
import AdSlot from './AdSlot';
import HorizontalScroll from './HorizontalScroll';
import PartnerMarquee from './PartnerMarquee';
import usePartnerFeed from '../hooks/usePartnerFeed';
import { FALLBACK_HALLS, fallbackVendors } from '../data/fallback';
import { AD_SLOTS } from '../config/ads';
import HallFilter from './HallFilter';
import HallThumb from './HallThumb';
import { displayName, filterHalls } from '../lib/halls';

// 홈에서는 지역별로 이만큼만 보여 주고 나머지는 계산기로 보낸다
const LANDING_HALLS = 12;

// 스튜디오·드레스·메이크업은 계산기에서 지역 시세로 고르므로 해당 섹션으로만 안내한다
const SDME_PICK = { pick: { type: 'SDME', label: '스드메 시세' } };

function CardItem({ image, media, name, title, price, description, badge }) {
  return (
    <div className="min-w-[260px] max-w-[260px] shrink-0 bg-white rounded-2xl shadow-sm border border-warm-beige/30 overflow-hidden">
      <div className="h-36 bg-warm-beige/20 overflow-hidden">
        {media ?? <img src={image} alt={name} className="w-full h-full object-cover" />}
      </div>
      <div className="p-4">
        {badge && (
          <span className="text-xs bg-soft-gold/10 text-soft-gold font-semibold px-2 py-0.5 rounded-full mb-2 inline-block">
            {badge}
          </span>
        )}
        <p className="font-semibold text-charcoal text-sm truncate" title={title}>{name}</p>
        {description && <p className="text-xs text-charcoal/50 mt-0.5 truncate">{description}</p>}
        {price != null && (
          <p className="text-sm font-bold text-soft-gold mt-2">
            {price >= 10000 ? (price / 10000).toLocaleString() + '만원' : price.toLocaleString() + '원'}
          </p>
        )}
      </div>
    </div>
  );
}

function RowTitle({ icon, title, subtitle }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="w-9 h-9 bg-soft-gold/10 rounded-xl flex items-center justify-center text-base">{icon}</span>
      <div>
        <h2 className="text-lg font-bold text-charcoal">{title}</h2>
        {subtitle && <p className="text-xs text-charcoal/40">{subtitle}</p>}
      </div>
    </div>
  );
}

function CategoryRow({ icon, title, subtitle, filter, children }) {
  return (
    <div className="mb-10">
      <RowTitle icon={icon} title={title} subtitle={subtitle} />
      {filter}
      <HorizontalScroll gapClass="gap-4" label={title}>
        {children}
      </HorizontalScroll>
    </div>
  );
}

export default function PublicLanding({ adsEnabled }) {
  // 첫 렌더(사전 렌더링 포함)는 내장 데이터, API 응답이 오면 교체
  const [halls, setHalls] = useState(FALLBACK_HALLS);
  const [area, setArea] = useState(null);
  const [district, setDistrict] = useState(null);
  const areaHalls = useMemo(() => filterHalls(halls, { area, district }), [halls, area, district]);
  const [vendors, setVendors] = useState(() => ({
    studio: fallbackVendors('studio'),
    dress: fallbackVendors('dress'),
    makeup: fallbackVendors('makeup'),
    snap: fallbackVendors('snap'),
  }));

  // 홈 메인 제휴(HOME_MAIN). 슬롯 off·0건·실패·만료면 빈 목록 → 아래 일반 웨딩홀 줄을 그대로 보인다
  const partners = usePartnerFeed('HOME_MAIN');

  useEffect(() => {
    getHalls().then(setHalls).catch(console.error);
    Promise.all(['studio', 'dress', 'makeup', 'snap'].map(getVendors))
      .then(([studio, dress, makeup, snap]) => setVendors({ studio, dress, makeup, snap }))
      .catch(console.error);
  }, []);

  const studios = vendors.studio ?? [];
  const dresses = vendors.dress ?? [];
  const makeups = vendors.makeup ?? [];
  const snaps = vendors.snap ?? [];

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-b from-warm-beige/30 to-cream py-16 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <p className="text-sm text-soft-gold font-semibold tracking-widest uppercase">Wedding Challenger</p>
          <h1 className="text-3xl md:text-4xl font-bold text-charcoal leading-tight">
            예산에 딱 맞는 <span className="text-soft-gold">나만의 웨딩</span>
          </h1>
          <p className="text-charcoal/60 max-w-md mx-auto">
            웨딩홀, 스드메, 스냅을 한 곳에서 비교하고 실시간 견적을 만들어 보세요.
          </p>
          <Link
            to="/calc"
            className="inline-block mt-4 px-8 py-3 bg-soft-gold text-white rounded-xl font-semibold hover:bg-soft-gold/90 transition-all active:scale-[0.98]"
          >
            내 예산 계산하기 →
          </Link>
        </div>
      </section>

      {/* Catalog */}
      <section className="max-w-7xl mx-auto px-6 py-12">
        {partners.length > 0 ? (
          // 제휴 업체만 보이는 광고 줄(일반 업체·지역 필터를 섞지 않음). 일반 웨딩홀 탐색은 계산기에서 계속한다
          <div className="mb-10">
            <RowTitle icon="🤝" title="제휴 업체" subtitle="광고료를 받고 노출하는 제휴 업체입니다" />
            <PartnerMarquee items={partners} label="제휴 업체" />
          </div>
        ) : (
          <CategoryRow
            icon="🏛"
            title="웨딩홀"
            subtitle={`예식장 비교 · ${halls.length}곳`}
            filter={
              <HallFilter halls={halls} area={area} onAreaChange={setArea} district={district} onDistrictChange={setDistrict} />
            }
          >
            {areaHalls.slice(0, LANDING_HALLS).map((h) => (
              <Link to="/calc" key={h.id} state={{ pick: { type: 'HALL', item: h, label: displayName(h.name) } }}>
                <CardItem
                  media={<HallThumb hall={h} />}
                  name={displayName(h.name)}
                  title={h.name}
                  price={null}
                  description={[h.location, h.type].filter(Boolean).join(' · ')}
                  badge={`${h.pricePerPerson.toLocaleString()}원/인`}
                />
              </Link>
            ))}
            {areaHalls.length > LANDING_HALLS && (
              <Link
                to="/calc"
                className="min-w-[160px] shrink-0 rounded-2xl border-2 border-dashed border-warm-beige/60 flex flex-col items-center justify-center text-sm text-charcoal/50 hover:text-soft-gold hover:border-soft-gold/40 transition-all"
              >
                <span className="text-2xl mb-1">→</span>
                {district ? `${area} ${district}` : area ?? '전체'} {areaHalls.length}곳
                <span className="text-xs mt-0.5">계산기에서 모두 보기</span>
              </Link>
            )}
          </CategoryRow>
        )}

        <CategoryRow icon="📸" title="스튜디오" subtitle="웨딩 촬영">
          {studios.map((s) => (
            <Link to="/calc" key={s.id} state={SDME_PICK}>
              <CardItem image={s.image} name={s.name} price={s.price} description={s.description} />
            </Link>
          ))}
        </CategoryRow>

        <CategoryRow icon="👗" title="드레스" subtitle="웨딩드레스">
          {dresses.map((d) => (
            <Link to="/calc" key={d.id} state={SDME_PICK}>
              <CardItem image={d.image} name={d.name} price={d.price} description={d.description} />
            </Link>
          ))}
        </CategoryRow>

        <AdSlot enabled={adsEnabled} slot={AD_SLOTS.landing} format="auto" className="my-8 max-w-3xl mx-auto" />

        <CategoryRow icon="💄" title="메이크업" subtitle="웨딩 메이크업">
          {makeups.map((m) => (
            <Link to="/calc" key={m.id} state={SDME_PICK}>
              <CardItem image={m.image} name={m.name} price={m.price} description={m.description} />
            </Link>
          ))}
        </CategoryRow>

        <CategoryRow icon="📷" title="스냅" subtitle="본식 스냅 촬영">
          {snaps.map((s) => (
            <Link to="/calc" key={s.id} state={{ pick: { type: 'SNAP', item: s, label: s.name } }}>
              <CardItem image={s.image} name={s.name} price={s.price} description={s.description} />
            </Link>
          ))}
        </CategoryRow>
      </section>

      {/* Bottom CTA */}
      <section className="bg-soft-gold/10 py-12 px-6 text-center">
        <h2 className="text-2xl font-bold text-charcoal mb-3">마음에 드는 업체를 찾으셨나요?</h2>
        <p className="text-charcoal/60 mb-6">예산과 하객 수를 입력하면 실시간으로 견적이 쌓입니다.</p>
        <Link
          to="/calc"
          className="inline-block px-8 py-3 bg-soft-gold text-white rounded-xl font-semibold hover:bg-soft-gold/90 transition-all"
        >
          견적 계산기 시작하기
        </Link>
      </section>
    </>
  );
}
