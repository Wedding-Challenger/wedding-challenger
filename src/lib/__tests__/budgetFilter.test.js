import { describe, expect, it } from 'vitest';
import { budgetFilter, hallMinTotal, rangeMatches } from '../halls';
import { cleanRange, filterSummary, formatMan, formatRange, sameRange } from '../budgetPresets';

const hall = (id, food, rent, { deco = [0, 0], disclosed = true } = {}) => ({
  id,
  name: `홀${id}`,
  location: '서울 강남구',
  rentDisclosed: disclosed,
  priceBreakdown: {
    food: { min: food[0], max: food[1] },
    rent: { min: rent[0], max: rent[1] },
    deco: { min: deco[0], max: deco[1] },
  },
});

describe('rangeMatches (엄격: 범위 안에 완전히 포함)', () => {
  const user = { min: 70000, max: 90000 };
  it('완전히 포함되면 통과, 경계값 일치도 통과', () => {
    expect(rangeMatches({ min: 75000, max: 85000 }, user)).toBe(true);
    expect(rangeMatches({ min: 70000, max: 90000 }, user)).toBe(true);
  });
  it('일부만 겹치면 제외', () => {
    expect(rangeMatches({ min: 80000, max: 120000 }, user)).toBe(false);
    expect(rangeMatches({ min: 60000, max: 75000 }, user)).toBe(false);
  });
  it('완전히 벗어나면 제외', () => {
    expect(rangeMatches({ min: 95000, max: 100000 }, user)).toBe(false);
  });
  it('한쪽 제한 없음 / 상관없음(null)', () => {
    expect(rangeMatches({ min: 150000, max: 200000 }, { min: 120000, max: null })).toBe(true);
    expect(rangeMatches({ min: 40000, max: 48000 }, { min: null, max: 50000 })).toBe(true);
    expect(rangeMatches({ min: 40000, max: 55000 }, { min: null, max: 50000 })).toBe(false);
    expect(rangeMatches({ min: 1, max: 999999 }, null)).toBe(true);
  });
  it('max 가 없으면 min 과 같다고 본다', () => {
    expect(rangeMatches({ min: 80000, max: null }, user)).toBe(true);
  });
  it("mode 'overlap' 대안은 겹치기만 하면 통과", () => {
    expect(rangeMatches({ min: 80000, max: 120000 }, user, 'overlap')).toBe(true);
    expect(rangeMatches({ min: 95000, max: 100000 }, user, 'overlap')).toBe(false);
  });
});

describe('budgetFilter', () => {
  const halls = [
    hall(1, [60000, 65000], [3000000, 5000000]), // 식대 5~7만·대관료 300~700만 안
    hall(2, [60000, 80000], [3000000, 5000000]), // 식대 일부 초과
    hall(3, [60000, 65000], [0, 0]), // 대관료 무료 → 300~700만 밖
    hall(4, [60000, 65000], [0, 0], { disclosed: false }), // 대관료 미공개 → 대관료 조건 무시
    hall(5, [120000, 150000], [8000000, 9000000]),
  ];
  const opts = { guestCount: 200, foodRange: { min: 50000, max: 70000 }, rentRange: { min: 3000000, max: 7000000 } };

  it('식대·대관료 엄격 판정, 미공개 대관료는 통과', () => {
    const { passed, excludedBy } = budgetFilter(halls, opts);
    expect(passed.map((h) => h.id)).toEqual([1, 4]);
    expect(excludedBy).toEqual({ total: 0, rent: 2, food: 2 });
  });

  it('대관료 무료(0원)는 무료 구간에 포함', () => {
    const { passed } = budgetFilter(halls, { ...opts, rentRange: { min: 0, max: 3000000 } });
    expect(passed.map((h) => h.id)).toEqual([3, 4]);
  });

  it('상관없음이면 아무것도 거르지 않는다', () => {
    expect(budgetFilter(halls, { guestCount: 200 }).passed).toHaveLength(5);
  });

  it('남은 예산보다 최소 총액이 크면 제외', () => {
    expect(hallMinTotal(halls[0], 200)).toBe(60000 * 200 + 3000000);
    const { passed, excludedBy } = budgetFilter(halls, { guestCount: 200, hallBudget: 15000000 });
    expect(passed.map((h) => h.id)).toEqual([1, 2, 3, 4]);
    expect(excludedBy.total).toBe(1);
  });

  it('남은 예산이 0 이하면 전부 제외', () => {
    const { passed, excludedBy } = budgetFilter(halls, { guestCount: 200, hallBudget: 0 });
    expect(passed).toEqual([]);
    expect(excludedBy.total).toBe(5);
  });
});

describe('budgetPresets 표시', () => {
  it('formatMan', () => {
    expect(formatMan(38000000)).toBe('3,800만');
    expect(formatMan(120000000)).toBe('1.2억');
    expect(formatMan(9500)).toBe('9,500원');
  });
  it('formatRange', () => {
    expect(formatRange(null)).toBe('상관없음');
    expect(formatRange({ min: 0, max: 3000000 })).toBe('무료~300만');
    expect(formatRange({ min: null, max: 50000 })).toBe('~5만');
    expect(formatRange({ min: 120000, max: null })).toBe('12만 이상');
    expect(formatRange({ min: 50000, max: 70000 })).toBe('5만~7만');
  });
  it('filterSummary', () => {
    expect(filterSummary({ foodRange: { min: 50000, max: 70000 }, rentRange: { min: 3000000, max: 7000000 }, hallBudget: 38000000 }))
      .toBe('⚙ 식대 5만~7만 · 대관료 300만~700만 · 남은 예산 3,800만');
    expect(filterSummary({ foodRange: null, rentRange: null, hallBudget: 0 })).toBe('⚙ 조건 없음 · 남은 예산 없음');
  });
  it('cleanRange / sameRange', () => {
    expect(cleanRange({ min: '', max: '' })).toBeNull();
    expect(cleanRange({ min: 90000, max: 70000 })).toEqual({ min: 70000, max: 90000 });
    expect(sameRange(null, undefined)).toBe(true);
    expect(sameRange({ min: 1, max: 2 }, { min: 1, max: 2 })).toBe(true);
    expect(sameRange({ min: 1, max: 2 }, null)).toBe(false);
  });
});
