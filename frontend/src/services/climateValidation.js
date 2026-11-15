import { ApiError } from './api.js';
import { calendarDay, validIsoDate, validPeriod } from '../utils/dates.js';
import { combineOrigins } from './provenance.js';
export const CLIMATE_UNITS = { precipitacion: 'mm', temperaturaMedia: '°C', temperaturaMaxima: '°C' };
const text = value => typeof value === 'string' && value.trim().length > 0;
const point = p => Number.isFinite(p?.latitude) && Math.abs(p.latitude) <= 90 && Number.isFinite(p?.longitude) && Math.abs(p.longitude) <= 180;
const percentage = p => Number.isFinite(p) && p >= 0 && p <= 100;
export function validateClimate(raw) {
  const fail = () => { throw new ApiError('El historial recibido no permite comprobar sus fechas, cobertura o procedencia. Intenta de nuevo más tarde.', { code: 'INVALID_CLIMATE_HISTORY' }); };
  if (!raw || !point(raw.coordenadas?.solicitadas) || !point(raw.coordenadas?.devueltas) || !validPeriod(raw.periodo) || raw.resolucion !== 'diaria' || !Array.isArray(raw.fuentes) || !raw.fuentes.length) fail();
  const demo = raw.origen === 'demo';
  const originValid = o => ['live', 'backup'].includes(o) || (demo && o === 'demo');
  const sources = new Map();
  for (const source of raw.fuentes) {
    if (!source || !text(source.id) || sources.has(source.id) || !text(source.proveedor) || !point(source.coordenadasSolicitadas) || !point(source.coordenadasDevueltas) || !validPeriod(source.periodo) || !validIsoDate(source.fechaConsulta) || !percentage(source.cobertura?.porcentaje) || !originValid(source.origen)) fail();
    if (source.origen === 'backup' && !text(source.antiguedad)) fail();
    if (source.origen !== 'demo') {
      try { const url = new URL(source.urlConsulta); if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) fail(); } catch { fail(); }
    }
    for (const [name, unit] of Object.entries(CLIMATE_UNITS)) if (source.unidades?.[name] !== unit) fail();
    sources.set(source.id, source);
  }
  const days = calendarDay(raw.periodo.fin) - calendarDay(raw.periodo.inicio) + 1;
  for (const [name, unit] of Object.entries(CLIMATE_UNITS)) {
    const variable = raw.variables?.[name], source = sources.get(variable?.fuenteId);
    if (!variable || variable.unidad !== unit || !validPeriod(variable.fechas) || variable.fechas.inicio !== raw.periodo.inicio || variable.fechas.fin !== raw.periodo.fin || !validIsoDate(variable.fechaConsulta) || !originValid(variable.procedencia) || !source || source.origen !== variable.procedencia || !Array.isArray(variable.serie) || variable.serie.length !== days) fail();
    const missing = [];
    variable.serie.forEach((item, index) => {
      if (!item || calendarDay(item.fecha) !== calendarDay(raw.periodo.inicio) + index || (item.valor !== null && (!Number.isFinite(item.valor) || item.valor === -999))) fail();
      if (item.valor === null) missing.push(item.fecha);
    });
    const coverage = variable.cobertura;
    if (!coverage || coverage.diasEsperados !== days || coverage.diasPresentes !== days - missing.length || !percentage(coverage.porcentaje) || Math.abs(coverage.porcentaje - (days - missing.length) / days * 100) > 0.01 || !Array.isArray(coverage.faltantes) || coverage.faltantes.length !== missing.length || new Set(coverage.faltantes).size !== missing.length || missing.some(date => !coverage.faltantes.includes(date))) fail();
  }
  const origin = combineOrigins(Object.keys(CLIMATE_UNITS).map(name => raw.variables[name].procedencia));
  if (raw.origen != null && raw.origen !== origin) fail();
  return origin;
}
