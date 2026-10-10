import { useEffect, useReducer, useRef, useState } from 'react';
import PartnerCard from './PartnerCard';
import {
  MARQUEE_SPEED, initialMarquee, isAnimatable, isRunning, marqueeReducer, revealOffset, rootHandlers, showToggle, toggleLabel, createToggleIntent,
} from '../lib/partnerMarquee';
import { REDUCED_MOTION_QUERY, prefersReducedMotion } from '../lib/scrollMotion';

const GAP = 16; // gap-4

// 홈 제휴 업체 줄의 자동 가로 이동. HorizontalScroll(scrollLeft·스크롤바)과 별개로 transform 트랙을 민다.
// 원본 카드 한 벌 뒤에 이어 붙이는 복제 한 벌은 aria-hidden + inert 라 Tab·클릭·접근성 트리에서 빠진다.
// 상태 전이는 src/lib/partnerMarquee.js. 첫 렌더(측정 전)는 복제·버튼 없는 정지 목록이다.
export default function PartnerMarquee({ items, label = '제휴 업체' }) {
  const viewportRef = useRef(null);
  const copyRef = useRef(null);
  const drag = useRef(null);
  const [geo, setGeo] = useState(null);
  const [state, dispatch] = useReducer(marqueeReducer, undefined, () => initialMarquee({ reducedMotion: prefersReducedMotion() }));

  // 목록이 바뀌면 처음 위치로(사용자의 정지 선택은 유지)
  const itemsKey = items.map((i) => i.placementId).join(',');
  const [shownKey, setShownKey] = useState(itemsKey);
  if (shownKey !== itemsKey) {
    setShownKey(itemsKey);
    dispatch({ type: 'RESET' });
  }

  const animatable = geo != null && isAnimatable({ count: items.length, contentWidth: geo.contentWidth, viewportWidth: geo.viewportWidth });
  const running = isRunning(state, animatable);

  // 보이는 폭·카드 한 벌 폭을 잰다(창 크기·목록이 바뀌면 다시)
  useEffect(() => {
    const viewport = viewportRef.current;
    const copy = copyRef.current;
    if (!viewport || !copy) return undefined;
    const measure = () => {
      const contentWidth = copy.scrollWidth;
      setGeo({
        viewportWidth: viewport.clientWidth,
        contentWidth,
        loopWidth: contentWidth + GAP,
        step: (copy.firstElementChild?.offsetWidth ?? 0) + GAP,
      });
    };
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(viewport);
    ro?.observe(copy);
    return () => ro?.disconnect();
  }, [itemsKey]);

  // 재생 중에만 프레임마다 민다
  useEffect(() => {
    if (!running || !geo) return undefined;
    let raf = 0;
    let last = performance.now();
    const frame = (t) => {
      dispatch({ type: 'TICK', dt: Math.min(t - last, 100), speed: MARQUEE_SPEED, loopWidth: geo.loopWidth, animatable: true });
      last = t;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [running, geo]);

  // 움직임 줄이기 설정이 실행 중 바뀌거나 탭이 숨으면 바로 반영
  useEffect(() => {
    const mq = window.matchMedia?.(REDUCED_MOTION_QUERY);
    const onMotion = (e) => dispatch({ type: 'REDUCED_MOTION', value: e.matches });
    const onVisibility = () => dispatch({ type: 'VISIBILITY', hidden: document.visibilityState === 'hidden' });
    mq?.addEventListener('change', onMotion);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      mq?.removeEventListener('change', onMotion);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  // 정지·이전·다음 버튼을 포함한 루트에서 hover·포커스 진입 시 멈춘다(재생은 버튼으로만)
  const root = rootHandlers(dispatch);
  const [toggleIntent] = useState(createToggleIntent);

  // 카드에 포커스가 오면 그 카드가 보이게 옮긴다(수동 모드). 포커스는 옮기지 않는다.
  const onCardFocus = (e) => {
    const viewport = viewportRef.current;
    if (viewport) viewport.scrollLeft = 0; // overflow 숨김 영역이 브라우저 포커스 스크롤로 밀리지 않게
    const card = e.target.closest?.('[data-marquee-item]');
    if (!animatable || !card) return;
    dispatch({
      type: 'FOCUS_ITEM',
      loopWidth: geo.loopWidth,
      offset: revealOffset({ offset: state.offset, itemStart: card.offsetLeft, itemWidth: card.offsetWidth, viewportWidth: geo.viewportWidth }),
    });
  };

  // 터치로 끌어 넘기기(세로 스크롤은 브라우저에 맡김). 손을 떼도 다시 재생하지 않는다.
  const onPointerDown = (e) => {
    if (e.pointerType !== 'touch' || !animatable) return;
    dispatch({ type: 'TOUCH' });
    drag.current = { x: e.clientX };
  };
  const onPointerMove = (e) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x;
    drag.current.x = e.clientX;
    dispatch({ type: 'DRAG', delta: -dx, loopWidth: geo.loopWidth });
  };
  const endDrag = () => {
    drag.current = null;
  };

  const step = (direction) => dispatch({ type: 'STEP', direction, step: geo.step, loopWidth: geo.loopWidth });

  const cards = (inert) =>
    items.map((item) => (
      <div key={item.placementId} data-marquee-item={inert ? undefined : ''} className="w-[260px] max-w-[calc(100vw-4rem)] shrink-0">
        <PartnerCard item={item} />
      </div>
    ));

  const control =
    'h-9 min-w-9 px-3 rounded-full bg-white border border-warm-beige/40 shadow-sm text-sm text-charcoal/70 hover:text-soft-gold hover:border-soft-gold/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-soft-gold/60 transition-colors';

  return (
    <div className="space-y-3" {...root}>
      {animatable && (
        <div className="flex justify-end gap-2">
          {/* 자동 이동 정지/재생이 이 줄의 첫 Tab 요소 */}
          {showToggle(state, animatable) && (
            <button
              type="button"
              onPointerDown={() => toggleIntent.pointerDown(state)}
              onClick={() => dispatch(toggleIntent.click(state))}
              aria-label={`${label} 자동 이동 ${toggleLabel(state)}`}
              className={control}
            >
              {state.paused ? '▶ 재생' : '❚❚ 일시정지'}
            </button>
          )}
          <button type="button" onClick={() => step(-1)} aria-label={`${label} 이전`} className={control}>‹</button>
          <button type="button" onClick={() => step(1)} aria-label={`${label} 다음`} className={control}>›</button>
        </div>
      )}
      <div
        ref={viewportRef}
        role="region"
        aria-label={label}
        className="overflow-hidden pb-2"
        style={{ touchAction: 'pan-y' }}
        onFocus={onCardFocus}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div
          className="flex gap-4 w-max"
          style={animatable ? { transform: `translate3d(${-state.offset}px, 0, 0)`, willChange: running ? 'transform' : undefined } : undefined}
        >
          <div ref={copyRef} className="relative flex gap-4 shrink-0">
            {cards(false)}
          </div>
          {animatable && (
            <div aria-hidden="true" inert className="flex gap-4 shrink-0">
              {cards(true)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
