// VITE_API_BASE_URL 은 백엔드 origin 만 담는다 (예: http://localhost:8080). /api/v1 은 여기서 붙인다.
const BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080').replace(/\/+$/, '');
export const API_PREFIX = '/api/v1';

export const API_BASE_URL = BASE_URL;

// 백엔드 BaseResponse { code, message, result } 를 풀어 result 만 돌려준다. 성공 코드는 COMMON200.
// init 은 fetch 옵션(공개 제휴 목록의 no-store 등). 없으면 기존처럼 URL 만 넘긴다.
// 관리 API(/api/v1/admin/**)는 쿠키·오류 분류가 달라 src/api/adminPartners.js 가 따로 부른다.
async function request(path, init) {
  const url = `${BASE_URL}${API_PREFIX}${path}`;
  const res = await (init ? fetch(url, init) : fetch(url));
  const json = await res.json().catch(() => null);
  if (!res.ok || json?.code !== 'COMMON200') {
    throw new Error(`API error: ${res.status} ${json?.code ?? ''} ${path}`.trim());
  }
  return json.result;
}

export default request;
