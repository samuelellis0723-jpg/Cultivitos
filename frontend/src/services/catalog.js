import { fetchJson } from './api.js';
import { adaptCatalog } from './adapters.js';

export async function getCatalog(signal) {
  const data = await fetchJson('/api/catalog', { signal, timeoutMs: 8000 });
  return adaptCatalog(data);
}
