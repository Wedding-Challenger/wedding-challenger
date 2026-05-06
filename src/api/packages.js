import request from './client';

export async function getPackages() {
  const data = await request('/api/packages');
  return data.packages ?? [];
}
