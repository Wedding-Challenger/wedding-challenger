import request from './client';

// 공개 제휴 업체 목록 (계획서 §3.3 계약): GET /api/v1/partners?slot=HOME_MAIN|BUDGET_PARTNERS
// result = { slot, slotEnabled, serverTime, refreshAt, items: [{ placementId, partnerId, name, category, region,
//   summary, imageUrl, destinationUrl, disclosure, visibleUntil }] } — 단가·계약 정보는 오지 않는다.
// 슬롯 on/off 는 서버 응답(slotEnabled)이 유일한 출처다. 실패하면 내장 샘플 없이 실패한다(가짜 제휴 금지).
// 화면 모델·신선도 판정은 src/lib/partnerFeed.js, 주기 재조회는 src/hooks/usePartnerFeed.js 가 맡는다.
export const PARTNER_SLOTS = ['HOME_MAIN', 'BUDGET_PARTNERS'];

export async function getPartners(slot) {
  if (!PARTNER_SLOTS.includes(slot)) throw new Error(`알 수 없는 제휴 슬롯: ${slot}`);
  // 광고 목록은 캐시하지 않는다(종료·철회가 늦게 반영되지 않게). 공개 조회라 쿠키를 보내지 않는다.
  return request(`/partners?slot=${slot}`, { cache: 'no-store', credentials: 'omit' });
}
