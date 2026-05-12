import request from './client';

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
  const data = await request('/api/halls');
  return (data.halls ?? []).map(normalizeHall);
}

export async function getHallDetail(id) {
  const data = await request(`/api/halls/${id}`);
  return normalizeHall(data);
}
