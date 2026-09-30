import request from './client';
import { FALLBACK_HALLS } from '../data/fallback';

function normalizeHall(h) {
  const prices = h.prices ?? [];
  const food = prices.find((p) => p.priceType === 'food');
  const rent = prices.find((p) => p.priceType === 'rent');
  const deco = prices.find((p) => p.priceType === 'deco');
  return {
    ...h,
    image: h.imageUrl,
    homepage: h.homepageUrl,
    capacity: { min: h.capacityMin, max: h.capacityMax },
    pricePerPerson: food?.priceMin ?? 0,
    priceBreakdown: {
      food: { min: food?.priceMin ?? 0, max: food?.priceMax ?? food?.priceMin ?? 0 },
      rent: { min: rent?.priceMin ?? 0, max: rent?.priceMax ?? rent?.priceMin ?? 0 },
      deco: { min: deco?.priceMin ?? 0, max: deco?.priceMax ?? deco?.priceMin ?? 0 },
    },
  };
}

export async function getHalls() {
  try {
    const data = await request('/api/halls');
    return (data.halls ?? []).map(normalizeHall);
  } catch (err) {
    console.warn('웨딩홀 API 실패, 내장 데이터 사용:', err.message);
    return FALLBACK_HALLS;
  }
}

export async function getHallDetail(id) {
  const data = await request(`/api/halls/${id}`);
  return normalizeHall(data);
}
