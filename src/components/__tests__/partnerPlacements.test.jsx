import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import { BudgetProvider } from '../../context/BudgetContext';

// 지면 배치(계획서 B1·C6·C7·C10·G4). 사전 렌더링과 같은 Node renderToString 으로 DOM 순서·표식을 본다.
// 광고 슬롯이 그려지게 광고 빌드 플래그만 켠 설정을 주입한다(레이아웃 플래그는 기본 off).
// 운영 슬롯 ID 는 비어 있다(자동 광고만). 위치 검증용 가짜 슬롯 값만 넣는다
vi.mock('../../config/ads', async (importOriginal) => ({
  ...(await importOriginal()),
  AD_SLOTS: { landing: '', calcSidebar: 'test-slot', footer: '' },
}));

vi.mock('../../config/environment', () => ({
  stage: 'test',
  apiOrigin: 'http://localhost:8080',
  siteUrl: 'http://localhost:5173',
  adsEnabled: true,
  indexable: false,
  partnerSideLayoutEnabled: false,
}));

const feed = vi.hoisted(() => ({ items: {} }));
vi.mock('../../hooks/usePartnerFeed', () => ({
  default: (slot) => ({ items: feed.items[slot] ?? [], prepareSend: async () => null }),
}));

const { default: BudgetCalculator } = await import('../BudgetCalculator');
const { default: PublicLanding } = await import('../PublicLanding');
const { default: Guide } = await import('../Guide');
const { default: Checklist } = await import('../Checklist');

const item = (id, category = 'INVITATION') => ({
  placementId: id,
  partnerId: id,
  name: `샘플 업체 ${id}`,
  category,
  region: '서울',
  summary: '승인받은 소개 문구',
  imageUrl: null,
  destinationUrl: `https://example.com/${id}`,
  disclosure: '광고',
  disclosureNotice: '웨딩챌린저가 선정해 노출하는 제휴 업체입니다.',
});

const renderCalc = () => renderToString(
  <StaticRouter location="/calc"><BudgetProvider><BudgetCalculator adsEnabled /></BudgetProvider></StaticRouter>,
);

afterEach(() => { feed.items = {}; });

describe('예산 계산 — 바구니 sticky 래퍼와 제휴 세로 목록(B1·C7)', () => {
  it('partnersInsideStickyWrapperRightBelowBasket — 바구니와 같은 sticky 래퍼, 바구니 바로 아래', () => {
    feed.items.BUDGET_PARTNERS = [item(1), item(2, 'STUDIO')];
    const html = renderCalc();
    const wrapper = html.indexOf('aria-label="견적 바구니와 제휴 업체"');
    expect(wrapper).toBeGreaterThan(-1);
    const wrapperTag = html.slice(html.lastIndexOf('<', wrapper), html.indexOf('>', wrapper));
    expect(wrapperTag).toContain('role="region"');
    expect(wrapperTag).toMatch(/lg:sticky/);
    expect(wrapperTag).toMatch(/lg:max-h-/);
    expect(wrapperTag).toMatch(/lg:overflow-y-auto/);
    expect(wrapperTag).toMatch(/overscroll-contain/);
    const basket = html.indexOf('견적 바구니', wrapper + 10);
    const partners = html.indexOf('data-partner-slot="BUDGET_PARTNERS"');
    expect(basket).toBeGreaterThan(wrapper);
    expect(partners).toBeGreaterThan(basket);
    // 바구니 자체 sticky 는 없앤다(래퍼 하나만)
    expect(html.match(/sticky/g)).toHaveLength(1);
    // 스드메 안 예전 위치에는 없다(같은 placement 중복 렌더 없음)
    expect(html.match(/data-partner-slot="BUDGET_PARTNERS"/g)).toHaveLength(1);
    expect(html.indexOf('스드메 + 스냅 커스텀')).toBeLessThan(wrapper);
  });

  it('verticalCompactListWithoutHorizontalScroll — 세로 컴팩트 목록, 가로 스크롤 없음', () => {
    feed.items.BUDGET_PARTNERS = [item(1), item(2, 'STUDIO')];
    const html = renderCalc();
    const section = html.slice(html.indexOf('data-partner-slot="BUDGET_PARTNERS"'));
    const list = section.slice(0, section.indexOf('</section>'));
    expect(list).toMatch(/<ul[^>]*>/);
    expect(list.match(/<li[\s>]/g)).toHaveLength(2);
    expect(list).not.toContain('overflow-x');
    expect(list).not.toContain('scrollbar');
  });

  it('adsenseMovedOutOfAsideToMainColumnBottom — AdSense 는 aside 밖, 본문 열 하단(동의·환경 게이트 유지)', () => {
    const html = renderCalc();
    const ad = html.indexOf('<ins class="adsbygoogle');
    const aside = html.indexOf('<aside');
    expect(ad).toBeGreaterThan(-1);
    expect(aside).toBeGreaterThan(ad);
    expect(ad).toBeGreaterThan(html.indexOf('스드메 + 스냅 커스텀'));
    expect(html.slice(aside)).not.toContain('adsbygoogle');
    // 동의가 없으면 슬롯 없음
    const noConsent = renderToString(
      <StaticRouter location="/calc"><BudgetProvider><BudgetCalculator adsEnabled={false} /></BudgetProvider></StaticRouter>,
    );
    expect(noConsent).not.toContain('adsbygoogle');
  });

  it('hiddenWhenEmpty — 0건·실패·슬롯 off 면 제휴 섹션을 그리지 않는다(바구니는 그대로)', () => {
    const html = renderCalc();
    expect(html).not.toContain('data-partner-slot="BUDGET_PARTNERS"');
    expect(html).toContain('견적 바구니');
  });
});

