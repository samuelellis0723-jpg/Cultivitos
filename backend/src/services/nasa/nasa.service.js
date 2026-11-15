import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
export const PARAMETERS = ['PRECTOTCORR', 'T2M', 'T2M_MAX'];
export const HISTORY_PERIOD = { start: '20150101', end: '20241231' };
const UNITS = { precipitacion: 'mm', temperaturaMedia: '°C', temperaturaMaxima: '°C' };
const FIELDS = { precipitacion: 'PRECTOTCORR', temperaturaMedia: 'T2M', temperaturaMaxima: 'T2M_MAX' };
const DAY = 86400000;

export class ClimateError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}
const invalid = message => { throw new ClimateError(400, 'INVALID_CLIMATE_QUERY', message); };
const malformed = message => { throw new ClimateError(502, 'INVALID_NASA_RESPONSE', message); };
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
function dateMs(value) {
  if (typeof value !== 'string' || !/^\d{8}$/.test(value)) return NaN;
  const date = new Date(`${value.slice(0,4)}-${value.slice(4,6)}-${value.slice(6,8)}T00:00:00Z`);
  return Number.isFinite(+date) && date.toISOString().slice(0,10).replaceAll('-', '') === value ? +date : NaN;
}
function coordinate(value, name, limit) {
  if (typeof value !== 'number' && (typeof value !== 'string' || !/^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value))) invalid(`${name} debe ser un número explícito.`);
  const result = Number(value);
  if (!Number.isFinite(result) || Math.abs(result) > limit) invalid(`${name} está fuera del rango permitido.`);
  return result;
}
export function validateHistoryQuery(input = {}) {
  const allowed = new Set(['latitude', 'longitude', 'start', 'end']);
  if (!object(input) || Object.keys(input).some(key => !allowed.has(key))) invalid('Usa latitude, longitude, start y end; no se aceptan parámetros adicionales.');
  const latitude = coordinate(input.latitude, 'latitude', 90);
  const longitude = coordinate(input.longitude, 'longitude', 180);
  const { start, end } = input;
  if (!Number.isFinite(dateMs(start)) || !Number.isFinite(dateMs(end)) || start > end) invalid('start y end deben ser fechas válidas YYYYMMDD, en orden.');
  // Límite técnico del servicio: historia diaria disponible desde 1981, nunca fechas futuras.
  const today = new Date().toISOString().slice(0,10).replaceAll('-', '');
  if (start < '19810101' || end > today) invalid('El historial debe estar entre 19810101 y la fecha actual.');
  return { latitude, longitude, start, end };
}
export function nasaUrl(query) {
  const url = new URL('https://power.larc.nasa.gov/api/temporal/daily/point');
  url.search = new URLSearchParams({ parameters: PARAMETERS.join(','), community: 'AG', longitude: String(query.longitude), latitude: String(query.latitude), start: query.start, end: query.end, format: 'JSON', 'time-standard': 'LST' });
  return url.href;
}
function matchesNasaUrl(value, query) {
  try {
    const actual = new URL(value), expected = new URL(nasaUrl(query));
    if (actual.origin !== expected.origin || actual.pathname !== expected.pathname || actual.username || actual.password || actual.hash) return false;
    if (!actual.searchParams.has('time-standard')) actual.searchParams.set('time-standard', 'LST');
    if ([...actual.searchParams.keys()].length !== [...expected.searchParams.keys()].length) return false;
    for (const [key, value] of expected.searchParams) {
      const received = actual.searchParams.get(key);
      if (key === 'parameters') {
        if (received?.split(',').sort().join(',') !== PARAMETERS.join(',')) return false;
      } else if (received !== value) return false;
    }
    return true;
  } catch { return false; }
}
export function cacheName(query) {
  return `nasa-v1-${createHash('sha256').update(nasaUrl(query)).digest('hex')}.json`;
}
function datesBetween(start, end) {
  const dates = [];
  for (let t = dateMs(start); t <= dateMs(end); t += DAY) dates.push(new Date(t).toISOString().slice(0,10).replaceAll('-', ''));
  return dates;
}

