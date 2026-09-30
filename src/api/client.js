// VITE_API_BASE_URL 은 백엔드 origin 만 담는다 (예: http://localhost:8080). /api/v1 은 여기서 붙인다.
const BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080').replace(/\/+$/, '');
export const API_PREFIX = '/api/v1';

// 백엔드 BaseResponse { code, message, result } 를 풀어 result 만 돌려준다. 성공 코드는 COMMON200.
async function request(path) {
  const res = await fetch(`${BASE_URL}${API_PREFIX}${path}`);
  const json = await res.json().catch(() => null);
  if (!res.ok || json?.code !== 'COMMON200') {
    throw new Error(`API error: ${res.status} ${json?.code ?? ''} ${path}`.trim());
  }
  return json.result;
}

export default request;
