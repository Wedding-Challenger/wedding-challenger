import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';

// 레이아웃 플래그 on(계획서 C10·D3): test mode 는 env 를 읽지 않으므로 on 은 설정 mock 으로만 만든다.
// on 이면 PC 우측 고정 열 하나(광고 유무와 무관), 같은 DOM 이 모바일에서는 첫 본문 묶음 뒤에 온다.
vi.mock('../../config/environment', () => ({
  stage: 'test',
  apiOrigin: 'http://localhost:8080',
  siteUrl: 'http://localhost:5173',
  adsEnabled: false,
  indexable: false,
  partnerSideLayoutEnabled: true,
}));

const feed = vi.hoisted(() => ({ items: {} }));
vi.mock('../../hooks/usePartnerFeed', () => ({
  default: (slot) => ({ items: feed.items[slot] ?? [], prepareSend: async () => null }),
}));

const { default: Guide } = await import('../Guide');
const { default: Checklist } = await import('../Checklist');

const item = (id) => ({
  placementId: id, partnerId: id, name: `샘플 청첩장 ${id}`, category: 'INVITATION', region: null, summary: null,
  imageUrl: null, destinationUrl: `https://example.com/${id}`,
});

const PAGES = { GUIDE_SIDEBAR: Guide, CHECKLIST_SIDEBAR: Checklist };
const render = (slot) => {
  const Page = PAGES[slot];
  return renderToString(<StaticRouter location="/guide"><Page /></StaticRouter>);
};

afterEach(() => { feed.items = {}; });

describe.each([
  ['가이드', 'GUIDE_SIDEBAR', '12개월 전', '10개월 전'],
  ['체크리스트', 'CHECKLIST_SIDEBAR', '12개월 전', '10개월 전'],
])('%s 사이드 레이아웃 on', (_, slot, firstGroup, secondGroup) => {
  it('fixedSideColumnEvenWithoutAds — 광고 0건·첫 렌더에도 고정 열 표식 하나(본문 위치 불변)', () => {
    const html = render(slot);
    expect(html.match(/data-partner-side-layout="true"/g)).toHaveLength(1);
    expect(html.match(/data-partner-side-column/g)).toHaveLength(1);
    expect(html).toMatch(/lg:grid-cols-\[minmax\(0,1fr\)_/);
    expect(html).not.toContain('example.com');
  });

  it('sameDomAfterFirstGroup — 사이드 열 DOM 은 첫 본문 묶음 뒤·둘째 묶음 앞(모바일 위치), 숨긴 중복 없음', () => {
    feed.items[slot] = [item(1)];
    const html = render(slot);
    const first = html.indexOf(firstGroup);
    const side = html.indexOf('data-partner-side-column');
    const second = html.indexOf(secondGroup);
    expect(first).toBeGreaterThan(-1);
    expect(side).toBeGreaterThan(first);
    expect(second).toBeGreaterThan(side);
    expect(html.match(/href="https:\/\/example.com\/1"/g)).toHaveLength(1);
    expect(html).toContain(`data-partner-slot="${slot}"`);
    expect(html).toContain('aria-label="광고 안내 보기"');
  });

  it('singleCardOnly — 사이드는 카드 1개만(순환 결과 1건)', () => {
    feed.items[slot] = [item(1), item(2)];
    const html = render(slot);
    expect(html.match(/aria-label="광고 안내 보기"/g)).toHaveLength(1);
  });
});
