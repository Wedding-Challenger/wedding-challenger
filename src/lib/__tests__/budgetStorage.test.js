import { afterEach, describe, expect, it, vi } from 'vitest';
import { BUDGET_STORAGE_KEY, loadBudget, saveBudget } from '../budgetStorage';

function memoryStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
}

afterEach(() => vi.unstubAllGlobals());

describe('budgetStorage', () => {
  it('저장한 온보딩 값을 그대로 읽는다', () => {
    vi.stubGlobal('localStorage', memoryStorage());
    saveBudget({ totalBudget: 70000000, guestCount: 150, onboardingComplete: true, rentRange: { min: 0, max: 3000000 }, foodRange: { min: 50000, max: 70000 } });
    expect(loadBudget()).toEqual({
      totalBudget: 70000000, guestCount: 150, onboardingComplete: true,
      rentRange: { min: 0, max: 3000000 }, foodRange: { min: 50000, max: 70000 },
    });
  });

  it('범위 필드가 없는 이전 형식은 상관없음(null)으로 읽는다', () => {
    const s = memoryStorage();
    vi.stubGlobal('localStorage', s);
    s.setItem(BUDGET_STORAGE_KEY, JSON.stringify({ totalBudget: 50000000, guestCount: 200, onboardingComplete: true }));
    expect(loadBudget()).toEqual({ totalBudget: 50000000, guestCount: 200, onboardingComplete: true, rentRange: null, foodRange: null });
  });

  it('깨진 범위 값은 정리한다 (음수·문자 → 제한 없음, min>max → 맞바꿈)', () => {
    const s = memoryStorage();
    vi.stubGlobal('localStorage', s);
    s.setItem(BUDGET_STORAGE_KEY, JSON.stringify({
      totalBudget: 50000000, guestCount: 200, onboardingComplete: true,
      rentRange: { min: 'x', max: -1 }, foodRange: { min: 90000, max: 70000 },
    }));
    expect(loadBudget()).toMatchObject({ rentRange: null, foodRange: { min: 70000, max: 90000 } });
  });

  it('없거나 깨진 값은 null', () => {
    const s = memoryStorage();
    vi.stubGlobal('localStorage', s);
    expect(loadBudget()).toBeNull();
    s.setItem(BUDGET_STORAGE_KEY, '{not json');
    expect(loadBudget()).toBeNull();
    s.setItem(BUDGET_STORAGE_KEY, JSON.stringify({ totalBudget: 0, guestCount: 200, onboardingComplete: true }));
    expect(loadBudget()).toBeNull();
  });

  it('localStorage 접근이 막혀도 던지지 않는다', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } });
    expect(loadBudget()).toBeNull();
    expect(() => saveBudget({ totalBudget: 1, guestCount: 1, onboardingComplete: false })).not.toThrow();
  });
});
