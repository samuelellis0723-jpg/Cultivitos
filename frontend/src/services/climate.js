import { validPeriod } from '../utils/dates.js';
import { fetchJson, ApiError } from './api.js';
import { adaptClimateForecast, adaptClimateHistory } from './adapters.js';

export async function getClimateHistory({ latitude, longitude, start = import.meta.env?.VITE_HISTORY_START, end = import.meta.env?.VITE_HISTORY_END }, signal) {
  if (!validPeriod({ inicio: start, fin: end })) {
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
  const history = adaptClimateHistory(data);
  if (history.periodo.inicio !== start || history.periodo.fin !== end || history.coordenadas.solicitadas.latitude !== Number(latitude) || history.coordenadas.solicitadas.longitude !== Number(longitude)) {
    throw new ApiError('El historial recibido no corresponde al período o a la ubicación que elegiste.', { code: 'INVALID_CLIMATE_HISTORY' });
  }
  return history;
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