// Transport adapter only: no thresholds, scenarios, scores or agronomic imputation.
export function adaptNasaResponse(raw, query, { fechaConsulta, origen = 'live', now = Date.now(), urlConsulta = nasaUrl(query) } = {}) {
  if (!['live', 'backup'].includes(origen) || typeof fechaConsulta !== 'string' || !Number.isFinite(Date.parse(fechaConsulta)) || Date.parse(fechaConsulta) > now) malformed('Fecha o procedencia de la consulta no verificable.');
  if (!object(raw) || raw.header?.start !== query.start || raw.header?.end !== query.end || raw.header?.time_standard !== 'LST') malformed('NASA no confirmó el período o el estándar temporal solicitado.');
  const coords = raw.geometry?.coordinates;
  if (raw.geometry?.type !== 'Point' || !Array.isArray(coords) || !Number.isFinite(coords[0]) || Math.abs(coords[0]) > 180 || !Number.isFinite(coords[1]) || Math.abs(coords[1]) > 90) malformed('NASA no entregó coordenadas válidas.');
  const expectedUnits = { PRECTOTCORR: 'mm/day', T2M: 'C', T2M_MAX: 'C' };
  if (PARAMETERS.some(p => raw.parameters?.[p]?.units !== expectedUnits[p])) malformed('Las unidades de NASA no coinciden con el adaptador diario.');
  const params = raw.properties?.parameter;
  if (!object(params) || PARAMETERS.some(p => !object(params[p])) || !Number.isFinite(raw.header.fill_value)) malformed('NASA no entregó las tres series y su marcador de datos faltantes.');
  const dates = datesBetween(query.start, query.end);
  const period = { inicio: query.start, fin: query.end };
  const requested = { latitude: query.latitude, longitude: query.longitude };
  const returned = { latitude: coords[1], longitude: coords[0] };
  const variables = {};
  for (const [name, parameter] of Object.entries(FIELDS)) {
    if (Object.keys(params[parameter]).some(date => !Number.isFinite(dateMs(date)) || date < query.start || date > query.end)) malformed('NASA entregó fechas fuera del período o inválidas.');
    const serie = dates.map(fecha => {
      const value = params[parameter][fecha];
      const valid = Number.isFinite(value) && value !== raw.header.fill_value && (parameter !== 'PRECTOTCORR' || value >= 0);
      return { fecha, valor: valid ? value : null };
    });
    const faltantes = serie.filter(row => row.valor === null).map(row => row.fecha);
    variables[name] = {
      unidad: UNITS[name], unidadOriginal: expectedUnits[parameter], parametroOriginal: parameter,
      // Rate averaged over one daily interval × 1 day = depth in mm for that day.
      transformacion: parameter === 'PRECTOTCORR' ? 'mm/day × 1 día = mm por intervalo diario LST' : 'C → °C (misma escala)',
      fechas: period, procedencia: origen, fechaConsulta, fuenteId: 'nasa_power_daily',
      cobertura: { diasEsperados: dates.length, diasPresentes: dates.length - faltantes.length, porcentaje: (dates.length - faltantes.length) / dates.length * 100, faltantes }, serie,
    };
  }
  const present = Object.values(variables).reduce((sum, v) => sum + v.cobertura.diasPresentes, 0);
  if (present === 0) throw new ClimateError(502, 'NASA_NO_DATA', 'NASA no devolvió datos utilizables para esta ubicación y período.');
  const source = {
    id: 'nasa_power_daily', proveedor: 'NASA POWER (AG Community)', urlConsulta, fechaConsulta, origen,
    coordenadasSolicitadas: requested, coordenadasDevueltas: returned, periodo: period, unidades: UNITS,
    unidadesOriginales: expectedUnits, parametros: PARAMETERS, estandarTemporal: 'LST',
    cobertura: { porcentaje: present / (dates.length * PARAMETERS.length) * 100 },
    coberturaPorVariable: Object.fromEntries(Object.entries(variables).map(([key, v]) => [key, v.cobertura])),
    ...(origen === 'backup' ? { antiguedad: `${Math.floor((now - Date.parse(fechaConsulta)) / 1000)} segundos desde la consulta original` } : {}),
  };
  return { coordenadas: { solicitadas: requested, devueltas: returned }, periodo: period, resolucion: 'diaria', origen, variables, fuentes: [source] };
}

