import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AdminApiError, adminLoginUrl, deletePartner, getAdminMe, savePartner, savePlacementOrder,
} from '../adminPartners';

const json = (status, body, type = 'basic') => ({
  ok: status >= 200 && status < 300,
  status,
  type,
  headers: { get: (k) => (k.toLowerCase() === 'content-type' ? 'application/json' : null) },
  json: async () => body,
});
const ok = (result) => json(200, { code: 'COMMON200', message: '요청에 성공하였습니다.', result });

afterEach(() => vi.unstubAllGlobals());


describe('관리 API 클라이언트', () => {
  it('adminFetchSendsCookiesMarkerAndNoStore — 관리 요청만 credentials include·표지 헤더·redirect 수동', async () => {
    const fetch = vi.fn(async () => ok({ subject: 's', environment: 'dev' }));
    vi.stubGlobal('fetch', fetch);
    await getAdminMe();
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('http://localhost:8080/api/v1/admin/me');
    expect(init).toMatchObject({
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
      redirect: 'manual',
      headers: { Accept: 'application/json', 'X-WC-Admin-Request': '1' },
    });
    expect(init.body).toBeUndefined();
  });

  it('mutationSendsJsonBody — 저장은 JSON body, 수정은 PUT /partners/{id}', async () => {
    const fetch = vi.fn(async () => ok({ id: 7, version: 2 }));
    vi.stubGlobal('fetch', fetch);
    await savePartner({ name: '가', version: 1, id: 7 });
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('http://localhost:8080/api/v1/admin/partners/7');
    expect(init.method).toBe('PUT');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body)).toEqual({ name: '가', version: 1 });

    await savePartner({ name: '나' });
    expect(fetch.mock.calls[1][0]).toBe('http://localhost:8080/api/v1/admin/partners');
    expect(fetch.mock.calls[1][1].method).toBe('POST');
  });

  it('deleteAndOrderCarryVersion — 삭제는 version query, 순서는 한 번에', async () => {
    const fetch = vi.fn(async () => ok(null));
    vi.stubGlobal('fetch', fetch);
    await deletePartner(3, 5);
    expect(fetch.mock.calls[0][0]).toBe('http://localhost:8080/api/v1/admin/partners/3?version=5');
    expect(fetch.mock.calls[0][1].method).toBe('DELETE');
    await savePlacementOrder('HOME_MAIN', [{ id: 1, displayOrder: 0, version: 4, name: 'x' }]);
    expect(fetch.mock.calls[1][0]).toBe('http://localhost:8080/api/v1/admin/placements/order');
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({ slot: 'HOME_MAIN', items: [{ id: 1, displayOrder: 0, version: 4 }] });
  });

  it.each([
    ['Access 로그인 redirect', () => ({ ok: false, status: 0, type: 'opaqueredirect', headers: { get: () => null }, json: async () => null }), 'login'],
    ['200 HTML 로그인 화면', () => ({ ok: true, status: 200, type: 'basic', headers: { get: () => 'text/html' }, json: async () => { throw new SyntaxError('x'); } }), 'login'],
    ['401', () => json(401, { code: 'AUTH401', message: '인증 필요' }), 'login'],
    ['403', () => json(403, { code: 'AUTH403', message: '권한 없음' }), 'forbidden'],
    ['404', () => json(404, { code: 'COMMON404', message: '없음' }), 'notFound'],
    ['409', () => json(409, { code: 'PARTNER409', message: '충돌' }), 'conflict'],
    ['400', () => json(400, { code: 'PARTNER400', message: '기간이 잘못됐습니다' }), 'validation'],
  ])('classifiesFailures — %s → %s', async (_, response, kind) => {
    vi.stubGlobal('fetch', vi.fn(async () => response()));
    const err = await getAdminMe().catch((e) => e);
    expect(err).toBeInstanceOf(AdminApiError);
    expect(err.kind).toBe(kind);
  });

  it('networkFailureIsNetwork — 네트워크 실패는 network', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    expect((await getAdminMe().catch((e) => e)).kind).toBe('network');
  });

  it('loginUrlIsFixedSessionEndpoint — 로그인은 고정 session 주소(귀환 주소 인자 없음)', () => {
    expect(adminLoginUrl()).toBe('http://localhost:8080/api/v1/admin/session');
  });
});
