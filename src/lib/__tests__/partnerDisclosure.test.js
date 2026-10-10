import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AD_LABEL, AD_LABEL_COLOR, AD_NOTICE, TOOLTIP_WIDTH, contrastRatio, createHoverGrace, disclosureReducer, initialDisclosure, isDisclosureOpen, tooltipPosition,
} from '../partnerDisclosure';

// 쿠팡식 광고 표시(승인 G4·조율자 H3): 모든 지면 카드 오른쪽 아래 작은 「광고 ⓘ」(항상 보임, 대비 4.5:1 이상),
// ⓘ 버튼(마우스·포커스·탭)으로 안내 말풍선. 큰 「광고 · 제휴 업체」 배지와 섹션 안내 문장은 없다.
describe('광고 표시 문구·대비', () => {
  it('copyMatchesApprovedText — 표시 「광고」, 안내 「웨딩챌린저가 선정해 노출하는 제휴 업체입니다.」', () => {
    expect(AD_LABEL).toBe('광고');
    expect(AD_NOTICE).toBe('웨딩챌린저가 선정해 노출하는 제휴 업체입니다.');
  });

  it('labelContrastAtLeast4_5 — 카드 흰 바탕·크림 바탕 모두 4.5:1 이상', () => {
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 1);
    expect(contrastRatio(AD_LABEL_COLOR, '#FFFFFF')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(AD_LABEL_COLOR, '#FFF8F0')).toBeGreaterThanOrEqual(4.5); // cream
    expect(contrastRatio(AD_LABEL_COLOR, '#FFFBF6')).toBeGreaterThanOrEqual(4.5);
  });
});

describe('ⓘ 말풍선 상태', () => {
  it('mouseHoverOpensAndLeaveCloses — 마우스 hover 동안 열림', () => {
    let s = disclosureReducer(initialDisclosure, { type: 'HOVER', value: true });
    expect(isDisclosureOpen(s)).toBe(true);
    s = disclosureReducer(s, { type: 'HOVER', value: false });
    expect(isDisclosureOpen(s)).toBe(false);
  });

  it('keyboardFocusOpensBlurCloses — 키보드 포커스로 열리고 포커스가 빠지면 닫힘, Esc 로 닫힘', () => {
    let s = disclosureReducer(initialDisclosure, { type: 'FOCUS', value: true });
    expect(isDisclosureOpen(s)).toBe(true);
    s = disclosureReducer(s, { type: 'ESCAPE' });
    expect(isDisclosureOpen(s)).toBe(false);
    s = disclosureReducer(disclosureReducer(s, { type: 'FOCUS', value: true }), { type: 'FOCUS', value: false });
    expect(isDisclosureOpen(s)).toBe(false);
  });

  it('tapTogglesAndStaysUntilTapAgainOrBlur — 탭(click)은 열고 다시 탭하면 닫힘(포커스가 같이 와도 닫힘)', () => {
    // 터치: 포커스와 click 이 같이 온다
    let s = disclosureReducer(initialDisclosure, { type: 'FOCUS', value: true });
    s = disclosureReducer(s, { type: 'TOGGLE' });
    // 포커스로 이미 열려 있으면 첫 탭은 닫지 않고 고정한다
    expect(isDisclosureOpen(s)).toBe(true);
    s = disclosureReducer(s, { type: 'TOGGLE' });
    expect(isDisclosureOpen(s)).toBe(false);
    // 포커스 없이(일부 모바일 브라우저) 탭
    s = disclosureReducer(initialDisclosure, { type: 'TOGGLE' });
    expect(isDisclosureOpen(s)).toBe(true);
    s = disclosureReducer(s, { type: 'HOVER', value: false });
    expect(isDisclosureOpen(s)).toBe(true);
    s = disclosureReducer(s, { type: 'FOCUS', value: false });
    expect(isDisclosureOpen(s)).toBe(false);
  });
});

// 리뷰 1판 지적 3: 말풍선은 portal(document.body) + fixed 로 띄워 마키 overflow·예산 내부 스크롤에 잘리지 않고,
// 트리거 화면 좌표 기준으로 뷰포트 안에 둔다.
describe('말풍선 위치(fixed, viewport 기준)', () => {
  const vp = { width: 390, height: 780 };
  it('rightAlignedAboveTrigger — 기본은 트리거 오른쪽 끝에 맞춰 위로(마키 왼쪽 경계와 무관)', () => {
    expect(TOOLTIP_WIDTH).toBe(240);
    // 리뷰 예: 마키 왼쪽 경계 x=80, 버튼 오른쪽 x=300 → 말풍선 x=60 부터 그대로(조상에 잘리지 않음)
    expect(tooltipPosition({ left: 276, right: 300, top: 500, bottom: 524 }, { width: 1280, height: 800 }))
      .toEqual({ left: 60, width: 240, bottom: 308 });
  });

  it('flipsInsideViewport — 왼쪽이 넘치면 트리거 왼쪽 기준, 둘 다 넘치면 여백 8px 안으로', () => {
    expect(tooltipPosition({ left: 30, right: 46, top: 500, bottom: 516 }, vp)).toMatchObject({ left: 30 });
    expect(tooltipPosition({ left: 150, right: 166, top: 500, bottom: 516 }, { width: 300, height: 780 })).toMatchObject({ left: 52, width: 240 });
    expect(tooltipPosition({ left: 100, right: 116, top: 500, bottom: 516 }, { width: 200, height: 780 })).toMatchObject({ left: 8, width: 184 });
  });

  it('belowWhenNoRoomAbove — 위쪽이 Header 근처면 트리거 아래로', () => {
    expect(tooltipPosition({ left: 300, right: 320, top: 60, bottom: 80 }, vp)).toEqual({ left: 80, width: 240, top: 88 });
  });
});

// 리뷰 1판 지적 4: 트리거와 말풍선을 함께 hover 영역으로, 사이 간격을 지날 동안 150ms 유예
describe('hover 유예', () => {
  afterEach(() => vi.useRealTimers());

  it('graceKeepsOpenWhileMovingToTooltip — 트리거를 떠나 150ms 안에 말풍선에 들어가면 닫지 않는다', () => {
    vi.useFakeTimers();
    const onOpen = vi.fn();
    const onClose = vi.fn();
    const hover = createHoverGrace({ onOpen, onClose });
    hover.enter(); // 트리거
    expect(onOpen).toHaveBeenCalledTimes(1);
    hover.leave();
    vi.advanceTimersByTime(100);
    hover.enter(); // 말풍선
    vi.advanceTimersByTime(500);
    expect(onClose).not.toHaveBeenCalled();
    hover.leave(); // 말풍선을 떠남
    vi.advanceTimersByTime(149);
    expect(onClose).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    hover.leave();
    hover.dispose();
    vi.advanceTimersByTime(500);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
