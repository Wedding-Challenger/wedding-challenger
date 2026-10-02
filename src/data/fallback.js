// API 서버(VITE_API_BASE_URL)에 연결할 수 없을 때 쓰는 내장 샘플 데이터.
// 사전 렌더링 HTML 에도 카드가 들어가도록 목록 컴포넌트의 초기값으로도 쓴다.
import { weddingHalls, studios, dresses, makeups, snaps, rings, bouquets, hanboks } from './mockData';

// API 응답을 normalizeHall 한 모양에 맞춘다. 샘플의 example.com 링크는 노출하지 않는다.
export const FALLBACK_HALLS = weddingHalls.map((h) => ({
  ...h,
  homepage: h.homepage === 'https://example.com' ? null : h.homepage,
  // 샘플에는 대관료 정보가 없다
  rentDisclosed: false,
  priceBreakdown: {
    food: { min: h.pricePerPerson, max: h.pricePerPerson },
    rent: { min: 0, max: 0 },
    deco: { min: 0, max: 0 },
  },
}));

const FALLBACK_VENDORS = [...studios, ...dresses, ...makeups, ...snaps, ...rings, ...bouquets, ...hanboks];

export function fallbackVendors(category) {
  return category ? FALLBACK_VENDORS.filter((v) => v.category === category) : FALLBACK_VENDORS;
}
