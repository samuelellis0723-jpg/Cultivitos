import { fetchJson } from './api.js';
import { adaptClimateForecast, adaptClimateHistory } from './adapters.js';

export async function getClimateHistory({ latitude, longitude, start = import.meta.env?.VITE_HISTORY_START, end = import.meta.env?.VITE_HISTORY_END }, signal) {
  if (!/^\d{8}$/.test(start ?? '') || !/^\d{8}$/.test(end ?? '') || start > end) {
    throw new Error('Historial pendiente: configura VITE_HISTORY_START y VITE_HISTORY_END (YYYYMMDD) según el período climático acordado.');
  }
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    start,
    end,
  });
  const data = await fetchJson(`/api/climate/history?${params.toString()}`, {
    signal,
    timeoutMs: 12000,
  });
  return adaptClimateHistory(data);
}

export async function getClimateForecast({ latitude, longitude }, signal) {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
  });
  const data = await fetchJson(`/api/climate/forecast?${params.toString()}`, {
    signal,
    timeoutMs: 8000,
  });
  return adaptClimateForecast(data);
}
