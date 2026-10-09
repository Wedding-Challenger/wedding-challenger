import { describe, expect, it } from 'vitest';
import { prefersReducedMotion, REDUCED_MOTION_QUERY, scrollBehavior } from '../scrollMotion';

describe('HorizontalScroll 화살표 이동 방식', () => {
  it('reducedMotionUsesAuto — 움직임 줄이기면 auto, 아니면 smooth', () => {
    expect(scrollBehavior(true)).toBe('auto');
    expect(scrollBehavior(false)).toBe('smooth');
  });

  it('readsMatchMediaSafely — matchMedia 결과를 읽고, 없거나 실패하면 false', () => {
    const win = (matches) => ({ matchMedia: (q) => ({ matches: q === REDUCED_MOTION_QUERY && matches }) });
    expect(REDUCED_MOTION_QUERY).toBe('(prefers-reduced-motion: reduce)');
    expect(prefersReducedMotion(win(true))).toBe(true);
    expect(prefersReducedMotion(win(false))).toBe(false);
    expect(prefersReducedMotion(undefined)).toBe(false);
    expect(prefersReducedMotion({})).toBe(false);
    expect(prefersReducedMotion({ matchMedia: () => { throw new Error('x'); } })).toBe(false);
  });
});
