const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8081';

async function request(path) {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) throw new Error(`API error: ${res.status} ${path}`);
  const json = await res.json();
  return json.result;
}

export default request;
