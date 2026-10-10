import { afterEach, describe, expect, it, vi } from 'vitest';
import { sendPartnerMetric } from '../partnerMetrics';

afterEach(() => vi.unstubAllGlobals());

const EVENT = { placementId: 7, slot: 'BUDGET_PARTNERS', eventType: 'IMPRESSION', measurementToken: 'opaque-token' };

// 수집 API(계획서 §3.2): POST /api/v1/partners/metrics, text/plain JSON 한 이벤트,
// fetch keepalive + credentials omit + no-referrer, 재시도·영속 큐 없음. 실패는 링크·본문을 막지 않는다.
describe('제휴 측정 전송', () => {
  it('keepaliveOmitNoReferrerTextPlain — keepalive·쿠키 없음·referrer 없음·단순 요청 본문', async () => {
    const fetch = vi.fn(async () => ({ ok: true, status: 204 }));
    vi.stubGlobal('fetch', fetch);
    await sendPartnerMetric(EVENT);
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('http://localhost:8080/api/v1/partners/metrics');
    expect(init).toMatchObject({
      method: 'POST',
      keepalive: true,
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      cache: 'no-store',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    });
    expect(JSON.parse(init.body)).toEqual(EVENT);
  });

  it.each([
    ['429', async () => ({ ok: false, status: 429 })],
    ['400', async () => ({ ok: false, status: 400 })],
    ['네트워크 실패', async () => { throw new TypeError('Failed to fetch'); }],
  ])('noRetryAndNeverThrows — %s 에도 재시도 없이 조용히 끝난다', async (_, impl) => {
    const fetch = vi.fn(impl);
    vi.stubGlobal('fetch', fetch);
    await expect(sendPartnerMetric(EVENT)).resolves.toBe(false);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('invalidEventNotSent — 잘못된 이벤트(토큰 없음 등)는 요청하지 않는다', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    await expect(sendPartnerMetric({ ...EVENT, measurementToken: null })).resolves.toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('successReturnsTrue — 204 면 true', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 204 })));
    await expect(sendPartnerMetric(EVENT)).resolves.toBe(true);
  });
});