export function createNasaService({ fetchImpl = (...args) => fetch(...args), cacheDir = path.join(ROOT, 'backend/data/cache'), backupDir = path.join(ROOT, 'backend/data/backups'), timeoutMs = 9000, now = () => Date.now(), onDiagnostic = () => {} } = {}) {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new TypeError('timeoutMs debe ser positivo.');
  async function readSnapshot(file, query) {
    try {
      const saved = JSON.parse(await fs.readFile(file, 'utf8'));
      if (saved.schemaVersion !== 1 || !object(saved.consulta) || Object.keys(saved.consulta).length !== 4 || Object.entries(query).some(([key, value]) => saved.consulta[key] !== value) || !matchesNasaUrl(saved.urlConsulta, query)) throw new Error('Consulta o formato de respaldo no verificable.');
      return adaptNasaResponse(saved.raw, query, { fechaConsulta: saved.fechaConsulta, origen: 'backup', now: now(), urlConsulta: saved.urlConsulta });
    } catch (error) {
      if (error.code !== 'ENOENT') onDiagnostic({ code: 'SNAPSHOT_REJECTED', message: 'Se omitió una copia inválida o que no corresponde a la consulta.' });
      return null;
    }
  }
  return async function getHistory(input) {
    const query = validateHistoryQuery(input);
    const name = cacheName(query);
    if (cacheDir) {
      const cached = await readSnapshot(path.join(cacheDir, name), query);
      if (cached) return cached;
    }
    const url = nasaUrl(query);
    let raw, fechaConsulta, climate;
    const controller = new AbortController();
    let timer;
    try {
      const deadline = new Promise((_, reject) => {
        timer = setTimeout(() => { controller.abort(); reject(new ClimateError(504, 'NASA_TIMEOUT', 'NASA tardó demasiado en responder. Intenta de nuevo.')); }, timeoutMs);
      });
      const operation = (async () => {
        const response = await fetchImpl(url, { signal: controller.signal });
        if (!response.ok) throw new ClimateError(502, 'NASA_UNAVAILABLE', 'No se pudo obtener el historial de NASA.');
        const result = await response.json();
        return result;
      })();
      raw = await Promise.race([operation, deadline]);
      fechaConsulta = new Date(now()).toISOString();
      climate = adaptNasaResponse(raw, query, { fechaConsulta, now: now(), urlConsulta: url });
    } catch (error) {
      if (backupDir) {
        const backup = await readSnapshot(path.join(backupDir, name), query);
        if (backup) return backup;
      }
      if (error instanceof ClimateError) throw error;
      throw new ClimateError(502, 'NASA_UNAVAILABLE', 'No se pudo leer el historial de NASA y no hay un respaldo verificable para esta consulta.');
    } finally { clearTimeout(timer); }
    if (cacheDir) {
      const temporary = path.join(cacheDir, `${name}.${randomUUID()}.tmp`);
      try {
        await fs.mkdir(cacheDir, { recursive: true });
        await fs.writeFile(temporary, JSON.stringify({ schemaVersion: 1, consulta: query, urlConsulta: url, fechaConsulta, raw }));
        await fs.rename(temporary, path.join(cacheDir, name));
      } catch {
        onDiagnostic({ code: 'CACHE_WRITE_FAILED', message: 'El historial se obtuvo, pero no se pudo guardar la caché.' });
      } finally { await fs.rm(temporary, { force: true }).catch(() => {}); }
    }
    return climate;
  };
}
export const getNasaHistoricalClimateSeries = createNasaService();
