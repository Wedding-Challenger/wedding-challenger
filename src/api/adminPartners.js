import { API_BASE_URL, API_PREFIX } from './client';
import { orderPayload } from '../lib/partnerAdmin';

// 관리 API 클라이언트 (/api/v1/admin/**, 계획서 §3.2·§3.3).
// - 보호는 Cloudflare Access + BE 의 Access JWT 검증이 한다. 브라우저는 API host 의 Access 쿠키만 보낸다(credentials include).
//   JWT 를 JS·localStorage 로 옮기지 않는다.
// - Access 가 로그인 화면으로 보내는 응답(redirect·HTML)을 성공으로 보지 않는다: redirect 는 따라가지 않고(manual),
//   JSON 이 아닌 응답은 '로그인 필요'로 분류한다.
// - 쓰기 요청은 JSON + X-WC-Admin-Request 표지 헤더. 자동 재시도는 하지 않는다(성공 뒤 다시 읽기).
const ADMIN = `${API_PREFIX}/admin`;

export class AdminApiError extends Error {
  constructor(kind, status, message, code) {
    super(message || kind);
    this.name = 'AdminApiError';
    this.kind = kind; // login | forbidden | notFound | conflict | validation | network | server
    this.status = status;
    this.code = code;
  }
}

const KIND_BY_STATUS = { 400: 'validation', 401: 'login', 403: 'forbidden', 404: 'notFound', 409: 'conflict' };

export async function adminRequest(path, { method = 'GET', body } = {}) {
  const headers = { Accept: 'application/json', 'X-WC-Admin-Request': '1' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  let res;
  try {
    res = await fetch(`${API_BASE_URL}${ADMIN}${path}`, {
      method,
      credentials: 'include',
      cache: 'no-store',
      redirect: 'manual',
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (err) {
    throw new AdminApiError('network', 0, err.message);
  }
  // Access 로그인 redirect (cross-origin redirect 는 opaqueredirect·status 0 으로 온다)
  if (res.type === 'opaqueredirect' || res.status === 0) throw new AdminApiError('login', res.status);
  const json = await res.json().catch(() => null);
  if (!json) {
    // 2xx 인데 JSON 이 아니면 Access 로그인 HTML 로 본다
    throw new AdminApiError(res.ok ? 'login' : KIND_BY_STATUS[res.status] ?? 'server', res.status);
  }
  if (!res.ok || json.code !== 'COMMON200') {
    throw new AdminApiError(KIND_BY_STATUS[res.status] ?? 'server', res.status, json.message, json.code);
  }
  return json.result;
}

// 파일(CSV) 내려받기: 같은 Access 쿠키·redirect 수동·표지 헤더. 2xx 인데 요청한 형식이 아니면(로그인 HTML) '로그인 필요'.
// 오류 응답은 JSON 본문이면 그 분류·메시지를 쓴다. 성공하면 Blob.
export async function adminDownload(path, accept) {
  let res;
  try {
    res = await fetch(`${API_BASE_URL}${ADMIN}${path}`, {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
      redirect: 'manual',
      headers: { Accept: accept, 'X-WC-Admin-Request': '1' },
    });
  } catch (err) {
    throw new AdminApiError('network', 0, err.message);
  }
  if (res.type === 'opaqueredirect' || res.status === 0) throw new AdminApiError('login', res.status);
  const type = res.headers?.get?.('content-type') ?? '';
  if (!res.ok) {
    const json = type.includes('json') ? await res.json().catch(() => null) : null;
    throw new AdminApiError(KIND_BY_STATUS[res.status] ?? 'server', res.status, json?.message, json?.code);
  }
  if (!type.toLowerCase().startsWith(accept)) throw new AdminApiError('login', res.status);
  return res.blob();
}

// 목록 응답은 배열 또는 페이지({ items, … }) 둘 다 받는다
export const listItems = (result) => (Array.isArray(result) ? result : result?.items ?? []);

// API Access 세션을 만드는 최상위 페이지 이동 주소. 돌아올 주소는 서버의 환경별 고정 목록이 정한다(인자로 넘기지 않음).
export const adminLoginUrl = () => `${API_BASE_URL}${ADMIN}/session`;

export const getAdminMe = () => adminRequest('/me');
export const getAdminPartners = () => adminRequest('/partners?size=100');

// 관리 업체 전체(리포트 업체 필터용). 페이지 응답({ items, page, totalPages } 또는 { items, hasNext })이면 끝까지 받고,
// 배열 응답이면 한 번. 페이지 번호는 0부터. 서버 이상으로 끝나지 않는 일을 막으려 최대 50페이지.
const PARTNER_PAGE_SIZE = 100;
const MAX_PARTNER_PAGES = 50;

export async function getAllAdminPartners() {
  const all = [];
  for (let page = 0; page < MAX_PARTNER_PAGES; page++) {
    const result = await adminRequest(`/partners?page=${page}&size=${PARTNER_PAGE_SIZE}`);
    if (Array.isArray(result)) return [...all, ...result];
    const items = result?.items ?? [];
    all.push(...items);
    const more = typeof result?.hasNext === 'boolean'
      ? result.hasNext
      : Number.isInteger(result?.totalPages) && page + 1 < result.totalPages;
    if (!more || items.length === 0) break;
  }
  return all;
}
export const getAdminPartner = (id) => adminRequest(`/partners/${encodeURIComponent(id)}`);
export const getAdminPlacements = (slot) => adminRequest(`/placements?slot=${encodeURIComponent(slot)}`);
export const getAdminAudit = (partnerId) => adminRequest(`/audit?partnerId=${encodeURIComponent(partnerId)}`);
export const searchCatalog = (kind, query) =>
  adminRequest(`/catalog?kind=${encodeURIComponent(kind)}&query=${encodeURIComponent(query)}`);

// id 가 있으면 수정(PUT, body 에 version 포함), 없으면 등록(POST)
function save(collection, { id, ...body }) {
  return id == null
    ? adminRequest(`/${collection}`, { method: 'POST', body })
    : adminRequest(`/${collection}/${id}`, { method: 'PUT', body });
}

export const savePartner = (partner) => save('partners', partner);
export const savePlacement = (placement) => save('placements', placement);
export const deletePartner = (id, version) => adminRequest(`/partners/${id}?version=${version}`, { method: 'DELETE' });
export const deletePlacement = (id, version) => adminRequest(`/placements/${id}?version=${version}`, { method: 'DELETE' });

// 한 슬롯의 순서를 한 트랜잭션으로 바꾼다. 하나라도 version 이 어긋나면 서버가 전체 409·원복
export const savePlacementOrder = (slot, items) =>
  adminRequest('/placements/order', { method: 'PUT', body: orderPayload(slot, items) });
