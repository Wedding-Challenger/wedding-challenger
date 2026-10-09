import { useState } from 'react';
import { BUDGET_OPTIONS, GUEST_OPTIONS, cleanRange, formatRange, sameRange } from '../lib/budgetPresets';

// 온보딩(큰 버튼)과 계산기 '조건' 패널(작은 칩)이 함께 쓰는 입력. compact 면 칩 모양.

const digits = (v) => v.replace(/[^0-9]/g, '');

function optionClass(active, compact) {
  if (compact) {
    return `shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
      active ? 'bg-soft-gold text-white border-soft-gold' : 'bg-white text-charcoal/60 border-warm-beige/50 hover:border-soft-gold/40'
    }`;
  }
  return `p-4 rounded-2xl border-2 text-left transition-all ${
    active ? 'border-soft-gold bg-soft-gold/10 text-soft-gold font-semibold' : 'border-warm-beige/50 hover:border-soft-gold/30'
  }`;
}

const inputClass = (compact) =>
  compact
    ? 'w-full px-3 py-2 border border-warm-beige/50 rounded-xl text-sm focus:outline-none focus:border-soft-gold'
    : 'w-full p-4 border-2 border-warm-beige/50 rounded-2xl focus:outline-none focus:border-soft-gold transition-colors';

// 숫자 하나 직접 입력. 입력 중인 문자열은 따로 들고(비우기 가능), 0보다 큰 값일 때만 반영한다
function NumberDraft({ value, isPreset, onChange, className, placeholder, ariaLabel }) {
  const [draft, setDraft] = useState(isPreset ? '' : String(value || ''));
  const shown = isPreset && draft !== '' && Number(draft) !== value ? '' : draft;
  return (
    <input
      type="text"
      inputMode="numeric"
      aria-label={ariaLabel}
      placeholder={placeholder}
      value={shown}
      onChange={(e) => {
        const d = digits(e.target.value);
        setDraft(d);
        if (Number(d) > 0) onChange(Number(d));
      }}
      className={className}
    />
  );
}

// 전체 예산: 프리셋 + 직접 입력(원)
export function BudgetInput({ value, onChange, compact = false }) {
  const isPreset = BUDGET_OPTIONS.some((o) => o.value === value);
  return (
    <div className={compact ? 'space-y-2' : 'space-y-4'}>
      <div className={compact ? 'flex flex-wrap gap-2' : 'grid grid-cols-1 gap-3'}>
        {BUDGET_OPTIONS.map((o) => (
          <button key={o.value} type="button" onClick={() => onChange(o.value)} className={optionClass(value === o.value, compact)}>
            {o.label}
          </button>
        ))}
      </div>
      <div>
        {!compact && <label className="text-sm text-charcoal/50 mb-1 block">직접 입력</label>}
        <NumberDraft
          value={value}
          isPreset={isPreset}
          onChange={onChange}
          placeholder={compact ? '직접 입력 (원)' : '예: 45000000'}
          ariaLabel="전체 예산 직접 입력"
          className={inputClass(compact)}
        />
        {!isPreset && value > 0 && <p className="text-sm text-soft-gold mt-1">{value.toLocaleString('ko-KR')}원</p>}
      </div>
    </div>
  );
}

// 대관료·식대 범위: '상관없음' 포함 프리셋 + 직접 입력(최소·최대, 원). value: {min,max} | null
export function RangeInput({ presets, value, onChange, compact = false, unitExample }) {
  const isPreset = presets.some((p) => sameRange(p.value, value));
  const set = (key, raw) => {
    const d = digits(raw);
    onChange(cleanRange({ ...(value ?? {}), [key]: d === '' ? null : Number(d) }));
  };
  return (
    <div className={compact ? 'space-y-2' : 'space-y-4'}>
      <div className={compact ? 'flex flex-wrap gap-2' : 'grid grid-cols-2 gap-3'}>
        {presets.map((p) => (
          <button key={p.label} type="button" onClick={() => onChange(p.value)} className={optionClass(isPreset && sameRange(p.value, value), compact)}>
            {p.label}
          </button>
        ))}
      </div>
      <div>
        {!compact && <label className="text-sm text-charcoal/50 mb-1 block">직접 입력 (원)</label>}
        <div className="flex items-center gap-2">
          <input
            type="text"
            inputMode="numeric"
            aria-label="최소"
            placeholder={`최소 ${unitExample?.[0] ?? ''}`}
            value={!isPreset && value?.min != null ? String(value.min) : ''}
            onChange={(e) => set('min', e.target.value)}
            className={inputClass(compact)}
          />
          <span className="text-charcoal/40">~</span>
          <input
            type="text"
            inputMode="numeric"
            aria-label="최대"
            placeholder={`최대 ${unitExample?.[1] ?? ''}`}
            value={!isPreset && value?.max != null ? String(value.max) : ''}
            onChange={(e) => set('max', e.target.value)}
            className={inputClass(compact)}
          />
        </div>
        {!isPreset && value && <p className="text-sm text-soft-gold mt-1">{formatRange(value)}</p>}
      </div>
    </div>
  );
}

// 하객 수: 프리셋 + 직접 입력(명)
export function GuestInput({ value, onChange, compact = false }) {
  const isPreset = GUEST_OPTIONS.some((o) => o.value === value);
  return (
    <div className={compact ? 'space-y-2' : 'space-y-4'}>
      <div className={compact ? 'flex flex-wrap gap-2' : 'grid grid-cols-2 gap-3'}>
        {GUEST_OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={compact ? optionClass(value === o.value, true) : `p-5 rounded-2xl border-2 text-center transition-all ${
              value === o.value ? 'border-soft-gold bg-soft-gold/10' : 'border-warm-beige/50 hover:border-soft-gold/30'
            }`}
          >
            {!compact && <div className="text-2xl mb-1">👥</div>}
            <div className={compact ? '' : `font-semibold ${value === o.value ? 'text-soft-gold' : 'text-charcoal'}`}>{o.label}</div>
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <NumberDraft
          value={value}
          isPreset={isPreset}
          onChange={onChange}
          placeholder="직접 입력"
          ariaLabel="하객 수 직접 입력"
          className={inputClass(compact)}
        />
        <span className="text-sm text-charcoal/40 shrink-0">명</span>
      </div>
    </div>
  );
}

// 온보딩 마지막 단계·패널 상단 요약
export function ConditionSummary({ totalBudget, rentRange, foodRange, guestCount }) {
  const rows = [
    ['설정 예산', `${totalBudget.toLocaleString('ko-KR')}원`],
    ['대관료', formatRange(rentRange)],
    ['식대 (1인)', formatRange(foodRange)],
    ['예상 하객', `${guestCount}명`],
  ];
  return (
    <div className="bg-cream rounded-2xl p-4 space-y-2">
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between text-sm">
          <span className="text-charcoal/60">{k}</span>
          <span className="font-bold text-charcoal">{v}</span>
        </div>
      ))}
    </div>
  );
}

