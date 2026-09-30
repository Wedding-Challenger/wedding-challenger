import request from './client';
import { fallbackVendors } from '../data/fallback';

function normalizeVendor(v) {
  return {
    ...v,
    image: v.imageUrl,
    price: v.prices?.[0]?.price ?? 0,
  };
}

export async function getVendors(category) {
  const query = category ? `?category=${category}` : '';
  try {
    const data = await request(`/api/vendors${query}`);
    return (data.vendors ?? []).map(normalizeVendor);
  } catch (err) {
    console.warn('업체 API 실패, 내장 데이터 사용:', err.message);
    return fallbackVendors(category);
  }
}

export async function getVendorDetail(id) {
  const data = await request(`/api/vendors/${id}`);
  return normalizeVendor(data);
}
