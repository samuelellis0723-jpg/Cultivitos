import { validateClimate } from './climateValidation.js';
import { validIsoDate } from '../utils/dates.js';
import { metadataOrigin } from './provenance.js';
import { ApiError } from './api.js';

export function adaptCatalog(raw) {
  if (!raw || typeof raw !== 'object' || (typeof raw.version !== 'string' || !raw.version.trim()) || !Array.isArray(raw.cultivos) || !Array.isArray(raw.estrategias)) {
    throw new ApiError('El catálogo recibido no cumple con el esquema mínimo esperado.', {
      code: 'INVALID_CATALOG',
    });
  }

  const fail = () => { throw new ApiError('Referencias u opciones inválidas en catálogo.', { code: 'INVALID_CATALOG' }); };
  if (raw.generado != null && !validIsoDate(raw.generado)) fail();
  if (Array.isArray(raw.fuentes) && raw.fuentes.some(f => f.fecha != null && !validIsoDate(f.fecha))) fail();
  const unique = (items) => new Set(items.map(x => x.id)).size === items.length && items.every(x => typeof x.id === 'string' && x.id);
  if (!unique(raw.cultivos) || !unique(raw.estrategias)) fail();
  for (const crop of raw.cultivos) {
    if (!Array.isArray(crop.ciclos) || !unique(crop.ciclos) || crop.ciclos.some(c => c.cultivoId !== crop.id)) fail();
  }
  for (const strategy of raw.estrategias) {
    if (!Array.isArray(strategy.pasos) || strategy.pasos.length !== 2) fail();
    const steps = [...strategy.pasos].sort((a,b) => a.orden-b.orden);
    if (steps.some((p,i) => p.orden !== i+1 || !raw.cultivos.some(c => c.id === p.cultivoId && c.ciclos.some(cycle => cycle.id === p.cicloId)))) fail();
  }
  for (const key of ['suelo','drenaje','riego','prioridad','mesInicio']) {
    const options = raw.opcionesFinca?.[key];
    if (!Array.isArray(options) || !options.length || new Set(options.map(o => o.valor)).size !== options.length || options.some(o => !o.etiqueta || (key === 'mesInicio' ? !Number.isInteger(o.valor) || o.valor < 1 || o.valor > 12 : typeof o.valor !== 'string' || !o.valor))) fail();
  }
  return {
    version: String(raw.version),
    origen: metadataOrigin(raw),
    generado: raw.generado ?? null,
    localidadPiloto: raw.localidadPiloto ?? null,
    fuentes: Array.isArray(raw.fuentes) ? raw.fuentes : [],
    opcionesFinca: raw.opcionesFinca ?? null,
    cultivos: raw.cultivos,
    estrategias: raw.estrategias.map((est) => ({
      ...est,
      pasos: Array.isArray(est.pasos)
        ? [...est.pasos].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
        : [],
    })),
  };
}

export function adaptClimateHistory(raw) {
  const origin = validateClimate(raw);
  const precipSerie = Array.isArray(raw.variables?.precipitacion?.serie)
    ? raw.variables.precipitacion.serie
    : [];
  const tempSerie = Array.isArray(raw.variables?.temperaturaMedia?.serie)
    ? raw.variables.temperaturaMedia.serie
    : [];

  const byDate = new Map();
  for (const item of precipSerie) {
    byDate.set(item.fecha, {
      fecha: `${item.fecha.slice(0,4)}-${item.fecha.slice(4,6)}-${item.fecha.slice(6,8)}`,
      precipitacion: item.valor === undefined ? null : item.valor,
      temperaturaMedia: null,
    });
  }
  for (const item of tempSerie) {
    const existing = byDate.get(item.fecha) ?? {
      fecha: `${item.fecha.slice(0,4)}-${item.fecha.slice(4,6)}-${item.fecha.slice(6,8)}`,
      precipitacion: null,
      temperaturaMedia: null,
    };
    existing.temperaturaMedia = item.valor === undefined ? null : item.valor;
    byDate.set(item.fecha, existing);
  }

  const chartSeries = Array.from(byDate.values()).sort((a, b) =>
    a.fecha.localeCompare(b.fecha)
  );

  return {
    coordenadas: raw.coordenadas ?? null,
    periodo: raw.periodo ?? null,
    resolucion: raw.resolucion ?? 'diaria',
    origen: origin,
    antiguedadHoras: raw.antiguedadHoras ?? null,
    fuentes: Array.isArray(raw.fuentes) ? raw.fuentes : [],
    variables: raw.variables,
    chartSeries,
  };
}

export function adaptClimateForecast(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.dias) || raw.dias.some(d => !d || !validIsoDate(d.fecha) || !['precipitacionMm','tempMediaC'].every(k => d[k] === null || Number.isFinite(d[k]))) || (raw.fechaEmision != null && !validIsoDate(raw.fechaEmision)) || new Set(raw.dias.map(d => d.fecha)).size !== raw.dias.length) {
    throw new ApiError('El pronóstico recibido no tiene el formato esperado.', {
      code: 'INVALID_FORECAST',
    });
  }
  return {
    origen: raw.origen ?? null,
    fechaEmision: raw.fechaEmision ?? null,
    fuente: raw.fuente ?? 'Servidor FIELDVERSE',
    dias: raw.dias,
  };
}

