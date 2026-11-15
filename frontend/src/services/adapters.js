import { ApiError } from './api.js';

export function adaptCatalog(raw) {
  if (!raw || typeof raw !== 'object' || !raw.version || !Array.isArray(raw.cultivos) || !Array.isArray(raw.estrategias)) {
    throw new ApiError('El catálogo recibido no cumple con el esquema mínimo esperado.', {
      code: 'INVALID_CATALOG',
    });
  }

  return {
    version: String(raw.version),
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
  if (!raw || typeof raw !== 'object' || !raw.variables) {
    throw new ApiError('Los datos climáticos históricos no tienen la estructura esperada.', {
      code: 'INVALID_CLIMATE_HISTORY',
    });
  }

  const precipSerie = Array.isArray(raw.variables?.precipitacion?.serie)
    ? raw.variables.precipitacion.serie
    : [];
  const tempSerie = Array.isArray(raw.variables?.temperaturaMedia?.serie)
    ? raw.variables.temperaturaMedia.serie
    : [];

  const byDate = new Map();
  for (const item of precipSerie) {
    byDate.set(item.fecha, {
      fecha: item.fecha,
      precipitacion: item.valor === undefined ? null : item.valor,
      temperaturaMedia: null,
    });
  }
  for (const item of tempSerie) {
    const existing = byDate.get(item.fecha) ?? {
      fecha: item.fecha,
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
    origen: raw.origen ?? 'live',
    antiguedadHoras: raw.antiguedadHoras ?? null,
    fuentes: Array.isArray(raw.fuentes) ? raw.fuentes : [],
    variables: raw.variables,
    chartSeries,
  };
}

export function adaptClimateForecast(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.dias)) {
    throw new ApiError('El pronóstico recibido no tiene el formato esperado.', {
      code: 'INVALID_FORECAST',
    });
  }
  return {
    origen: raw.origen ?? 'live',
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

  const escenarios = Array.isArray(raw.escenarios) && raw.escenarios.length > 0
    ? raw.escenarios
    : ['habitual', 'seco', 'humedo'];

  const resultados = raw.resultados.map((item) => ({
    estrategiaId: String(item.estrategiaId),
    elegible: item.elegible !== false,
    puntajes: item.puntajes ?? {},
    peorArrepentimiento:
      item.peorArrepentimiento === undefined ? null : item.peorArrepentimiento,
    motivoPeorArrepentimiento: item.motivoPeorArrepentimiento ?? null,
    motivosNoCalculable: item.motivosNoCalculable ?? {},
    motivosDescarte: Array.isArray(item.motivosDescarte) ? item.motivosDescarte : [],
  }));

  return {
    estado: raw.estado ?? 'completo',
    escenarios,
    resultados,
    descartes: Array.isArray(raw.descartes) ? raw.descartes : [],
    ganadoras: Array.isArray(raw.ganadoras) ? raw.ganadoras.map(String) : [],
    explicacion: raw.explicacion ?? '',
    evidencia: {
      origen: raw.evidencia?.origen ?? (raw.estado === 'demo' ? 'demo' : 'live'),
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
