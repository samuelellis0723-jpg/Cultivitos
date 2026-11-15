import { fetchJson } from './api.js';
import { adaptSimulationResponse } from './adapters.js';

export async function postSimulation(payload, signal) {
  const data = await fetchJson('/api/simulations', {
    method: 'POST',
    body: payload,
    signal,
    timeoutMs: 12000,
  });
  return adaptSimulationResponse(data);
}
