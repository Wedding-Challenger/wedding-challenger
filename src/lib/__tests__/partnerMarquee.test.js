import { describe, expect, it } from 'vitest';
import {
  initialMarquee, isAnimatable, isRunning, marqueeReducer, revealOffset, showToggle, toggleLabel,
} from '../partnerMarquee';

const run = (state, ...actions) => actions.reduce(marqueeReducer, state);
const LOOP = 1000;

describe('마키 재생 조건', () => {
  it('staticWhenOneItemOrFits — 1개이거나 한 화면에 다 들어가면 움직이지 않는다', () => {
    expect(isAnimatable({ count: 1, contentWidth: 2000, viewportWidth: 300 })).toBe(false);
    expect(isAnimatable({ count: 3, contentWidth: 800, viewportWidth: 1000 })).toBe(false);
    expect(isAnimatable({ count: 3, contentWidth: 1200, viewportWidth: 1000 })).toBe(true);
    const s = initialMarquee();
    expect(isRunning(s, false)).toBe(false);
    expect(showToggle(s, false)).toBe(false);
  });

  it('autoplaysWhenOverflowing — 넘치면 자동 재생, 정지 버튼 표시', () => {
    const s = initialMarquee();
    expect(isRunning(s, true)).toBe(true);
    expect(showToggle(s, true)).toBe(true);
    expect(toggleLabel(s)).toBe('일시정지');
  });

  it('reducedMotionStartsStoppedAndIgnoresPlay — 움직임 줄이기면 처음부터 정지, 재생도 하지 않는다', () => {
    const s = initialMarquee({ reducedMotion: true });
    expect(isRunning(s, true)).toBe(false);
    expect(showToggle(s, true)).toBe(false);
    expect(isRunning(run(s, { type: 'PLAY' }), true)).toBe(false);
  });

  it('reducedMotionChangeStopsImmediatelyAndStaysPaused — 실행 중 설정이 켜지면 즉시 멈추고, 꺼져도 명시 재생 전까지 정지', () => {
    const on = run(initialMarquee(), { type: 'REDUCED_MOTION', value: true });
    expect(isRunning(on, true)).toBe(false);
    const off = run(on, { type: 'REDUCED_MOTION', value: false });
    expect(isRunning(off, true)).toBe(false);
    expect(toggleLabel(off)).toBe('재생');
    expect(isRunning(run(off, { type: 'PLAY' }), true)).toBe(true);
  });

  it('hoverPausesOnlyWhileHovering — 마우스를 올린 동안만 멈춘다', () => {
    const hovered = run(initialMarquee(), { type: 'HOVER', value: true });
    expect(isRunning(hovered, true)).toBe(false);
    expect(isRunning(run(hovered, { type: 'HOVER', value: false }), true)).toBe(true);
  });

  it('focusPausesUntilExplicitPlay — 포커스로 멈추면 포커스가 나가도 재생 버튼을 기다린다', () => {
    const focused = run(initialMarquee(), { type: 'FOCUS_ITEM', offset: 300, loopWidth: LOOP });
    expect(isRunning(focused, true)).toBe(false);
    expect(focused.offset).toBe(300);
    expect(toggleLabel(focused)).toBe('재생');
    expect(isRunning(run(focused, { type: 'PLAY' }), true)).toBe(true);
  });

  it('touchPausesUntilExplicitPlay — 터치가 끝나도 재생은 명시적으로', () => {
    const touched = run(initialMarquee(), { type: 'TOUCH' }, { type: 'DRAG', delta: 40, loopWidth: LOOP });
    expect(isRunning(touched, true)).toBe(false);
    expect(touched.offset).toBe(40);
    expect(isRunning(run(touched, { type: 'HOVER', value: false }), true)).toBe(false);
  });

  it('hiddenTabPausesAndResumes — 탭이 숨으면 멈추고 돌아오면 이어 간다', () => {
    const hidden = run(initialMarquee(), { type: 'VISIBILITY', hidden: true });
    expect(isRunning(hidden, true)).toBe(false);
    expect(isRunning(run(hidden, { type: 'VISIBILITY', hidden: false }), true)).toBe(true);
  });

  it('userPauseIsNotReleasedByOtherEvents — 직접 정지는 hover·탭 복귀로 풀리지 않는다', () => {
    const paused = run(initialMarquee(), { type: 'TOGGLE' }, { type: 'HOVER', value: true }, { type: 'HOVER', value: false }, { type: 'VISIBILITY', hidden: false });
    expect(isRunning(paused, true)).toBe(false);
    expect(isRunning(run(paused, { type: 'TOGGLE' }), true)).toBe(true);
  });
});

describe('마키 위치', () => {
  it('tickAdvancesAndWrapsOnlyWhenRunning — 재생 중에만 움직이고 한 바퀴에서 이어 붙인다', () => {
    const s = initialMarquee();
    expect(run(s, { type: 'TICK', dt: 1000, speed: 30, loopWidth: LOOP, animatable: true }).offset).toBe(30);
    const near = { ...s, offset: 990 };
    expect(run(near, { type: 'TICK', dt: 1000, speed: 30, loopWidth: LOOP, animatable: true }).offset).toBe(20);
    const paused = run(s, { type: 'PAUSE' });
    expect(run(paused, { type: 'TICK', dt: 1000, speed: 30, loopWidth: LOOP, animatable: true })).toBe(paused);
    expect(run(s, { type: 'TICK', dt: 1000, speed: 30, loopWidth: LOOP, animatable: false })).toBe(s);
  });

  it('prevNextStepsAndSwitchesToManual — 이전·다음은 카드 한 칸씩, 수동 모드로', () => {
    const next = run(initialMarquee(), { type: 'STEP', direction: 1, step: 276, loopWidth: LOOP });
    expect(next.offset).toBe(276);
    expect(isRunning(next, true)).toBe(false);
    expect(run(initialMarquee(), { type: 'STEP', direction: -1, step: 276, loopWidth: LOOP }).offset).toBe(724);
  });

  it('resetOnListChangeKeepsUserChoice — 목록이 바뀌면 처음으로, 정지 선택은 유지', () => {
    const s = run(initialMarquee(), { type: 'STEP', direction: 1, step: 276, loopWidth: LOOP }, { type: 'RESET' });
    expect(s.offset).toBe(0);
    expect(isRunning(s, true)).toBe(false);
  });

  it('revealOffsetBringsFocusedCardIntoView — 포커스 카드가 보이면 그대로, 가려지면 그 카드로', () => {
    expect(revealOffset({ offset: 0, itemStart: 300, itemWidth: 260, viewportWidth: 1000 })).toBe(0);
    expect(revealOffset({ offset: 0, itemStart: 900, itemWidth: 260, viewportWidth: 1000 })).toBe(900);
    expect(revealOffset({ offset: 500, itemStart: 100, itemWidth: 260, viewportWidth: 1000 })).toBe(100);
  });
});
