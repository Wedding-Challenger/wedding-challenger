// 계산기 돈 조건(전체 예산·대관료·식대·하객 수) 프리셋과 표시 형식.
// 대관료·식대 경계값은 참가격 웨딩홀 258곳 분포 기준 (planning/01-요구사항-돈기준-웨딩홀필터.md).
// 범위는 { min, max } — 각 값 null 이면 그쪽 제한 없음. 범위 자체가 null 이면 '상관없음'.

export const BUDGET_OPTIONS = [
  { label: '3,000만원 이하', value: 30000000 },
  { label: '3,000~5,000만원', value: 50000000 },
  { label: '5,000~7,000만원', value: 70000000 },
  { label: '7,000만원~1억', value: 100000000 },
  { label: '1억 이상', value: 150000000 },
];

export const GUEST_OPTIONS = [
  { label: '100명 이하', value: 100 },
  { label: '100~200명', value: 200 },
  { label: '200~300명', value: 300 },
  { label: '300명 이상', value: 400 },
];

export const RENT_PRESETS = [
  { label: '상관없음', value: null },
  { label: '무료~300만원', value: { min: 0, max: 3000000 } },
  { label: '300~700만원', value: { min: 3000000, max: 7000000 } },
  { label: '700~1,200만원', value: { min: 7000000, max: 12000000 } },
  { label: '1,200만원 이상', value: { min: 12000000, max: null } },
];

export const FOOD_PRESETS = [
  { label: '상관없음', value: null },
  { label: '5만원 이하', value: { min: null, max: 50000 } },
  { label: '5~7만원', value: { min: 50000, max: 70000 } },
  { label: '7~9만원', value: { min: 70000, max: 90000 } },
  { label: '9~12만원', value: { min: 90000, max: 120000 } },
  { label: '12만원 이상', value: { min: 120000, max: null } },
];

export const sameRange = (a, b) => (a ?? null) === (b ?? null) || (!!a && !!b && a.min === b.min && a.max === b.max);

// 저장값·입력값을 { min, max } | null 로 정리. 둘 다 비면 '상관없음'(null), min > max 면 맞바꾼다
export function cleanRange(r) {
  if (!r || typeof r !== 'object') return null;
  const num = (v) => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) || Number(v) < 0 ? null : Number(v));
  let min = num(r.min);
  let max = num(r.max);
  if (min === null && max === null) return null;
  if (min !== null && max !== null && min > max) [min, max] = [max, min];
  return { min, max };
}

// 3800만, 1.2억, 9,500원
export function formatMan(n) {
  if (n === null || n === undefined) return '';
  if (Math.abs(n) >= 100000000) return `${+(n / 100000000).toFixed(1)}억`;
  if (Math.abs(n) >= 10000) return `${Math.round(n / 10000).toLocaleString('ko-KR')}만`;
  return `${n.toLocaleString('ko-KR')}원`;
}

// { min: 0, max: 3000000 } → '무료~300만', { min: null, max: 50000 } → '~5만', { min: 120000, max: null } → '12만 이상'
export function formatRange(r) {
  if (!r) return '상관없음';
  const lo = r.min === 0 ? '무료' : formatMan(r.min);
  if (r.min === null || r.min === undefined) return `~${formatMan(r.max)}`;
  if (r.max === null || r.max === undefined) return `${lo} 이상`;
  return `${lo}~${formatMan(r.max)}`;
}

// 조건 칩 요약: '⚙ 식대 5~7만 · 대관료 300~700만 · 남은 예산 3,800만'
export function filterSummary({ foodRange, rentRange, hallBudget }) {
  const parts = [];
  if (foodRange) parts.push(`식대 ${formatRange(foodRange)}`);
  if (rentRange) parts.push(`대관료 ${formatRange(rentRange)}`);
  if (parts.length === 0) parts.push('조건 없음');
  parts.push(hallBudget > 0 ? `남은 예산 ${formatMan(hallBudget)}` : '남은 예산 없음');
  return `⚙ ${parts.join(' · ')}`;
}
