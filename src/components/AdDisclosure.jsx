import { useEffect, useId, useReducer, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AD_LABEL, AD_LABEL_COLOR, AD_NOTICE, createHoverGrace, disclosureReducer, initialDisclosure, isDisclosureOpen, tooltipPosition,
} from '../lib/partnerDisclosure';

// 카드 오른쪽 아래 작은 「광고 ⓘ」(승인 G4, 쿠팡식). 「광고」는 항상 보이고, ⓘ 버튼은 마우스 hover·키보드 포커스·탭으로
// 안내 말풍선을 연다(Esc·포커스 이탈·다시 탭으로 닫힘). 링크 밖 형제 요소라 누르면 업체로 이동하지 않는다.
// 말풍선은 document.body 로 portal 한 fixed 요소라 마키 overflow·예산 내부 스크롤에 잘리지 않는다. 열 때 트리거 화면 좌표로
// 위치를 정하고, 스크롤·창 크기 변경이 있으면 닫는다(따라다니며 엉뚱한 곳을 가리키지 않게).
// 마우스는 트리거와 말풍선을 한 hover 영역으로 보고 사이 간격을 지나는 동안 150ms 유예한다.
// 상태 전이는 src/lib/partnerDisclosure.js. 말풍선은 열 때만 그린다(사전 렌더링 HTML 에는 버튼만).
// className 은 위치(카드 안에서는 absolute right·bottom)를 준다. 없으면 relative.
export default function AdDisclosure({ label = AD_LABEL, notice = AD_NOTICE, className = 'relative' }) {
  const [state, dispatch] = useReducer(disclosureReducer, initialDisclosure);
  const [position, setPosition] = useState(null);
  const anchorRef = useRef(null);
  const open = isDisclosureOpen(state);
  const tipId = useId();
  const [hover] = useState(() => createHoverGrace({
    onOpen: () => dispatch({ type: 'HOVER', value: true }),
    onClose: () => dispatch({ type: 'HOVER', value: false }),
  }));

  // 열 때마다 트리거 화면 좌표로 위치를 정한다
  const act = (action) => {
    const rect = anchorRef.current?.getBoundingClientRect();
    if (rect) setPosition(tooltipPosition(rect, { width: document.documentElement.clientWidth, height: window.innerHeight }));
    dispatch(action);
  };

  useEffect(() => () => hover.dispose(), [hover]);

  // 열린 동안: Esc(포커스가 어디 있든)로 닫고, 스크롤·리사이즈면 닫는다
  useEffect(() => {
    if (!open) return undefined;
    const close = () => {
      hover.dispose();
      dispatch({ type: 'ESCAPE' });
    };
    const onKey = (e) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', close, { capture: true, passive: true });
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', close, { capture: true });
      window.removeEventListener('resize', close);
    };
  }, [open, hover]);

  const onPointerEnter = (e) => {
    if (e.pointerType !== 'mouse') return;
    const rect = anchorRef.current?.getBoundingClientRect();
    if (rect && !open) setPosition(tooltipPosition(rect, { width: document.documentElement.clientWidth, height: window.innerHeight }));
    hover.enter();
  };
  const onPointerLeave = (e) => {
    if (e.pointerType === 'mouse') hover.leave();
  };

  return (
    <span ref={anchorRef} className={`inline-flex items-center gap-0.5 text-[11px] leading-none ${className}`} style={{ color: AD_LABEL_COLOR }}>
      <span aria-hidden="true">{label}</span>
      <button
        type="button"
        aria-label="광고 안내 보기"
        aria-expanded={open}
        aria-describedby={open ? tipId : undefined}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        onFocus={() => act({ type: 'FOCUS', value: true })}
        onBlur={() => dispatch({ type: 'FOCUS', value: false })}
        onClick={() => act({ type: 'TOGGLE' })}
        className="-m-1.5 p-1.5 rounded-full inline-flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-soft-gold"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <line x1="12" y1="11" x2="12" y2="16" />
          <circle cx="12" cy="7.5" r="0.8" fill="currentColor" />
        </svg>
      </button>
      {open && position && createPortal(
        <span
          id={tipId}
          role="tooltip"
          onPointerEnter={onPointerEnter}
          onPointerLeave={onPointerLeave}
          className="fixed z-[70] rounded-lg bg-charcoal px-3 py-2 text-xs leading-relaxed text-white shadow-lg text-left whitespace-normal"
          style={position}
        >
          {notice}
        </span>,
        document.body,
      )}
    </span>
  );
}
