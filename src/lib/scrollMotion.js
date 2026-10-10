// 사용자의 「움직임 줄이기」 설정에 맞춘 스크롤 이동 방식 (순수 함수).
// HorizontalScroll 화살표는 이 설정이면 부드러운 스크롤 없이 바로 이동한다(PartnerMarquee 는 src/lib/partnerMarquee.js).

export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export const scrollBehavior = (reducedMotion) => (reducedMotion ? 'auto' : 'smooth');

// 사전 렌더링(Node)·matchMedia 없는 환경은 false
export function prefersReducedMotion(win = globalThis.window) {
  try {
    return win?.matchMedia?.(REDUCED_MOTION_QUERY)?.matches === true;
  } catch {
    return false;
  }
}
