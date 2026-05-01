import { useBudget } from '../context/BudgetContext';

function formatPrice(n) {
  if (n >= 10000) return (n / 10000).toFixed(0) + '만';
  return new Intl.NumberFormat('ko-KR').format(n);
}

export default function WeddingHallCard({ hall }) {
  const { selectedHall, guestCount, dispatch } = useBudget();
  const isSelected = selectedHall?.id === hall.id;
  const totalCost = hall.pricePerPerson * guestCount;

  const handleToggle = () => {
    if (isSelected) {
      dispatch({ type: 'DESELECT_HALL' });
    } else {
      dispatch({ type: 'SELECT_HALL', payload: hall });
    }
  };

  return (
    <div
      className={`rounded-3xl overflow-hidden border-2 transition-all duration-300 hover:shadow-lg cursor-pointer group ${
        isSelected ? 'border-soft-gold shadow-lg shadow-soft-gold/10' : 'border-transparent bg-white shadow-sm'
      }`}
      onClick={handleToggle}
    >
      {/* Image */}
      <div className="relative h-48 overflow-hidden">
        <img
          src={hall.image}
          alt={hall.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-3 left-3 flex gap-2">
          <span className="bg-white/90 backdrop-blur-sm text-xs font-semibold px-3 py-1.5 rounded-full text-charcoal">
            {hall.type}
          </span>
        </div>
        <div className="absolute top-3 right-3">
          <span className="bg-white/90 backdrop-blur-sm text-xs font-bold px-2.5 py-1.5 rounded-full text-soft-gold">
            ★ {hall.rating}
          </span>
        </div>
        {isSelected && (
          <div className="absolute inset-0 bg-soft-gold/20 flex items-center justify-center">
            <div className="bg-soft-gold text-white w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold shadow-lg">✓</div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-5 space-y-3">
        <div>
          <h3 className="font-bold text-lg text-charcoal">{hall.name}</h3>
          <p className="text-charcoal/50 text-sm">{hall.location}</p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {hall.features.map((f) => (
            <span key={f} className="bg-cream text-charcoal/60 text-xs px-2.5 py-1 rounded-full">{f}</span>
          ))}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-warm-beige/30">
          <div>
            <p className="text-xs text-charcoal/40">1인당</p>
            <p className="font-bold text-soft-gold">{formatPrice(hall.pricePerPerson)}원</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-charcoal/40">{guestCount}명 기준 예상</p>
            <p className="font-bold text-charcoal">{formatPrice(totalCost)}원</p>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-charcoal/50">
          <span>수용 {hall.capacity.min}~{hall.capacity.max}명</span>
          <span>예식 간격 {hall.intervalMinutes}분</span>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={(e) => { e.stopPropagation(); window.open(hall.homepage, '_blank'); }}
            className="flex-1 py-2.5 text-sm border-2 border-warm-beige/50 rounded-xl text-charcoal/60 hover:border-soft-gold/30 hover:text-soft-gold transition-all"
          >
            🔗 홈페이지
          </button>
          <button
            onClick={(e) => e.stopPropagation()}
            className="flex-1 py-2.5 text-sm border-2 border-warm-beige/50 rounded-xl text-charcoal/60 hover:border-soft-gold/30 hover:text-soft-gold transition-all"
          >
            📅 잔여타임
          </button>
        </div>
      </div>
    </div>
  );
}
