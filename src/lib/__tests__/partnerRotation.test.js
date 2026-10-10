import { describe, expect, it } from 'vitest';
import { PARTNER_CATEGORIES, pickRotation, toFeed, visibleItems } from '../partnerFeed';

// 업종 단위 순환(승인 G2·조율자 H1): 피드는 살아 있는 후보 전부 + item 마다 rotationGroup·rotationPick(그룹마다 하나).
// FE 는 페이지뷰 첫 응답의 pick 을 그룹별로 고정하고, 재조회 때 고정 placement 가 아직 있으면 유지·없으면 새 pick.
// 화면에는 그룹당 1개만, 순서는 서버 순서. 측정 토큰·만료는 item 별 필드(C11).
const NOW = Date.parse('2026-10-10T12:00:00+09:00');
const at = (ms) => new Date(ms).toISOString();

const item = (id, group, pick, extra = {}) => ({
  placementId: id,
  partnerId: id,
  name: `샘플 ${id}`,
  category: group,
  destinationUrl: `https://example.com/${id}`,
  rotationGroup: group,
  rotationPick: pick,
  ...extra,
});

const feedOf = (items, serverNow = NOW) =>
  toFeed({ slot: 'HOME_MAIN', slotEnabled: true, serverTime: at(serverNow), refreshAt: at(serverNow + 50000), items }, NOW);

const ids = (list) => list.map((i) => i.placementId);

describe('업종 단위 순환', () => {
  it('invitationCategoryAdded — 청첩장(INVITATION) 업종', () => {
    expect(PARTNER_CATEGORIES).toContainEqual({ value: 'INVITATION', label: '청첩장' });
  });

  it('firstResponsePicksOnePerGroupInServerOrder — 그룹마다 pick 하나만, 서버 순서대로', () => {
    const feed = feedOf([
      item(1, 'INVITATION', false), item(2, 'STUDIO', true), item(3, 'INVITATION', true), item(4, 'INVITATION', false),
      item(5, 'DRESS', true),
    ]);
    const { items, pins } = pickRotation(visibleItems(feed, NOW), {});
    expect(ids(items)).toEqual([2, 3, 5]);
    expect(pins).toEqual({ INVITATION: 3, STUDIO: 2, DRESS: 5 });
  });

  it('pinnedPlacementKeptOnRefetch — 재조회에서 pick 이 바뀌어도 고정 placement 가 있으면 유지(한 페이지뷰 동안 안 바뀜)', () => {
    const refetched = feedOf([item(1, 'INVITATION', true), item(3, 'INVITATION', false), item(2, 'STUDIO', true)]);
    const { items, pins } = pickRotation(visibleItems(refetched, NOW), { INVITATION: 3, STUDIO: 2 });
    expect(ids(items)).toEqual([3, 2]);
    expect(pins).toEqual({ INVITATION: 3, STUDIO: 2 });
  });

  it('pinnedGoneTakesNewPick — 고정 placement 가 빠지면(종료·철회) 새 응답의 pick', () => {
    const refetched = feedOf([item(1, 'INVITATION', false), item(4, 'INVITATION', true)]);
    const { items, pins } = pickRotation(visibleItems(refetched, NOW), { INVITATION: 3 });
    expect(ids(items)).toEqual([4]);
    expect(pins).toEqual({ INVITATION: 4 });
  });

  it('pickExpiredFallsBackToFirstVisibleInGroup — pick 이 카드 종료로 안 보이면 그 그룹의 첫 보이는 후보', () => {
    const feed = feedOf([
      item(1, 'INVITATION', false, { visibleUntil: at(NOW + 86400000) }),
      item(2, 'INVITATION', true, { visibleUntil: at(NOW - 1) }),
    ]);
    expect(ids(pickRotation(visibleItems(feed, NOW), {}).items)).toEqual([1]);
  });

  it('sidebarSlotGroupShowsSingleCard — 사이드 슬롯은 rotationGroup 하나(SLOT)라 카드 1개만', () => {
    const feed = feedOf([item(1, 'SLOT', false), item(2, 'SLOT', true), item(3, 'SLOT', false)]);
    expect(ids(pickRotation(visibleItems(feed, NOW), {}).items)).toEqual([2]);
  });

  it('missingGroupKeepsEachPlacement — rotationGroup 이 없으면(순환 전 서버) 배치마다 따로 — 지금처럼 모두 보인다', () => {
    const feed = feedOf([
      { ...item(1, 'SNAP', false), rotationGroup: undefined, rotationPick: undefined },
      { ...item(2, 'SNAP', false), rotationGroup: undefined, rotationPick: undefined },
      { ...item(3, null, false), rotationGroup: '  ', category: null },
    ]);
    expect(ids(pickRotation(visibleItems(feed, NOW), {}).items)).toEqual([1, 2, 3]);
  });
});

describe('item 별 측정 토큰(C11)·광고 표시(H3)', () => {
  it('tokenAndExpiryArePerItemAndClockAdjusted — 토큰·만료는 item 별, 만료는 서버 시각 차이로 이 시계에 맞춘다', () => {
    const serverNow = NOW + 5000; // 서버가 5초 빠름
    const feed = feedOf([
      item(1, 'A', true, { measurementToken: 'tok-1', measurementTokenExpiresAt: at(serverNow + 120000) }),
      item(2, 'B', true, { measurementToken: 'tok-2', measurementTokenExpiresAt: at(serverNow + 90000) }),
      item(3, 'C', true),
    ], serverNow);
    const [a, b, c] = feed.items;
    expect(a).toMatchObject({ measurementToken: 'tok-1', measurementTokenExpiresAt: NOW + 120000 });
    expect(b).toMatchObject({ measurementToken: 'tok-2', measurementTokenExpiresAt: NOW + 90000 });
    // 집계 off: 토큰 없음 → 측정하지 않는다
    expect(c).toMatchObject({ measurementToken: null, measurementTokenExpiresAt: null });
  });

  it('disclosureFromServerWithFallback — 서버 disclosure·disclosureNotice 를 쓰고 없거나 이상하면 같은 상수', () => {
    const feed = feedOf([
      item(1, 'A', true, { disclosure: '광고', disclosureNotice: '웨딩챌린저가 선정해 노출하는 제휴 업체입니다.' }),
      item(2, 'B', true),
      item(3, 'C', true, { disclosure: '   ', disclosureNotice: 'x'.repeat(500) }),
    ]);
    for (const card of feed.items) {
      expect(card.disclosure).toBe('광고');
      expect(card.disclosureNotice).toBe('웨딩챌린저가 선정해 노출하는 제휴 업체입니다.');
    }
  });

  it('unknownFieldsNotCarried — 단가·계약 필드는 카드 모델에 싣지 않는다', () => {
    const [card] = feedOf([item(1, 'A', true, { unitPrice: 0, contractReference: 'X' })]).items;
    expect(card).not.toHaveProperty('unitPrice');
    expect(card).not.toHaveProperty('contractReference');
  });
});
