import request from './client';

function normalizeVendor(v) {
  return {
    ...v,
    image: v.imageUrl,
    price: v.prices?.[0]?.price ?? 0,
  };
}

export async function getVendors(category) {
  const query = category ? `?category=${category}` : '';
  const data = await request(`/api/vendors${query}`);
  return (data.vendors ?? []).map(normalizeVendor);
}

export async function getVendorDetail(id) {
  const data = await request(`/api/vendors/${id}`);
  return normalizeVendor(data);
}
