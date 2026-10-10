import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { BudgetContext } from '../../context/budgetContextShared';
import { BudgetProvider } from '../../context/BudgetContext';

// 공개 API·신선도 판정은 usePartnerFeed(→ partnerFeed 순수 함수 테스트)가 맡는다. 여기서는 그 결과를 주입한다.
const feed = vi.hoisted(() => ({ items: {} }));
vi.mock('../../hooks/usePartnerFeed', () => ({ default: (slot) => feed.items[slot] ?? [] }));

const { default: PartnerSection } = await import('../PartnerSection');
const { default: SdmeCustomizer } = await import('../SdmeCustomizer');

const ITEM = {
  placementId: 1,
  partnerId: 1,
  name: '샘플 스냅',
  category: 'SNAP',
  region: '서울',
  summary: '승인받은 소개 문구',
  imageUrl: '/images/partners/sample.webp',
  destinationUrl: 'https://example.com/',
};

afterEach(() => { feed.items = {}; });

describe('예산 계산 제휴 업체 섹션', () => {
  it('rendersDisclosureAndSponsoredLink — 광고 표기·새 창·sponsored 링크·no-referrer 이미지', () => {
    feed.items.BUDGET_PARTNERS = [ITEM];
    const html = renderToString(<PartnerSection />);
    expect(html).toMatch(/<h3[^>]*>.*제휴 업체/s);
    expect(html).toContain('광고료를 받고 노출하는 제휴 업체입니다');
    expect(html).toContain('광고 · 제휴 업체');
    expect(html).toContain('href="https://example.com/"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="sponsored noopener noreferrer"');
    expect(html).toContain('업체 홈페이지 보기 (새 창)');
    expect(html.toLowerCase()).toContain('referrerpolicy="no-referrer"');
    expect(html).toContain('src="/images/partners/sample.webp"');
    // 광고비·서비스 가격은 보이지 않는다
    expect(html).not.toMatch(/\d원/);
  });

  it('hiddenWhenEmpty — 0건·실패·슬롯 off(빈 목록)면 제목·자리 모두 없다', () => {
    expect(renderToString(<PartnerSection />)).toBe('');
  });

  it('placedAfterSdmeRangeAndBeforeSnap — 스드메 범위 다음, 스냅 촬영 바로 위', () => {
    feed.items.BUDGET_PARTNERS = [ITEM];
    const html = renderToString(<BudgetProvider><SdmeCustomizer /></BudgetProvider>);
    const range = html.indexOf('스드메 가격 범위');
    const partners = html.indexOf('광고료를 받고 노출하는 제휴 업체입니다');
    const snap = html.indexOf('스냅 촬영');
    expect(range).toBeGreaterThan(-1);
    expect(partners).toBeGreaterThan(range);
    expect(snap).toBeGreaterThan(partners);
  });

  it('shownEvenWhenSnapOffAndDoesNotTouchBudget — 스냅을 꺼도 보이고, 카드는 예산 상태를 바꾸는 버튼이 아니다', () => {
    feed.items.BUDGET_PARTNERS = [ITEM];
    const dispatch = vi.fn();
    const value = {
      includeStudio: false, includeDress: false, includeMakeup: false, includeSnap: false,
      includeRing: false, includeBouquet: false, includeHanbok: false, dispatch,
    };
    const html = renderToString(<BudgetContext.Provider value={value}><SdmeCustomizer /></BudgetContext.Provider>);
    expect(html).toContain('광고료를 받고 노출하는 제휴 업체입니다');
    expect(html).not.toContain('스냅 촬영');
    // 카드는 외부 링크(<a>)뿐이고 예산 담기 표시(✓)·선택 상태가 없다
    const section = html.slice(html.indexOf('광고료를 받고'));
    expect(section).toContain('<a ');
    expect(section).not.toContain('✓');
    expect(dispatch).not.toHaveBeenCalled();
  });
});
