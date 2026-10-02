// 온보딩 결과(예산·하객 수·완료 여부)를 localStorage 에 보관. 저장 불가(사생활 보호 모드 등)면 이번 방문에만 유지.
export const BUDGET_STORAGE_KEY = 'wc-budget';

export function loadBudget() {
  try {
    const v = JSON.parse(localStorage.getItem(BUDGET_STORAGE_KEY));
    if (!v || typeof v !== 'object') return null;
    const totalBudget = Number(v.totalBudget);
    const guestCount = Number(v.guestCount);
    if (!(totalBudget > 0) || !(guestCount > 0)) return null;
    return { totalBudget, guestCount, onboardingComplete: v.onboardingComplete === true };
  } catch {
    return null;
  }
}

export function saveBudget({ totalBudget, guestCount, onboardingComplete }) {
  try {
    localStorage.setItem(BUDGET_STORAGE_KEY, JSON.stringify({ totalBudget, guestCount, onboardingComplete }));
  } catch {
    // 저장 불가 — 무시
  }
}
