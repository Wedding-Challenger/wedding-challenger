// 홈 제휴 업체 마키(PartnerMarquee)의 재생 상태 전이와 위치 계산 (순수 함수·reducer).
// 위치 offset 은 트랙을 왼쪽으로 민 px(0 ≤ offset < loopWidth). loopWidth 는 원본 카드 한 벌 + 간격의 폭이다.
// - 넘칠 때(카드 2개 이상·한 화면을 넘음)만 움직인다. 아니면 정지 목록.
// - 움직임 줄이기: 처음부터 정지·재생 버튼 없음. 실행 중 켜지면 즉시 멈추고, 꺼져도 사용자가 재생해야 움직인다.
// - hover·탭 숨김은 그동안만 멈춘다. 포커스·터치·이전/다음·직접 정지는 명시적 재생 전까지 멈춘다.
// - hover·포커스는 제어 버튼을 포함한 마키 루트 기준이다(rootHandlers). 키보드 포커스가 루트 밖에서 들어올 때만 멈추고,
//   루트 안에서 옮기거나 밖으로 나가도 재생하지 않는다.

export const MARQUEE_SPEED = 30; // px/s, 완만한 이동

export const initialMarquee = ({ reducedMotion = false } = {}) => ({
  paused: reducedMotion,
  hover: false,
  hidden: false,
  reducedMotion,
  offset: 0,
});

const wrap = (x, loopWidth) => (loopWidth > 0 ? ((x % loopWidth) + loopWidth) % loopWidth : 0);

export const isAnimatable = ({ count, contentWidth, viewportWidth }) => count > 1 && contentWidth > viewportWidth + 1;

export const isRunning = (s, animatable) => animatable && !s.paused && !s.hover && !s.hidden && !s.reducedMotion;

export const showToggle = (s, animatable) => animatable && !s.reducedMotion;

// 정지 버튼 이름: 지금 사용자가 멈춘 상태면 「재생」, 아니면 「일시정지」(hover 로 잠시 멈춘 동안에도 일시정지)
export const toggleLabel = (s) => (s.paused ? '재생' : '일시정지');

// 포커스 받은 카드가 화면에 다 보이면 그대로, 가려지면 그 카드가 왼쪽 끝에 오게
export function revealOffset({ offset, itemStart, itemWidth, viewportWidth }) {
  const visible = itemStart >= offset && itemStart + itemWidth <= offset + viewportWidth;
  return visible ? offset : itemStart;
}

export function marqueeReducer(s, action) {
  switch (action.type) {
    case 'PLAY':
      return s.reducedMotion ? s : { ...s, paused: false };
    case 'PAUSE':
      return { ...s, paused: true };
    case 'TOGGLE':
      return s.paused ? marqueeReducer(s, { type: 'PLAY' }) : { ...s, paused: true };
    case 'HOVER':
      return { ...s, hover: action.value };
    case 'VISIBILITY':
      return { ...s, hidden: action.hidden };
    case 'REDUCED_MOTION':
      return action.value ? { ...s, reducedMotion: true, paused: true } : { ...s, reducedMotion: false };
    case 'FOCUS_ENTER':
      return { ...s, paused: true };
    case 'FOCUS_ITEM':
      return { ...s, paused: true, offset: wrap(action.offset, action.loopWidth) };
    case 'TOUCH':
      return { ...s, paused: true };
    case 'DRAG':
      return { ...s, paused: true, offset: wrap(s.offset + action.delta, action.loopWidth) };
    case 'STEP':
      return { ...s, paused: true, offset: wrap(s.offset + action.direction * action.step, action.loopWidth) };
    case 'TICK':
      if (!isRunning(s, action.animatable)) return s;
      return { ...s, offset: wrap(s.offset + (action.speed * action.dt) / 1000, action.loopWidth) };
    case 'RESET':
      return { ...s, offset: 0 };
    default:
      return s;
  }
}

// 마키 루트(정지·이전·다음 버튼 + 카드 영역)에 붙이는 이벤트. React onFocus/onBlur 는 버블링하고 relatedTarget 을 준다.
// relatedTarget 이 루트 안이면 루트 안에서 포커스가 옮겨진 것이다.
// 포커스 진입 정지는 키보드 포커스(:focus-visible)만 본다. 마우스는 루트 hover 가 이미 멈추고,
// 마우스 클릭 포커스까지 멈추게 하면 「일시정지」 클릭이 포커스 정지 뒤 TOGGLE 로 재생으로 뒤집힌다.
const isKeyboardFocus = (el) => {
  try {
    return el.matches(':focus-visible');
  } catch {
    return true;
  }
};

export function rootHandlers(dispatch) {
  const fromOutside = (e) => !e.relatedTarget || !e.currentTarget.contains(e.relatedTarget);
  return {
    onFocus: (e) => {
      if (fromOutside(e) && isKeyboardFocus(e.target)) dispatch({ type: 'FOCUS_ENTER' });
    },
    // 루트 밖으로 나가도 재생하지 않는다(사용자의 재생 버튼을 기다린다)
    onBlur: () => {},
    onMouseEnter: () => dispatch({ type: 'HOVER', value: true }),
    onMouseLeave: () => dispatch({ type: 'HOVER', value: false }),
  };
}
