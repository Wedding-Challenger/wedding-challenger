import { describe, expect, it } from 'vitest';
import {
  TOKEN_REFRESH_MS, VIEW_MS, VIEW_RATIO, countableActivation, createImpressionTracker, createPageViewLedger, metricBody,
  tokenNeedsRefresh,
} from '../partnerMetrics';

// 가시 노출(계획서 §3.2 C1): 카드 면적 50% 이상이 가림을 뺀 뷰포트 안에 연속 1,000ms, 문서 visible, 전체 화면 모달 닫힘.
// 실제 IntersectionObserver·타이머는 usePartnerMetrics 가 잇고, 여기서는 시각을 직접 넣는 순수 상태 기계를 검증한다.
describe('가시 노출 판정', () => {
  it('thresholdsAre50PercentAnd1000ms — 49%·999ms 는 0, 50%·1000ms 는 1', () => {
    expect(VIEW_RATIO).toBe(0.5);
    expect(VIEW_MS).toBe(1000);

    const t = createImpressionTracker();
    t.observe('A', 'el', 0.49, 0);
    expect(t.nextDueAt()).toBeNull();
    expect(t.due(5000)).toEqual([]);

    t.observe('A', 'el', 0.5, 100);
    expect(t.nextDueAt()).toBe(1100);
    expect(t.due(1099)).toEqual([]);
    expect(t.due(1100)).toEqual(['A']);
    // 같은 카드는 다시 내지 않는다
    expect(t.due(9000)).toEqual([]);
  });

  it('dropBelowThresholdRestartsContinuousWindow — 연속 구간이 끊기면 처음부터', () => {
    const t = createImpressionTracker();
    t.observe('A', 'el', 0.8, 0);
    t.observe('A', 'el', 0.3, 900);
    t.observe('A', 'el', 0.8, 1000);
    expect(t.due(1900)).toEqual([]);
    expect(t.due(2000)).toEqual(['A']);
  });

  it('modalSuspendsAllAndResetsTimers — 온보딩 모달 열림은 전체 0, 닫힌 뒤 1초가 새로 필요', () => {
    const t = createImpressionTracker();
    t.observe('A', 'el', 1, 0);
    t.observe('B', 'el2', 1, 0);
    t.setSuspended(true, 500);
    expect(t.nextDueAt()).toBeNull();
    expect(t.due(5000)).toEqual([]);
    t.setSuspended(false, 6000);
    expect(t.due(6999)).toEqual([]);
    expect(t.due(7000).sort()).toEqual(['A', 'B']);
  });

  it('hiddenDocumentResetsTimers — 탭 hidden 동안은 세지 않고 복귀 뒤 다시 1초', () => {
    const t = createImpressionTracker();
    t.observe('A', 'el', 1, 0);
    t.setDocumentVisible(false, 600);
    expect(t.due(2000)).toEqual([]);
    t.setDocumentVisible(true, 3000);
    expect(t.due(3999)).toEqual([]);
    expect(t.due(4000)).toEqual(['A']);
  });

  it('cloneUsesMaxRatioNotSum — 원본·inert 복제는 같은 카드로 합치고 비율은 최댓값(합산 금지)', () => {
    const t = createImpressionTracker();
    // 각각 30% — 합치면 60% 지만 최댓값 30% 라 노출 아님
    t.observe('A', 'original', 0.3, 0);
    t.observe('A', 'clone', 0.3, 0);
    expect(t.due(2000)).toEqual([]);
    // 원본이 빠지는 순간 복제가 50% 이상이면 연속 구간이 이어진다
    t.observe('A', 'original', 0.6, 2000);
    t.observe('A', 'clone', 0.55, 2500);
    t.observe('A', 'original', 0, 2600);
    expect(t.due(3000)).toEqual(['A']);
    // 두 DOM 이 있어도 한 번만
    expect(t.due(5000)).toEqual([]);
  });

  it('forgetRemovedElement — 컴포넌트 제거·DOM 이동 시 그 DOM 의 비율을 지운다', () => {
    const t = createImpressionTracker();
    t.observe('A', 'el', 1, 0);
    t.forget('A', 'el', 400);
    expect(t.due(2000)).toEqual([]);
  });

  it('resetOnObserverRecreateDoesNotStitchTime — 배너 높이·뷰포트 변화로 observer 를 새로 만들면 검증 안 된 시간을 잇지 않는다', () => {
    const t = createImpressionTracker();
    t.observe('A', 'el', 1, 0);
    t.reset(800);
    expect(t.due(1200)).toEqual([]);
    // 새 observer 의 첫 콜백부터 다시 1초
    t.observe('A', 'el', 1, 900);
    expect(t.due(1899)).toEqual([]);
    expect(t.due(1900)).toEqual(['A']);
  });
});

