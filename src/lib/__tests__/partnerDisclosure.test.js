import { describe, expect, it } from 'vitest';
import {
  AD_LABEL, AD_LABEL_COLOR, AD_NOTICE, TOOLTIP_WIDTH, contrastRatio, disclosureReducer, initialDisclosure, isDisclosureOpen, tooltipAlign,
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

describe('말풍선 위치', () => {
  it('tooltipStaysInsideViewport — 오른쪽 정렬로 왼쪽이 넘치면 왼쪽 정렬, 둘 다 넘치면 화면 왼쪽 여백에 맞춘다', () => {
    expect(TOOLTIP_WIDTH).toBe(240);
    // 카드 오른쪽 끝 근처(화면 가운데 이후) → 버튼 오른쪽에 맞춰 왼쪽으로 펼친다
    expect(tooltipAlign({ left: 330, right: 350 }, 390)).toEqual({ side: 'right', shift: 0 });
    // 화면 왼쪽 가장자리 근처 → 버튼 왼쪽에 맞춰 오른쪽으로 펼친다
    expect(tooltipAlign({ left: 30, right: 46 }, 390)).toEqual({ side: 'left', shift: 0 });
    // 좁은 화면에서 어느 쪽도 다 안 들어가면 화면 안으로 민다(여백 8px)
    expect(tooltipAlign({ left: 150, right: 166 }, 300)).toEqual({ side: 'left', shift: -98 });
  });
});
