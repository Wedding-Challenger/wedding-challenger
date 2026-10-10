import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDisclosureController } from '../disclosureController';
import { disclosureReducer, initialDisclosure, isDisclosureOpen, tooltipPosition } from '../partnerDisclosure';

// 광고 ⓘ 말풍선 컨트롤러(리뷰 2판 지적 2·3). AdDisclosure 가 portal 대상·hover 유예·Esc·스크롤/리사이즈 닫기·
// 열린 동안 앵커 재측정·언마운트 정리를 모두 이 모듈에 맡긴다. DOM 대신 가짜 document·window·rAF 를 주입한다.
function fakeEnv() {
  const listeners = new Map(); // `${target}:${type}` → Set
  const add = (target) => (type, fn) => {
    const key = `${target}:${type}`;
    if (!listeners.has(key)) listeners.set(key, new Set());
    listeners.get(key).add(fn);
  };
  const remove = (target) => (type, fn) => listeners.get(`${target}:${type}`)?.delete(fn);
  const frames = new Map();
  let nextFrame = 1;
  const body = { tag: 'body' };
  return {
    body,
    listeners,
    count: () => [...listeners.values()].reduce((n, set) => n + set.size, 0) + frames.size,
    fire: (target, type, event = {}) => [...(listeners.get(`${target}:${type}`) ?? [])].forEach((fn) => fn(event)),
    frame: (t = 16) => {
      const due = [...frames.values()];
      frames.clear();
      due.forEach((fn) => fn(t));
    },
    env: {
      document: { body, documentElement: { clientWidth: 390 }, addEventListener: add('document'), removeEventListener: remove('document') },
      window: { innerHeight: 780, addEventListener: add('window'), removeEventListener: remove('window') },
      requestAnimationFrame: (fn) => {
        const id = nextFrame++;
        frames.set(id, fn);
        return id;
      },
      cancelAnimationFrame: (id) => frames.delete(id),
    },
  };
}

const VP = { width: 390, height: 780 };
const rectAt = (left, top) => ({ left, right: left + 30, top, bottom: top + 16 });

let fake;
let state;
let positions;
let anchor;
let controller;

function setup() {
  fake = fakeEnv();
  state = initialDisclosure;
  positions = [];
  anchor = { rect: rectAt(300, 500), getBoundingClientRect: () => anchor.rect };
  controller = createDisclosureController({
    dispatch: (action) => { state = disclosureReducer(state, action); },
    setPosition: (p) => positions.push(p),
    env: fake.env,
  });
  controller.attachAnchor(anchor);
}

const mouse = { pointerType: 'mouse' };

beforeEach(() => {
  vi.useFakeTimers();
  setup();
});
afterEach(() => vi.useRealTimers());

describe('광고 ⓘ 말풍선 컨트롤러', () => {
  it('portalTargetIsBody — 말풍선은 document.body 로 portal', () => {
    expect(controller.portalTarget()).toBe(fake.body);
  });

  it('hoverMovesTriggerToTooltip — 트리거를 떠나 유예 안에 말풍선에 들어가면 열린 채, 말풍선을 떠나면 닫힘', () => {
    controller.triggerProps.onPointerEnter(mouse);
    expect(isDisclosureOpen(state)).toBe(true);
    expect(positions.at(-1)).toEqual(tooltipPosition(rectAt(300, 500), VP));
    controller.triggerProps.onPointerLeave(mouse);
    vi.advanceTimersByTime(100);
    controller.tooltipProps.onPointerEnter(mouse);
    vi.advanceTimersByTime(500);
    expect(isDisclosureOpen(state)).toBe(true);
    controller.tooltipProps.onPointerLeave(mouse);
    vi.advanceTimersByTime(150);
    expect(isDisclosureOpen(state)).toBe(false);
  });

  it('touchPointerIgnoredForHover — 터치 pointerenter 는 hover 로 열지 않는다(탭은 click 으로)', () => {
    controller.triggerProps.onPointerEnter({ pointerType: 'touch' });
    expect(isDisclosureOpen(state)).toBe(false);
    controller.triggerProps.onClick();
    expect(state.pinned).toBe(true);
  });

  it('escapeClosesWhileOpen — 열린 동안 document Esc 로 닫고, 닫힌 뒤 리스너를 떼면 Esc 가 남지 않는다', () => {
    controller.triggerProps.onFocus();
    const detach = controller.opened();
    fake.fire('document', 'keydown', { key: 'Enter' });
    expect(isDisclosureOpen(state)).toBe(true);
    fake.fire('document', 'keydown', { key: 'Escape' });
    expect(isDisclosureOpen(state)).toBe(false);
    detach();
    expect(fake.count()).toBe(0);
  });

  it('scrollOrResizeCloses — 스크롤(페이지·내부 스크롤)·창 크기 변경이면 닫는다', () => {
    controller.triggerProps.onClick();
    controller.opened();
    fake.fire('window', 'scroll');
    expect(isDisclosureOpen(state)).toBe(false);
    controller.triggerProps.onClick();
    fake.fire('window', 'resize');
    expect(isDisclosureOpen(state)).toBe(false);
  });

  it('remeasuresAnchorEveryFrameWhileOpen — 포커스로 연 뒤 부모가 카드를 옮기면(transform) 다음 프레임에 새 좌표', () => {
    // Shift+Tab 으로 가려진 카드의 ⓘ 에 포커스: 트리거 onFocus 때는 이동 전 좌표(화면 밖 왼쪽)
    anchor.rect = rectAt(-200, 500);
    controller.triggerProps.onFocus();
    controller.opened();
    expect(positions.at(-1)).toEqual(tooltipPosition(rectAt(-200, 500), VP));
    // 같은 focus 이벤트가 버블링해 PartnerMarquee 가 FOCUS_ITEM 으로 트랙을 민다 → 앵커가 화면 안으로
    anchor.rect = rectAt(120, 500);
    fake.frame();
    expect(positions.at(-1)).toEqual(tooltipPosition(rectAt(120, 500), VP));
    // 위치가 그대로면 다시 setPosition 하지 않는다(렌더 낭비 없음)
    const n = positions.length;
    fake.frame();
    expect(positions).toHaveLength(n);
  });

  it('noAnchorNoPosition — 앵커가 떨어졌으면(언마운트 중) 재지 않는다', () => {
    controller.attachAnchor(null);
    controller.triggerProps.onFocus();
    expect(positions).toHaveLength(0);
    expect(isDisclosureOpen(state)).toBe(true);
  });

  it('closeStopsFrameLoop — 닫히면(detach) 프레임 재측정도 멈춘다', () => {
    controller.triggerProps.onFocus();
    const detach = controller.opened();
    detach();
    anchor.rect = rectAt(10, 10);
    const n = positions.length;
    fake.frame();
    expect(positions).toHaveLength(n);
  });

  it('disposeCleansEverything — 언마운트(dispose)면 리스너·프레임·hover 유예 타이머를 모두 정리', () => {
    const dispatch = vi.fn();
    const c = createDisclosureController({ dispatch, setPosition: () => {}, env: fake.env });
    c.attachAnchor(anchor);
    c.triggerProps.onPointerEnter(mouse);
    c.opened();
    c.triggerProps.onPointerLeave(mouse); // 유예 타이머 진행 중
    expect(fake.count()).toBeGreaterThan(0);
    c.dispose();
    expect(fake.count()).toBe(0);
    dispatch.mockClear();
    vi.advanceTimersByTime(1000);
    fake.fire('document', 'keydown', { key: 'Escape' });
    expect(dispatch).not.toHaveBeenCalled();
  });
});
