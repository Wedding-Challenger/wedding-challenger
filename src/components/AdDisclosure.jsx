import { useId, useReducer, useRef, useState } from 'react';
import {
  AD_LABEL, AD_LABEL_COLOR, AD_NOTICE, TOOLTIP_WIDTH, disclosureReducer, initialDisclosure, isDisclosureOpen, tooltipAlign,
} from '../lib/partnerDisclosure';

// 카드 오른쪽 아래 작은 「광고 ⓘ」(승인 G4, 쿠팡식). 「광고」는 항상 보이고, ⓘ 버튼은 마우스 hover·키보드 포커스·탭으로
// 안내 말풍선을 연다(Esc·포커스 이탈·다시 탭으로 닫힘). 링크 밖 형제 요소라 누르면 업체로 이동하지 않는다.
// 상태 전이는 src/lib/partnerDisclosure.js. 말풍선은 열 때만 그린다(사전 렌더링 HTML 에는 버튼만).
// className 은 위치(카드 안에서는 absolute right·bottom)를 준다. 없으면 relative — 말풍선의 기준 상자가 된다.
export default function AdDisclosure({ label = AD_LABEL, notice = AD_NOTICE, className = 'relative' }) {
  const [state, dispatch] = useReducer(disclosureReducer, initialDisclosure);
  const [align, setAlign] = useState({ side: 'right', shift: 0 });
  const anchorRef = useRef(null);
  const open = isDisclosureOpen(state);
  const tipId = useId();

  // 열 때마다 화면 안에 들어가는 쪽으로 정한다(카드가 화면 왼쪽 끝에 걸친 마키 등)
  const act = (action) => {
    const rect = anchorRef.current?.getBoundingClientRect();
    if (rect) setAlign(tooltipAlign(rect, document.documentElement.clientWidth));
    dispatch(action);
  };

  return (
    <span ref={anchorRef} className={`inline-flex items-center gap-0.5 text-[11px] leading-none ${className}`} style={{ color: AD_LABEL_COLOR }}>
      <span aria-hidden="true">{label}</span>
      <button
        type="button"
        aria-label="광고 안내 보기"
        aria-expanded={open}
        aria-describedby={open ? tipId : undefined}
        onPointerEnter={(e) => e.pointerType === 'mouse' && act({ type: 'HOVER', value: true })}
        onPointerLeave={(e) => e.pointerType === 'mouse' && dispatch({ type: 'HOVER', value: false })}
        onFocus={() => act({ type: 'FOCUS', value: true })}
        onBlur={() => dispatch({ type: 'FOCUS', value: false })}
        onClick={() => act({ type: 'TOGGLE' })}
        onKeyDown={(e) => e.key === 'Escape' && dispatch({ type: 'ESCAPE' })}
        className="-m-1.5 p-1.5 rounded-full inline-flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-soft-gold"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <line x1="12" y1="11" x2="12" y2="16" />
          <circle cx="12" cy="7.5" r="0.8" fill="currentColor" />
        </svg>
      </button>
      {open && (
        <span
          id={tipId}
          role="tooltip"
          className="absolute bottom-full mb-2 z-20 max-w-[calc(100vw-1rem)] rounded-lg bg-charcoal px-3 py-2 text-xs leading-relaxed text-white shadow-lg text-left whitespace-normal"
          style={{ width: TOOLTIP_WIDTH, ...(align.side === 'right' ? { right: 0 } : { left: align.shift }) }}
        >
          {notice}
        </span>
      )}
    </span>
  );
}
