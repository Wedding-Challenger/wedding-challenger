import request from './client';
import { fallbackVendors } from '../data/fallback';

// 한 카테고리당 업체 수가 적어 첫 페이지로 전부 받는다 (백엔드 기본 size=20)
const PAGE_SIZE = 100;

// 백엔드 VendorResponse(category 는 대문자 enum) → 화면용 모양 (category 소문자, mockData 와 같은 키)
export function normalizeVendor(v) {
  const category = v.category.toLowerCase();
  return {
    ...v,
    category,
    image: v.imageUrl ?? `/images/wedding/${category}-default.svg`,
    includes: v.includes ?? [],
  };
}

export async function getVendors(category) {
  const params = new URLSearchParams({ size: String(PAGE_SIZE) });
  if (category) params.set('category', category.toUpperCase());
  try {
    const data = await request(`/vendors?${params}`);
    return data.items.map(normalizeVendor);
  } catch (err) {
    console.warn('업체 API 실패, 내장 데이터 사용:', err.message);
    return fallbackVendors(category);
  }
}

export async function getVendorDetail(id) {
  return normalizeVendor(await request(`/vendors/${id}`));
}
