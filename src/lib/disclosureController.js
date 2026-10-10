import { createHoverGrace, tooltipPosition } from './partnerDisclosure';

// 광고 ⓘ 말풍선의 DOM 연결(src/components/AdDisclosure.jsx 가 이것만 쓴다). 상태 전이·위치 계산은 partnerDisclosure.js.
// - portal 대상: document.body (마키 overflow-hidden·예산 내부 스크롤에 잘리지 않게 fixed 로 띄운다)
// - 마우스는 트리거와 말풍선을 한 hover 영역으로 보고 사이 간격을 지나는 동안 유예한다(createHoverGrace). 터치는 click 으로만.
// - 열린 동안(opened → 돌려준 detach 까지): Esc(포커스가 어디 있든)·스크롤(페이지·예산 내부 스크롤 모두, capture)·창 크기
//   변경이면 닫고(잘린 앵커 밖에 떠 있지 않게), 매 프레임 앵커 좌표를 다시 재서 바뀌었을 때만 setPosition 한다. 트리거 onFocus 가
//   버블링해 부모(PartnerMarquee)가 카드를 transform 으로 옮겨도 다음 프레임에 옮겨진 위치를 가리킨다(Shift+Tab 으로 가려진
//   카드의 ⓘ 에 들어오는 경우).
// - attachAnchor: 트리거 묶음(「광고 ⓘ」 span)의 ref 콜백. 좌표는 이 요소에서 잰다.
// - dispose: 언마운트 때 리스너·프레임·hover 유예 타이머를 모두 정리한다.
// env 는 document·window·requestAnimationFrame·cancelAnimationFrame 을 가진 객체(테스트는 가짜를 주입). 호출 때 읽으므로
// 사전 렌더링(Node)에서 만들어도 된다.
const samePosition = (a, b) =>
  a != null && a.left === b.left && a.width === b.width && a.top === b.top && a.bottom === b.bottom;

export function createDisclosureController({ dispatch, setPosition, env = globalThis }) {
  let anchor = null;
  let last = null;
  let detach = null;

  const measure = () => {
    const rect = anchor?.getBoundingClientRect();
    if (!rect) return;
    const next = tooltipPosition(rect, { width: env.document.documentElement.clientWidth, height: env.window.innerHeight });
    if (samePosition(last, next)) return;
    last = next;
    setPosition(next);
  };

  const hover = createHoverGrace({
    onOpen: () => dispatch({ type: 'HOVER', value: true }),
    onClose: () => dispatch({ type: 'HOVER', value: false }),
  });

  const act = (action) => {
    measure();
    dispatch(action);
  };

  const onPointerEnter = (e) => {
    if (e.pointerType !== 'mouse') return;
    measure();
    hover.enter();
  };
  const onPointerLeave = (e) => {
    if (e.pointerType === 'mouse') hover.leave();
  };

  return {
    attachAnchor: (node) => {
      anchor = node;
    },
    portalTarget: () => env.document.body,
    triggerProps: {
      onPointerEnter,
      onPointerLeave,
      onFocus: () => act({ type: 'FOCUS', value: true }),
      onBlur: () => dispatch({ type: 'FOCUS', value: false }),
      onClick: () => act({ type: 'TOGGLE' }),
    },
    tooltipProps: { onPointerEnter, onPointerLeave },
    // 열릴 때 부른다. 돌려준 함수로(닫힘·언마운트) 정리한다
    opened() {
      detach?.();
      const { document, window } = env;
      const close = () => {
        hover.dispose();
        dispatch({ type: 'ESCAPE' });
      };
      const onKey = (e) => {
        if (e.key === 'Escape') close();
      };
      let frame = 0;
      const tick = () => {
        measure();
        frame = env.requestAnimationFrame(tick);
      };
      document.addEventListener('keydown', onKey);
      window.addEventListener('scroll', close, { capture: true, passive: true });
      window.addEventListener('resize', close);
      frame = env.requestAnimationFrame(tick);
      const mine = () => {
        document.removeEventListener('keydown', onKey);
        window.removeEventListener('scroll', close, { capture: true });
        window.removeEventListener('resize', close);
        env.cancelAnimationFrame(frame);
        if (detach === mine) detach = null;
      };
      detach = mine;
      return mine;
    },
    dispose() {
      hover.dispose();
      detach?.();
    },
  };
}
