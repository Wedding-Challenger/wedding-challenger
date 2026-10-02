// 온보딩 결과(예산·하객 수·대관료·식대 범위·완료 여부)를 localStorage 에 보관. 저장 불가(사생활 보호 모드 등)면 이번 방문에만 유지.
// 범위 필드가 없던 이전 형식은 '상관없음'(null)으로 읽는다.
import { cleanRange } from './budgetPresets';

export const BUDGET_STORAGE_KEY = 'wc-budget';

export function loadBudget() {
  try {
    const v = JSON.parse(localStorage.getItem(BUDGET_STORAGE_KEY));
    if (!v || typeof v !== 'object') return null;
    const totalBudget = Number(v.totalBudget);
    const guestCount = Number(v.guestCount);
    if (!(totalBudget > 0) || !(guestCount > 0)) return null;
    return {
      totalBudget,
      guestCount,
      onboardingComplete: v.onboardingComplete === true,
      rentRange: cleanRange(v.rentRange),
      foodRange: cleanRange(v.foodRange),
    };
  } catch {
    return null;
  }
}

export function saveBudget({ totalBudget, guestCount, onboardingComplete, rentRange = null, foodRange = null }) {
  try {
    localStorage.setItem(BUDGET_STORAGE_KEY, JSON.stringify({ totalBudget, guestCount, onboardingComplete, rentRange, foodRange }));
  } catch {
    // 저장 불가 — 무시
  }
}