describe('페이지뷰 안 중복 제거', () => {
  it('ledgerCountsOncePerSlotPlacementEvent — (slot, placementId, eventType) 마다 최대 1회', () => {
    const ledger = createPageViewLedger();
    expect(ledger.markOnce('HOME_MAIN', 1, 'IMPRESSION')).toBe(true);
    expect(ledger.markOnce('HOME_MAIN', 1, 'IMPRESSION')).toBe(false);
    expect(ledger.markOnce('HOME_MAIN', 1, 'CLICK')).toBe(true);
    expect(ledger.markOnce('HOME_MAIN', 1, 'CLICK')).toBe(false);
    expect(ledger.markOnce('BUDGET_PARTNERS', 1, 'IMPRESSION')).toBe(true);
    // 새 페이지뷰(route 변경)는 새 ledger
    expect(createPageViewLedger().markOnce('HOME_MAIN', 1, 'IMPRESSION')).toBe(true);
  });

  it('rotationPinsLiveInLedger — 업종 순환 고정은 페이지뷰 ledger 에 슬롯별로 둔다(StrictMode 재마운트에도 유지)', () => {
    const ledger = createPageViewLedger();
    const pins = ledger.pinsFor('HOME_MAIN');
    expect(pins.read()).toEqual({});
    pins.write({ INVITATION: 3 });
    expect(ledger.pinsFor('HOME_MAIN').read()).toEqual({ INVITATION: 3 });
    expect(ledger.pinsFor('BUDGET_PARTNERS').read()).toEqual({});
  });
});

describe('클릭 판정', () => {
  it.each([
    ['좌클릭', { type: 'click', button: 0 }, true],
    ['키보드 Enter(click, detail 0)', { type: 'click', button: 0, detail: 0 }, true],
    ['중간 버튼 새 탭', { type: 'auxclick', button: 1 }, true],
    ['우클릭 메뉴', { type: 'auxclick', button: 2 }, false],
    ['중간 버튼 click(일부 브라우저)', { type: 'click', button: 1 }, false],
  ])('countableActivation — %s', (_, event, expected) => {
    expect(countableActivation(event)).toBe(expected);
  });
});

describe('측정 토큰·전송 본문', () => {
  it('tokenRefreshAt11SecondsOrLess — 남은 시간 11초 이하·만료 정보 없음이면 전송 전에 재조회', () => {
    expect(TOKEN_REFRESH_MS).toBe(11000);
    const now = 1_000_000;
    expect(tokenNeedsRefresh({ measurementToken: 't', measurementTokenExpiresAt: now + 11001 }, now)).toBe(false);
    expect(tokenNeedsRefresh({ measurementToken: 't', measurementTokenExpiresAt: now + 11000 }, now)).toBe(true);
    expect(tokenNeedsRefresh({ measurementToken: 't', measurementTokenExpiresAt: null }, now)).toBe(true);
    expect(tokenNeedsRefresh(null, now)).toBe(true);
  });

  it('metricBodyHasExactlyFourFields — 본문은 {placementId, slot, eventType, measurementToken} 하나뿐(count·URL·시각 없음)', () => {
    const body = metricBody({ placementId: 7, slot: 'HOME_MAIN', eventType: 'CLICK', measurementToken: 'tok', extra: 'x' });
    expect(JSON.parse(body)).toEqual({ placementId: 7, slot: 'HOME_MAIN', eventType: 'CLICK', measurementToken: 'tok' });
    expect(Object.keys(JSON.parse(body))).toEqual(['placementId', 'slot', 'eventType', 'measurementToken']);
    expect(() => metricBody({ placementId: 7, slot: 'HOME_MAIN', eventType: 'VIEW', measurementToken: 'tok' })).toThrow();
    expect(() => metricBody({ placementId: 0, slot: 'HOME_MAIN', eventType: 'CLICK', measurementToken: 'tok' })).toThrow();
    expect(() => metricBody({ placementId: 7, slot: 'FOOTER', eventType: 'CLICK', measurementToken: 'tok' })).toThrow();
    expect(() => metricBody({ placementId: 7, slot: 'HOME_MAIN', eventType: 'CLICK', measurementToken: '' })).toThrow();
  });
});
