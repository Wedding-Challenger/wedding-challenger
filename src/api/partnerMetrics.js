import { API_BASE_URL, API_PREFIX } from './client';
import { metricBody } from '../lib/partnerMetrics';

// 제휴 노출·클릭 수집 API (계획서 §3.2): POST /api/v1/partners/metrics, 관리 Access 불필요.
// - 본문은 text/plain;charset=UTF-8 의 JSON 문자열 한 이벤트(단순 요청이라 프리플라이트 없음). 서버가 항상 +1 한다.
// - fetch keepalive + credentials omit + no-referrer: 링크 이동을 막지 않고 쿠키·인증·참조 주소를 보내지 않는다.
//   (sendBeacon 은 credentials 를 끌 수 없어 쓰지 않는다)
// - ACK 가 불분명할 때 다시 보내면 중복이 생기므로 재시도·영속 큐는 없다. 실패는 링크·본문을 막지 않는다(best effort).
export const METRICS_PATH = `${API_PREFIX}/partners/metrics`;

export async function sendPartnerMetric(event) {
  let body;
  try {
    body = metricBody(event);
  } catch {
    return false;
  }
  try {
    const res = await fetch(`${API_BASE_URL}${METRICS_PATH}`, {
      method: 'POST',
      keepalive: true,
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      cache: 'no-store',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body,
    });
    return res.ok;
  } catch {
    return false;
  }
}
