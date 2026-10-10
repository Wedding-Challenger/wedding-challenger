import { afterEach, describe, expect, it, vi } from 'vitest';
import { getPartners, PARTNER_SLOTS } from '../partners';

const json = (status, body, type = 'basic') => ({
  ok: status >= 200 && status < 300,
  status,
  type,
  headers: { get: (k) => (k.toLowerCase() === 'content-type' ? 'application/json' : null) },
  json: async () => body,
});
const ok = (result) => json(200, { code: 'COMMON200', message: '요청에 성공하였습니다.', result });

afterEach(() => vi.unstubAllGlobals());

// 계획서 §3.3 공개 계약 모양 (실제 업체 아님)
const RESULT = {
  slot: 'BUDGET_PARTNERS',
  slotEnabled: true,
  serverTime: '2026-10-10T12:00:00+09:00',
  refreshAt: '2026-10-10T12:01:00+09:00',
  items: [],
};

describe('공개 제휴 업체 API', () => {
  it('slotQueryNoStoreWithoutCredentials — slot 을 붙여 no-store·쿠키 없이 부른다', async () => {
    const fetch = vi.fn(async () => ok(RESULT));
    vi.stubGlobal('fetch', fetch);
    expect(await getPartners('BUDGET_PARTNERS')).toEqual(RESULT);
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8080/api/v1/partners?slot=BUDGET_PARTNERS',
      { cache: 'no-store', credentials: 'omit' },
    );
    // v1.1 가이드·체크리스트 사이드 슬롯 추가(계획서 §3.1)
    expect(PARTNER_SLOTS).toEqual(['HOME_MAIN', 'BUDGET_PARTNERS', 'GUIDE_SIDEBAR', 'CHECKLIST_SIDEBAR']);
  });

  it('unknownSlotRejectedBeforeFetch — 모르는 slot 은 요청하지 않는다', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    await expect(getPartners('FOOTER')).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('failureRejectsWithoutFallback — 실패는 내장 샘플 없이 그대로 실패(가짜 제휴 금지)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json(500, { code: 'COMMON500' })));
    await expect(getPartners('HOME_MAIN')).rejects.toThrow();
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    await expect(getPartners('HOME_MAIN')).rejects.toThrow();
  });
});
