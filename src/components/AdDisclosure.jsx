import { useCallback, useEffect, useId, useReducer, useState } from 'react';
import { createPortal } from 'react-dom';
import { AD_LABEL, AD_LABEL_COLOR, AD_NOTICE, disclosureReducer, initialDisclosure, isDisclosureOpen } from '../lib/partnerDisclosure';
import { createDisclosureController } from '../lib/disclosureController';

// 카드 오른쪽 아래 작은 「광고 ⓘ」(승인 G4, 쿠팡식). 「광고」는 항상 보이고, ⓘ 버튼은 마우스 hover·키보드 포커스·탭으로
// 안내 말풍선을 연다(Esc·포커스 이탈·다시 탭으로 닫힘). 링크 밖 형제 요소라 누르면 업체로 이동하지 않는다.
// 말풍선은 document.body 로 portal 한 fixed 요소라 마키 overflow·예산 내부 스크롤에 잘리지 않는다. 열린 동안 매 프레임 트리거
// 좌표를 다시 재서(마키 transform 이동 포함) 따라가고, 스크롤(페이지·내부 스크롤)·창 크기 변경이면 닫는다.
// 마우스는 트리거와 말풍선을 한 hover 영역으로 보고 사이 간격을 지나는 동안 150ms 유예한다.
// 상태 전이·위치는 src/lib/partnerDisclosure.js, portal 대상·hover·Esc·재측정·정리는 src/lib/disclosureController.js.
// 말풍선은 열 때만 그린다(사전 렌더링 HTML 에는 버튼만).
// className 은 위치(카드 안에서는 absolute right·bottom)를 준다. 없으면 relative.
const UNMEASURED = { left: 0, top: 0, visibility: 'hidden' };

export default function AdDisclosure({ label = AD_LABEL, notice = AD_NOTICE, className = 'relative' }) {
  const [state, dispatch] = useReducer(disclosureReducer, initialDisclosure);
  const [position, setPosition] = useState(null);
  const open = isDisclosureOpen(state);
  const tipId = useId();
  const [controller] = useState(() => createDisclosureController({ dispatch, setPosition }));

  const anchorRef = useCallback((node) => controller.attachAnchor(node), [controller]);

  useEffect(() => (open ? controller.opened() : undefined), [open, controller]);
  useEffect(() => () => controller.dispose(), [controller]);

  return (
    <span ref={anchorRef} className={`inline-flex items-center gap-0.5 text-[11px] leading-none ${className}`} style={{ color: AD_LABEL_COLOR }}>
      <span aria-hidden="true">{label}</span>
      <button
        type="button"
        aria-label="광고 안내 보기"
        aria-expanded={open}
        aria-describedby={open ? tipId : undefined}
        {...controller.triggerProps}
        className="-m-1.5 p-1.5 rounded-full inline-flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-soft-gold"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <line x1="12" y1="11" x2="12" y2="16" />
          <circle cx="12" cy="7.5" r="0.8" fill="currentColor" />
        </svg>
      </button>
      {open && createPortal(
        <span
          id={tipId}
          role="tooltip"
          {...controller.tooltipProps}
          className="fixed z-[70] rounded-lg bg-charcoal px-3 py-2 text-xs leading-relaxed text-white shadow-lg text-left whitespace-normal"
          style={position ?? UNMEASURED}
        >
          {notice}
        </span>,
        controller.portalTarget(),
      )}
    </span>
  );
}
