import { describe, expect, it, vi } from 'vitest';
import {
  bannerRootMargin, createBannerObserver, initialOverlay, overlayReducer, overlayRootMargin, overlaySummary,
} from '../partnerOverlay';

// 가림 신호(계획서 §3.2 C8·D1): Onboarding 은 마운트/언마운트로 전체 화면 모달을 등록·해제하고,
// ConsentBanner 는 open=true 로 렌더된 배너 div ref 가 붙을 때 ResizeObserver 높이를 등록, 떨어지면 0 으로 해제한다.

// ResizeObserver 대역: observe 한 노드의 높이 변화를 손으로 흘려 보낸다
function fakeResizeObserver() {
  const instances = [];
  class RO {
    constructor(cb) {
      this.cb = cb;
      this.nodes = [];
      this.disconnected = false;
      instances.push(this);
    }
    observe(node) { this.nodes.push(node); }
    disconnect() { this.disconnected = true; this.nodes = []; }
    emit(height) { this.cb(this.nodes.map((n) => ({ target: n, contentRect: { height }, borderBoxSize: [{ blockSize: height }] }))); }
  }
  return { RO, instances };
}
const node = (height) => ({ getBoundingClientRect: () => ({ height }) });

describe('가림 신호 context 상태', () => {
  it('modalOwnersSuspendUntilAllUnregister — 소유자별 키로 등록·해제(StrictMode cleanup 뒤 잔여 0)', () => {
    let s = overlayReducer(initialOverlay, { type: 'MODAL_OPEN', owner: 'onboarding:1' });
    expect(overlaySummary(s)).toEqual({ suspended: true, bannerHeight: 0, headerHeight: 0 });
    // StrictMode: cleanup → 다시 effect
    s = overlayReducer(s, { type: 'MODAL_CLOSE', owner: 'onboarding:1' });
    s = overlayReducer(s, { type: 'MODAL_OPEN', owner: 'onboarding:1' });
    s = overlayReducer(s, { type: 'MODAL_CLOSE', owner: 'onboarding:1' });
    expect(overlaySummary(s)).toEqual({ suspended: false, bannerHeight: 0, headerHeight: 0 });
  });

  it('bannerHeightZeroUnregisters — 배너 높이 등록·변경·0 해제', () => {
    let s = overlayReducer(initialOverlay, { type: 'BANNER_HEIGHT', owner: 'banner:1', height: 120 });
    expect(overlaySummary(s)).toEqual({ suspended: false, bannerHeight: 120, headerHeight: 0 });
    s = overlayReducer(s, { type: 'BANNER_HEIGHT', owner: 'banner:1', height: 180 });
    expect(overlaySummary(s).bannerHeight).toBe(180);
    s = overlayReducer(s, { type: 'BANNER_HEIGHT', owner: 'banner:1', height: 0 });
    expect(s.banners).toEqual({});
    expect(overlaySummary(s).bannerHeight).toBe(0);
    // 배너는 모달이 아니다 — 전체 정지 없음
    expect(overlaySummary(overlayReducer(initialOverlay, { type: 'BANNER_HEIGHT', owner: 'b', height: 90 })).suspended).toBe(false);
  });

  it('rootMarginExcludesBannerClampedToViewport — rootMargin 아래쪽을 배너 높이만큼(뷰포트 높이까지) 줄인다', () => {
    expect(bannerRootMargin(0, 800)).toBe('0px 0px 0px 0px');
    expect(bannerRootMargin(132.4, 800)).toBe('0px 0px -133px 0px');
    expect(bannerRootMargin(5000, 800)).toBe('0px 0px -800px 0px');
    expect(bannerRootMargin(-5, 800)).toBe('0px 0px 0px 0px');
  });
});

describe('ConsentBanner 높이 등록(D1)', () => {
  it('closedMountThenOpenRegistersHeight — 닫힌 채 마운트 → 열림 → div ref 부착 시 높이 H 등록', () => {
    const { RO, instances } = fakeResizeObserver();
    const onHeight = vi.fn();
    const banner = createBannerObserver({ onHeight, ResizeObserverImpl: RO });
    // 닫힌 채 마운트: ref 가 붙지 않으니 아무것도 등록하지 않는다
    expect(onHeight).not.toHaveBeenCalled();
    expect(instances).toHaveLength(0);
    // 열림: open=true 로 렌더된 div 에 ref 부착
    banner.attach(node(140));
    expect(onHeight).toHaveBeenLastCalledWith(140);
    instances[0].emit(160);
    expect(onHeight).toHaveBeenLastCalledWith(160);
  });

  it('closeUnregistersAndReopenRegistersAgain — 닫힘(ref null)은 0·observer 해제, 다시 열기는 재등록', () => {
    const { RO, instances } = fakeResizeObserver();
    const onHeight = vi.fn();
    const banner = createBannerObserver({ onHeight, ResizeObserverImpl: RO });
    banner.attach(node(140));
    banner.attach(null);
    expect(onHeight).toHaveBeenLastCalledWith(0);
    expect(instances[0].disconnected).toBe(true);
    // 해제된 observer 의 늦은 콜백은 무시
    instances[0].cb([{ contentRect: { height: 999 } }]);
    expect(onHeight).toHaveBeenLastCalledWith(0);
    // 푸터 「광고 동의 설정」으로 다시 열기
    banner.attach(node(150));
    expect(onHeight).toHaveBeenLastCalledWith(150);
    expect(instances).toHaveLength(2);
    expect(instances[1].disconnected).toBe(false);
  });

  it('worksWithoutResizeObserver — ResizeObserver 가 없으면 부착 시 한 번 잰 높이만 쓴다', () => {
    const onHeight = vi.fn();
    const banner = createBannerObserver({ onHeight, ResizeObserverImpl: undefined });
    banner.attach(node(100));
    banner.attach(null);
    expect(onHeight.mock.calls).toEqual([[100], [0]]);
  });
});

// 리뷰 1판 지적 2: 상단 sticky Header 가 가린 위쪽도 배너와 같은 방식으로 rootMargin 에서 뺀다
describe('상단 Header 가림', () => {
  it('headerHeightRegistered — Header 실측 높이 등록·0 해제(전체 정지 아님)', () => {
    let s = overlayReducer(initialOverlay, { type: 'HEADER_HEIGHT', owner: 'header:1', height: 72.6 });
    expect(overlaySummary(s)).toEqual({ suspended: false, bannerHeight: 0, headerHeight: 73 });
    s = overlayReducer(s, { type: 'HEADER_HEIGHT', owner: 'header:1', height: 0 });
    expect(overlaySummary(s).headerHeight).toBe(0);
  });

  it('rootMarginExcludesHeaderAndBanner — 위쪽은 Header, 아래쪽은 배너만큼 줄이고 합이 뷰포트를 넘지 않는다', () => {
    expect(overlayRootMargin({ headerHeight: 0, bannerHeight: 0 }, 800)).toBe('0px 0px 0px 0px');
    expect(overlayRootMargin({ headerHeight: 73, bannerHeight: 0 }, 800)).toBe('-73px 0px 0px 0px');
    expect(overlayRootMargin({ headerHeight: 73, bannerHeight: 132.4 }, 800)).toBe('-73px 0px -133px 0px');
    expect(overlayRootMargin({ headerHeight: 500, bannerHeight: 500 }, 800)).toBe('-500px 0px -300px 0px');
  });
});
