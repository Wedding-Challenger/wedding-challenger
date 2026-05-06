import { Link } from 'react-router-dom';
import { weddingHalls, studios, dresses, makeups, snaps } from '../data/mockData';
import AdSlot from './AdSlot';

function CardItem({ image, name, price, description, badge }) {
  return (
    <div className="min-w-[260px] max-w-[260px] shrink-0 bg-white rounded-2xl shadow-sm border border-warm-beige/30 overflow-hidden">
      <div className="h-36 bg-warm-beige/20 overflow-hidden">
        <img src={image} alt={name} className="w-full h-full object-cover" />
      </div>
      <div className="p-4">
        {badge && (
          <span className="text-xs bg-soft-gold/10 text-soft-gold font-semibold px-2 py-0.5 rounded-full mb-2 inline-block">
            {badge}
          </span>
        )}
        <p className="font-semibold text-charcoal text-sm truncate">{name}</p>
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

function CategoryRow({ icon, title, subtitle, children }) {
  return (
    <div className="mb-10">
      <div className="flex items-center gap-3 mb-4">
        <span className="w-9 h-9 bg-soft-gold/10 rounded-xl flex items-center justify-center text-base">{icon}</span>
        <div>
          <h2 className="text-lg font-bold text-charcoal">{title}</h2>
          {subtitle && <p className="text-xs text-charcoal/40">{subtitle}</p>}
        </div>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {children}
      </div>
    </div>
  );
}

export default function PublicLanding({ adsEnabled }) {
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
        <CategoryRow icon="🏛" title="웨딩홀" subtitle="예식장 비교">
          {weddingHalls.map((h) => (
            <Link to="/calc" key={h.id}>
              <CardItem
                image={h.image}
                name={h.name}
                price={null}
                description={`${h.location} · ${h.type}`}
                badge={`${h.pricePerPerson.toLocaleString()}원/인`}
              />
            </Link>
          ))}
        </CategoryRow>

        <CategoryRow icon="📸" title="스튜디오" subtitle="웨딩 촬영">
          {studios.map((s) => (
            <Link to="/calc" key={s.id}>
              <CardItem image={s.image} name={s.name} price={s.price} description={s.description} />
            </Link>
          ))}
        </CategoryRow>

        <CategoryRow icon="👗" title="드레스" subtitle="웨딩드레스">
          {dresses.map((d) => (
            <Link to="/calc" key={d.id}>
              <CardItem image={d.image} name={d.name} price={d.price} description={d.description} />
            </Link>
          ))}
        </CategoryRow>

        {adsEnabled && (
          <AdSlot enabled slot="9999000001" format="auto" className="my-8 max-w-3xl mx-auto" />
        )}

        <CategoryRow icon="💄" title="메이크업" subtitle="웨딩 메이크업">
          {makeups.map((m) => (
            <Link to="/calc" key={m.id}>
              <CardItem image={m.image} name={m.name} price={m.price} description={m.description} />
            </Link>
          ))}
        </CategoryRow>

        <CategoryRow icon="📷" title="스냅" subtitle="본식 스냅 촬영">
          {snaps.map((s) => (
            <Link to="/calc" key={s.id}>
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
