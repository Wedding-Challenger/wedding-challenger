import { describe, expect, it } from 'vitest';
import {
  FRESH_MS, REFETCH_MAX_MS, REFETCH_MIN_MS, failedFeed, refetchAt, toFeed, visibleItems,
} from '../partnerFeed';

const item = (over) => ({
  placementId: 1,
  partnerId: 1,
  name: '샘플 업체',
  category: 'SNAP',
  region: '서울',
  summary: '소개 문구',
  imageUrl: '/images/partners/sample.webp',
  destinationUrl: 'https://example.com/',
  disclosure: '광고 · 제휴 업체',
  visibleUntil: '2026-11-01T00:00:00+09:00',
  ...over,
});

const result = (over) => ({
  slot: 'BUDGET_PARTNERS',
  slotEnabled: true,
  serverTime: '2026-10-10T12:00:00+09:00',
  refreshAt: '2026-10-10T12:01:00+09:00',
  items: [item(), item({ placementId: 2, name: '곧 종료', visibleUntil: '2026-10-10T12:00:30+09:00' })],
  ...over,
});

// 이 브라우저 시계는 서버보다 5초 빠르다
const SERVER_NOW = Date.parse('2026-10-10T12:00:00+09:00');
const NOW = SERVER_NOW + 5000;

describe('제휴 목록 신선도', () => {
  it('noFeedErrorOrSlotOffShowsNothing — 없음·실패·슬롯 off 는 빈 목록', () => {
    expect(visibleItems(null, NOW)).toEqual([]);
    expect(visibleItems(failedFeed(NOW), NOW)).toEqual([]);
    expect(visibleItems(toFeed(result({ slotEnabled: false }), NOW), NOW)).toEqual([]);
    expect(visibleItems(toFeed(result({ items: [] }), NOW), NOW)).toEqual([]);
  });

  it('keepsServerOrderAndHidesExpiredByServerClock — 서버 시각 기준으로 끝난 카드는 바로 내린다', () => {
    const feed = toFeed(result(), NOW);
    expect(visibleItems(feed, NOW).map((i) => i.placementId)).toEqual([1, 2]);
    // 서버 12:00:30 = 이 시계 12:00:35. 31초 뒤(이 시계 12:00:36)면 2번은 끝났다
    expect(visibleItems(feed, NOW + 31000).map((i) => i.placementId)).toEqual([1]);
    expect(visibleItems(feed, NOW + 29000).map((i) => i.placementId)).toEqual([1, 2]);
  });

  it('staleAfterSixtySecondsShowsNothing — 재조회 없이 60초가 지나면 비운다', () => {
    const feed = toFeed(result(), NOW);
    expect(visibleItems(feed, NOW + FRESH_MS - 1)).toHaveLength(1);
    expect(visibleItems(feed, NOW + FRESH_MS + 1)).toEqual([]);
  });

  it('dropsUnsafeLinksAndExternalImages — https 링크만, 이미지는 /images/partners/ 상대 경로만', () => {
    const feed = toFeed(result({
      items: [
        item({ placementId: 1, destinationUrl: 'javascript:alert(1)' }),
        item({ placementId: 2, destinationUrl: 'http://example.com/' }),
        item({ placementId: 3, imageUrl: 'https://evil.example/x.webp' }),
        item({ placementId: 4, imageUrl: '/images/partners/../../x.webp' }),
        item({ placementId: 5, imageUrl: '//evil.example/x.webp' }),
        item({ placementId: 6 }),
        item({ placementId: 7, name: '' }),
      ],
    }), NOW);
    const shown = visibleItems(feed, NOW);
    expect(shown.map((i) => i.placementId)).toEqual([3, 4, 5, 6]);
    expect(shown.map((i) => i.imageUrl)).toEqual([null, null, null, '/images/partners/sample.webp']);
  });

  it('neverExposesPriceFields — 화면 모델에 단가·계약 필드를 싣지 않는다', () => {
    const feed = toFeed(result({ items: [item({ unitPrice: 100, contractReference: 'C-1', currency: 'KRW' })] }), NOW);
    const [shown] = visibleItems(feed, NOW);
    expect(shown).not.toHaveProperty('unitPrice');
    expect(shown).not.toHaveProperty('contractReference');
    expect(shown).not.toHaveProperty('currency');
  });
});

describe('재조회 시점', () => {
  it('refetchFollowsServerRefreshAtWithinBounds — refreshAt 을 따르되 최대 50초·최소 1초', () => {
    // 서버 refreshAt 60초 뒤 → 신선도 만료 전에 다시 받도록 50초
    expect(refetchAt(toFeed(result(), NOW))).toBe(NOW + REFETCH_MAX_MS);
    // 다음 경계가 10초 뒤
    expect(refetchAt(toFeed(result({ refreshAt: '2026-10-10T12:00:10+09:00' }), NOW))).toBe(NOW + 10000);
    // 이미 지난 refreshAt·값 없음
    expect(refetchAt(toFeed(result({ refreshAt: '2026-10-10T11:00:00+09:00' }), NOW))).toBe(NOW + REFETCH_MIN_MS);
    expect(refetchAt(toFeed(result({ refreshAt: null }), NOW))).toBe(NOW + REFETCH_MAX_MS);
    // 실패 뒤에도 60초 안에 다시 시도
    expect(refetchAt(failedFeed(NOW))).toBeLessThanOrEqual(NOW + FRESH_MS);
  });
});
