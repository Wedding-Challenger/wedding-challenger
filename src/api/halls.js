import request from './client';
import { FALLBACK_HALLS } from '../data/fallback';

const DEFAULT_HALL_IMAGE = '/images/wedding/hall-default.svg';

const range = (min, max) => ({ min: min ?? 0, max: max ?? min ?? 0 });

// 백엔드 WeddingHallResponse(평면 필드, 비어 있을 수 있음) → 화면용 모양 (mockData 의 weddingHalls 와 같은 키)
export function normalizeHall(h) {
  return {
    ...h,
    type: h.hallType ?? '',
    location: h.location ?? h.region ?? '',
    image: h.imageUrl ?? DEFAULT_HALL_IMAGE,
    homepage: h.homepage ?? null,
    features: h.features ?? [],
    availableTimes: h.availableTimes ?? [],
    capacity: { min: h.capacityMin ?? null, max: h.capacityMax ?? null },
    pricePerPerson: h.pricePerPerson ?? h.foodMin ?? 0,
    priceBreakdown: {
      food: range(h.foodMin ?? h.pricePerPerson, h.foodMax),
      rent: range(h.rentMin, h.rentMax),
      deco: range(h.decoMin, h.decoMax),
    },
  };
}

export async function getHalls() {
  try {
    const data = await request('/wedding-halls');
    return data.map(normalizeHall);
  } catch (err) {
    console.warn('웨딩홀 API 실패, 내장 데이터 사용:', err.message);
    return FALLBACK_HALLS;
  }
}

export async function getHallDetail(id) {
  return normalizeHall(await request(`/wedding-halls/${id}`));
}
