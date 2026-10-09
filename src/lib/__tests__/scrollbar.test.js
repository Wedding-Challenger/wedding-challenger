import { describe, expect, it } from 'vitest';
import { MIN_THUMB_PCT, scrollFromThumbDrag, scrollFromTrackClick, thumbGeometry } from '../scrollbar';

describe('thumbGeometry', () => {
  it('넘치지 않으면 스크롤바 없음', () => {
    expect(thumbGeometry({ scrollLeft: 0, scrollWidth: 800, clientWidth: 800 })).toBeNull();
    expect(thumbGeometry({ scrollLeft: 0, scrollWidth: 800.5, clientWidth: 800 })).toBeNull();
  });
  it('보이는 비율만큼 썸 폭, 스크롤 위치만큼 왼쪽', () => {
    expect(thumbGeometry({ scrollLeft: 0, scrollWidth: 4000, clientWidth: 1000 })).toEqual({ width: 25, left: 0 });
    expect(thumbGeometry({ scrollLeft: 3000, scrollWidth: 4000, clientWidth: 1000 })).toEqual({ width: 25, left: 75 });
    expect(thumbGeometry({ scrollLeft: 1500, scrollWidth: 4000, clientWidth: 1000 })).toEqual({ width: 25, left: 37.5 });
  });
  it('카드가 아주 많아도 썸은 최소 폭 유지, 범위 밖 scrollLeft 는 잘라 냄', () => {
    const g = thumbGeometry({ scrollLeft: 99999, scrollWidth: 80000, clientWidth: 800 });
    expect(g.width).toBe(MIN_THUMB_PCT);
    expect(g.left).toBe(100 - MIN_THUMB_PCT);
  });
});

describe('scrollFromThumbDrag / scrollFromTrackClick', () => {
  const box = { scrollWidth: 4000, clientWidth: 1000 };
  it('썸을 움직일 수 있는 거리만큼 끌면 끝까지 간다', () => {
    // 트랙 400px, 썸 25% = 100px → 움직일 수 있는 거리 300px ↔ 스크롤 3000px
    expect(scrollFromThumbDrag({ ...box, startScrollLeft: 0, dx: 150, trackWidth: 400 })).toBe(1500);
    expect(scrollFromThumbDrag({ ...box, startScrollLeft: 0, dx: 9999, trackWidth: 400 })).toBe(3000);
    expect(scrollFromThumbDrag({ ...box, startScrollLeft: 1000, dx: -9999, trackWidth: 400 })).toBe(0);
  });
  it('트랙을 누른 지점에 썸 가운데가 온다', () => {
    expect(scrollFromTrackClick({ ...box, x: 200, trackWidth: 400 })).toBe(1500);
    expect(scrollFromTrackClick({ ...box, x: 0, trackWidth: 400 })).toBe(0);
    expect(scrollFromTrackClick({ ...box, x: 400, trackWidth: 400 })).toBe(3000);
  });
  it('넘치지 않으면 그대로', () => {
    expect(scrollFromThumbDrag({ scrollWidth: 800, clientWidth: 800, startScrollLeft: 0, dx: 50, trackWidth: 400 })).toBe(0);
    expect(scrollFromTrackClick({ scrollWidth: 800, clientWidth: 800, x: 100, trackWidth: 400 })).toBe(0);
  });
});