describe('광고 표시 — 쿠팡식 「광고 ⓘ」(G4)', () => {
  it('everyCardHasSmallAdLabelAndInfoButton — 카드마다 「광고」와 ⓘ 버튼, 큰 배지·섹션 안내 문장 없음', () => {
    feed.items.BUDGET_PARTNERS = [item(1), item(2, 'STUDIO')];
    const html = renderCalc();
    expect(html.match(/aria-label="광고 안내 보기"/g)).toHaveLength(2);
    expect(html).not.toContain('광고 · 제휴 업체');
    expect(html).not.toContain('광고료를 받고');
    expect(html).not.toContain('웨딩챌린저가 선정해 노출하는 제휴 업체입니다'); // 말풍선은 열 때만
  });

  it('homeRowHasNoNoticeSentence — 홈 제휴 줄도 섹션 안내 문장 없이 카드마다 「광고 ⓘ」', () => {
    feed.items.HOME_MAIN = [item(1), item(2, 'STUDIO'), item(3, 'DRESS')];
    const html = renderToString(<StaticRouter location="/"><PublicLanding adsEnabled={false} /></StaticRouter>);
    expect(html).toMatch(/<h2[^>]*>제휴 업체<\/h2>/);
    expect(html).not.toContain('광고료를 받고');
    expect(html).not.toContain('광고 · 제휴 업체');
    expect(html.match(/aria-label="광고 안내 보기"/g)).toHaveLength(3);
    // 링크 접근성 이름에 광고임을 담는다
    expect(html).toContain('aria-label="샘플 업체 1 — 광고, 업체 홈페이지 보기 (새 창)"');
  });

  it('infoButtonIsOutsideLink — ⓘ 버튼은 링크 밖(링크 안 버튼 중첩 금지)', () => {
    feed.items.BUDGET_PARTNERS = [item(1)];
    const html = renderCalc();
    const link = html.indexOf('<a href="https://example.com/1"');
    const linkEnd = html.indexOf('</a>', link);
    const button = html.indexOf('aria-label="광고 안내 보기"');
    expect(button).toBeGreaterThan(linkEnd);
  });
});

describe('가이드·체크리스트 — 레이아웃 플래그 off(C10·D3)', () => {
  const PAGES = { 가이드: Guide, 체크리스트: Checklist };
  it.each(Object.keys(PAGES))('offKeepsSingleColumnWithoutSideColumn — %s 는 지금 단일 열, 사이드 열 없음', (name) => {
    const Page = PAGES[name];
    feed.items.GUIDE_SIDEBAR = [item(1)];
    feed.items.CHECKLIST_SIDEBAR = [item(2)];
    const html = renderToString(<StaticRouter location="/guide"><Page /></StaticRouter>);
    expect(html.match(/data-partner-side-layout="false"/g)).toHaveLength(1);
    expect(html).not.toContain('data-partner-side-column');
    expect(html).not.toContain('example.com');
    expect(html).toContain('max-w-3xl');
  });
});
