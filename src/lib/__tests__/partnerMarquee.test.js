import { describe, expect, it } from 'vitest';
import {
  initialMarquee, isAnimatable, isRunning, marqueeReducer, revealOffset, rootHandlers, showToggle, toggleLabel, createToggleIntent,
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

describe('마키 루트 이벤트 연결 (리뷰 1판 5·2판 4)', () => {
  // 루트 = 정지·이전·다음 버튼 + 카드 영역. React onFocus 는 focusin 처럼 버블링하고 relatedTarget 을 준다.
  // 입력 방식(키보드·마우스·터치·보조기술·프로그램)과 무관하게 실제 포커스 진입이면 멈춘다.
  const toggle = { name: 'toggle', matches: () => false };
  const next = { name: 'next', matches: () => false };
  const card = { name: 'card', matches: () => false };
  const outside = { name: 'outside' };
  const root = { contains: (el) => el === toggle || el === next || el === card };
  const setup = () => {
    const actions = [];
    let state = initialMarquee();
    const dispatch = (a) => { actions.push(a); state = marqueeReducer(state, a); };
    return { actions, dispatch, h: rootHandlers(dispatch), state: () => state };
  };
  const focusEvent = (target, relatedTarget) => ({ target, relatedTarget, currentTarget: root });
  const pointer = (pointerType) => ({ pointerType });

  it('anyFocusEntryPauses — :focus-visible 이 아니어도(마우스·보조기술·프로그램 포커스) 루트 진입이면 멈춘다', () => {
    const { h, state } = setup();
    h.onFocus(focusEvent(toggle, outside));
    expect(isRunning(state(), true)).toBe(false);
    expect(toggleLabel(state())).toBe('재생');
  });

  it('focusFromNothingPauses — 처음 포커스(relatedTarget 없음)도 멈춘다', () => {
    const { h, state } = setup();
    h.onFocus(focusEvent(next, null));
    expect(isRunning(state(), true)).toBe(false);
  });

  it('mouseFocusThenPointerLeavesStaysPaused — 마우스로 버튼에 포커스만 두고 포인터가 나가도 재개하지 않는다', () => {
    const { h, state } = setup();
    h.onPointerEnter(pointer('mouse'));
    h.onFocus(focusEvent(toggle, outside));
    h.onPointerLeave(pointer('mouse'));
    expect(isRunning(state(), true)).toBe(false);
  });

  it('explicitPlayKeepsRunningWhileMovingInside — 재생을 누른 뒤 루트 안에서 포커스를 옮겨도 다시 멈추지 않는다', () => {
    const { h, actions } = setup();
    h.onFocus(focusEvent(toggle, outside));
    actions.length = 0;
    h.onFocus(focusEvent(next, toggle));
    expect(actions).toEqual([]);
  });

  it('touchStartOnRootPauses — 루트 어디든(제어 버튼 포함) 터치하면 멈추고, 터치 hover 는 무시', () => {
    const { h, state, actions } = setup();
    h.onPointerEnter(pointer('touch'));
    expect(actions).toEqual([]);
    h.onTouchStart();
    expect(isRunning(state(), true)).toBe(false);
  });

  it('mouseHoverPausesOnlyWhileHovering — 마우스 hover(제어 버튼 포함) 동안만 멈춘다', () => {
    const { h, state } = setup();
    h.onPointerEnter(pointer('mouse'));
    expect(isRunning(state(), true)).toBe(false);
    h.onPointerLeave(pointer('mouse'));
    expect(isRunning(state(), true)).toBe(true);
  });
});

describe('정지/재생 버튼 의도 (리뷰 2판 4)', () => {
  // 누른 순간(pointerdown) 화면에 보이던 버튼 의도를 기억해, 이어지는 포커스 정지와 상관없이 PAUSE/PLAY 를 보낸다
  const outside = { name: 'outside' };
  const toggle = { name: 'toggle' };
  const root = { contains: (el) => el === toggle };
  const focusIn = { target: toggle, relatedTarget: outside, currentTarget: root };

  function flow(initial) {
    let state = initial;
    const dispatch = (a) => { state = marqueeReducer(state, a); };
    const h = rootHandlers(dispatch);
    const intent = createToggleIntent();
    return { h, intent, dispatch, state: () => state };
  }

  it('mouseClickPauseStaysPaused — 마우스로 「일시정지」를 누르면 포커스 정지가 끼어도 정지', () => {
    const { h, intent, dispatch, state } = flow(initialMarquee());
    intent.pointerDown(state());
    h.onFocus(focusIn);
    dispatch(intent.click(state()));
    expect(isRunning(state(), true)).toBe(false);
    expect(toggleLabel(state())).toBe('재생');
  });

  it('mouseClickPlayPlays — 멈춘 상태에서 마우스로 「재생」을 누르면 재생', () => {
    const { h, intent, dispatch, state } = flow({ ...initialMarquee(), paused: true });
    intent.pointerDown(state());
    h.onFocus(focusIn);
    dispatch(intent.click(state()));
    expect(isRunning(state(), true)).toBe(true);
  });

  it('touchTapPlayPlays — 터치로 「재생」을 누르면 touchstart 정지가 끼어도 재생', () => {
    const { h, intent, dispatch, state } = flow({ ...initialMarquee(), paused: true });
    intent.pointerDown(state());
    h.onTouchStart();
    h.onFocus(focusIn);
    dispatch(intent.click(state()));
    expect(isRunning(state(), true)).toBe(true);
  });

  it('keyboardEnterUsesShownLabel — 키보드(Tab 진입 정지 뒤 Enter)는 보이는 「재생」대로 재생', () => {
    const { h, intent, dispatch, state } = flow(initialMarquee());
    h.onFocus(focusIn);
    expect(toggleLabel(state())).toBe('재생');
    dispatch(intent.click(state()));
    expect(isRunning(state(), true)).toBe(true);
    // 다음 Enter 는 일시정지
    dispatch(intent.click(state()));
    expect(isRunning(state(), true)).toBe(false);
  });

  it('intentIsUsedOnce — 기억한 의도는 한 번만 쓴다', () => {
    const { intent, state } = flow(initialMarquee());
    intent.pointerDown(state());
    expect(intent.click({ ...state(), paused: true })).toEqual({ type: 'PAUSE' });
    expect(intent.click({ ...state(), paused: true })).toEqual({ type: 'PLAY' });
  });
});
