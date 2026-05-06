import request from './client';

function normalizeHall(h) {
  const foodPrice = h.prices?.find((p) => p.priceType === 'food');
  return {
    ...h,
    image: h.imageUrl,
    homepage: h.homepageUrl,
    capacity: { min: h.capacityMin, max: h.capacityMax },
    pricePerPerson: foodPrice?.priceMin ?? 0,
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