export function adaptSimulationResponse(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.resultados)) {
    throw new ApiError('La respuesta de simulación no contiene resultados válidos.', {
      code: 'INVALID_SIMULATION',
    });
  }

  const fail = () => { throw new ApiError('Contrato de simulación incoherente.', { code: 'INVALID_SIMULATION' }); };
  const escenarios = raw.escenarios;
  if (raw.evidencia?.origen != null && !['live','backup','demo','mixed'].includes(raw.evidencia.origen)) fail();
  if (raw.estado === 'demo' && raw.evidencia?.origen !== 'demo') fail();
  if (!['completo','incompleto','sin_opciones','demo'].includes(raw.estado) || !Array.isArray(escenarios) || escenarios.length !== 3 || new Set(escenarios).size !== 3 || escenarios.some(s => !['habitual','seco','humedo'].includes(s)) || !Array.isArray(raw.ganadoras) || !raw.evidencia) fail();
  const ids = new Set();
  for (const r of raw.resultados) {
    if (!r || typeof r.estrategiaId !== 'string' || !r.estrategiaId || ids.has(r.estrategiaId) || typeof r.elegible !== 'boolean') fail();
    ids.add(r.estrategiaId);
    for (const s of escenarios) {
      const v = r.puntajes?.[s];
      if (v !== null && (!Number.isFinite(v) || v < 0 || v > 100)) fail();
      if (v === null && !r.motivosNoCalculable?.[s] && r.elegible) fail();
    }
    if (!r.elegible && (!Array.isArray(r.motivosDescarte) || !r.motivosDescarte.length || r.motivosDescarte.some(reason => typeof reason !== 'string' || !reason.trim()))) fail();
    if (r.peorArrepentimiento === null && r.elegible && !r.motivoPeorArrepentimiento) fail();
    if (r.peorArrepentimiento !== null && (!Number.isFinite(r.peorArrepentimiento) || r.peorArrepentimiento < 0 || r.peorArrepentimiento > 100)) fail();
  }
  if (raw.descartes !== undefined && (!Array.isArray(raw.descartes) || raw.descartes.some(d => !d || !raw.resultados.some(r => r.estrategiaId === d.estrategiaId && !r.elegible) || !Array.isArray(d.motivos) || !d.motivos.length || d.motivos.some(m => typeof m !== 'string' || !m.trim())))) fail();
  if (new Set(raw.ganadoras).size !== raw.ganadoras.length || raw.ganadoras.some(id => !raw.resultados.some(r => r.estrategiaId === id && r.elegible))) fail();
  if (['incompleto','sin_opciones'].includes(raw.estado) && raw.ganadoras.length) fail();
  if (raw.estado === 'sin_opciones' && raw.resultados.some(r => r.elegible)) fail();
  if (['completo','demo'].includes(raw.estado)) {
    const eligible = raw.resultados.filter(r => r.elegible);
    if (!eligible.length || eligible.some(r => r.peorArrepentimiento === null || escenarios.some(s => r.puntajes[s] === null))) fail();
    const min = Math.min(...eligible.map(r => r.peorArrepentimiento));
    const winners = eligible.filter(r => r.peorArrepentimiento === min).map(r => r.estrategiaId);
    if (winners.length !== raw.ganadoras.length || winners.some(id => !raw.ganadoras.includes(id))) fail();
  }

  const resultados = raw.resultados.map((item) => ({
    estrategiaId: String(item.estrategiaId),
    elegible: item.elegible,
    puntajes: item.puntajes ?? {},
    peorArrepentimiento:
      item.peorArrepentimiento === undefined ? null : item.peorArrepentimiento,
    motivoPeorArrepentimiento: item.motivoPeorArrepentimiento ?? null,
    motivosNoCalculable: item.motivosNoCalculable ?? {},
    motivosDescarte: Array.isArray(item.motivosDescarte) ? item.motivosDescarte : [],
  }));

  return {
    ...raw,
    estado: raw.estado,
    escenarios,
    resultados,
    descartes: Array.isArray(raw.descartes) ? raw.descartes : [],
    ganadoras: Array.isArray(raw.ganadoras) ? raw.ganadoras.map(String) : [],
    explicacion: raw.explicacion ?? '',
    evidencia: {
      ...raw.evidencia,
      origen: metadataOrigin(raw.evidencia),
      fuentes: Array.isArray(raw.evidencia?.fuentes) ? raw.evidencia.fuentes : [],
      supuestos: Array.isArray(raw.evidencia?.supuestos) ? raw.evidencia.supuestos : [],
      datosFaltantes: Array.isArray(raw.evidencia?.datosFaltantes) ? raw.evidencia.datosFaltantes : [],
      motorVersion: raw.evidencia?.motorVersion ?? 'no disponible',
      catalogoVersion: raw.evidencia?.catalogoVersion ?? 'no disponible',
      reglasVersion: raw.evidencia?.reglasVersion ?? 'no disponible',
      pesos: raw.evidencia?.pesos ?? null,
      escenarios: raw.evidencia?.escenarios ?? null,
    },
  };
}
