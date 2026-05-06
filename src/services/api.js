const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';
const USE_API = import.meta.env.VITE_USE_API === 'true';

class ApiError extends Error {
  constructor(code, message, status) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function fetchJson(path) {
  const res = await fetch(API_BASE + path);
  if (!res.ok) throw new ApiError('HTTP_' + res.status, `HTTP ${res.status}`, res.status);
  const wrapped = await res.json();
  if (wrapped.code !== 'COMMON200') throw new ApiError(wrapped.code, wrapped.message, res.status);
  return wrapped.result;
}

export const isApiEnabled = () => USE_API;

export async function getWeddingHalls() { return fetchJson('/wedding-halls'); }
export async function getWeddingHall(id) { return fetchJson(`/wedding-halls/${id}`); }
export async function getVendors(category, page = 0, size = 20) {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  params.set('page', String(page));
  params.set('size', String(size));
  return fetchJson('/vendors?' + params.toString());
}
export async function getVendor(id) { return fetchJson(`/vendors/${id}`); }
export async function getMarketPrice(category, region) {
  return fetchJson(`/market-prices?category=${encodeURIComponent(category)}&region=${encodeURIComponent(region)}`);
}
export async function getMarketPriceCategories() { return fetchJson('/market-prices/categories'); }

export function adaptHallFromApi(h) {
  return {
    id: 'wh' + h.id,
    name: h.name,
    location: h.location || h.region || '',
    type: h.hallType || '예식장',
    capacity: { min: h.capacityMin ?? 0, max: h.capacityMax ?? 0 },
    pricePerPerson: h.pricePerPerson ?? h.foodMax ?? 0,
    intervalMinutes: h.intervalMinutes ?? 60,
    availableTimes: h.availableTimes ?? [],
    image: h.imageUrl || '/images/wedding/hall-default.svg',
    homepage: h.homepage || '',
    features: h.features ?? [],
    rating: h.rating ?? 0,
  };
}

export function adaptVendorFromApi(v) {
  return {
    id: v.category.toLowerCase().slice(0, 2) + v.id,
    name: v.name,
    category: v.category.toLowerCase(),
    price: v.price,
    description: v.description || '',
    image: v.imageUrl || '/images/wedding/vendor-default.svg',
    includes: v.includes || [],
    rating: v.rating ?? 0,
  };
}
