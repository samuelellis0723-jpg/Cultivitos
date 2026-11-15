import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.resolve(__dirname, '../../../../data');

const PERIODO_DEFECTO = { start: '20150101', end: '20241231' };

// Convierte el tiempo transcurrido desde la consulta original en texto legible
function calcularAntiguedad(fechaConsultaISO) {
  const ms = Date.now() - new Date(fechaConsultaISO).getTime();
  if (!Number.isFinite(ms) || ms < 0) return 'desconocida';
  const minutos = Math.floor(ms / 60000);
  if (minutos < 1) return 'menos de un minuto';
  if (minutos < 60) return `${minutos} minutos`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `${horas} horas`;
  const dias = Math.floor(horas / 24);
  return `${dias} días`;
}

export async function getNasaHistoricalClimateSeries({
  lat = 9.93,
  lon = -84.09,
  start = PERIODO_DEFECTO.start,
  end = PERIODO_DEFECTO.end,
}) {
  const safeLat = Number(lat).toFixed(2);
  const safeLon = Number(lon).toFixed(2);
  // La clave de caché incluye período para no mezclar consultas distintas
  const cacheFile = path.join(CACHE_DIR, `nasa_series_${safeLat}_${safeLon}_${start}_${end}.json`);

  // 1. Revisar si ya existe en caché local -> se entrega como backup con antigüedad
  try {
    const cachedRaw = await fs.readFile(cacheFile, 'utf-8');
    const cachedData = JSON.parse(cachedRaw);
    const fechaConsulta = cachedData?.fuentes?.[0]?.fechaConsulta || cachedData?.variables?.precipitacion?.fechaConsulta;
    const antiguedad = calcularAntiguedad(fechaConsulta);
    return marcarComoBackup(cachedData, antiguedad);
  } catch {
    // Si no está en caché, consultamos la API de NASA POWER
  }

  // 2. Consultar NASA POWER API (Daily Point)
  const url = `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M,T2M_MAX,PRECTOTCORR&community=AG&longitude=${safeLon}&latitude=${safeLat}&start=${start}&end=${end}&format=JSON`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`NASA POWER respondió con estado ${response.status}`);
  }

  const rawJson = await response.json();
  const params = rawJson?.properties?.parameter;

  if (!params || !params.PRECTOTCORR) {
    throw new Error('Formato inesperado en respuesta de NASA POWER');
  }

  // 3. Formatear estrictamente según el contrato de series diarias (C1–C11)
  const formatted = buildDailyClimatePayload(params, {
    lat: Number(safeLat),
    lon: Number(safeLon),
    start,
    end,
    url,
  });

  // 4. Guardar en data/ para modo offline
  await fs.mkdir(CACHE_DIR, { recursive: true });
  await fs.writeFile(cacheFile, JSON.stringify(formatted, null, 2), 'utf-8');

  return formatted;
}

// Marca una respuesta cacheada como backup: procedencia por variable + fuente con antigüedad
function marcarComoBackup(data, antiguedad) {
  return {
    ...data,
    variables: Object.fromEntries(
      Object.entries(data.variables ?? {}).map(([clave, v]) => [
        clave,
        { ...v, procedencia: 'backup' },
      ])
    ),
    fuentes: (data.fuentes ?? []).map((f) => ({ ...f, origen: 'backup', antiguedad })),
  };
}

function buildDailyClimatePayload(params, meta) {
  const dates = Object.keys(params.PRECTOTCORR).sort();

  const precipSerie = [];
  const tMeanSerie = [];
  const tMaxSerie = [];

  const faltantesPrecip = [];
  const faltantesTMean = [];
  const faltantesTMax = [];

  for (const date of dates) {
    const pVal = params.PRECTOTCORR[date];
    const tmVal = params.T2M[date];
    const tmaxVal = params.T2M_MAX[date];

    // NASA usa valores negativos como -999 para datos faltantes / inválidos
    const cleanP = (pVal !== undefined && pVal >= 0) ? pVal : null;
    const cleanTm = (tmVal !== undefined && tmVal >= -90) ? tmVal : null;
    const cleanTmax = (tmaxVal !== undefined && tmaxVal >= -90) ? tmaxVal : null;

    precipSerie.push({ fecha: date, valor: cleanP });
    tMeanSerie.push({ fecha: date, valor: cleanTm });
    tMaxSerie.push({ fecha: date, valor: cleanTmax });

    if (cleanP === null) faltantesPrecip.push(date);
    if (cleanTm === null) faltantesTMean.push(date);
    if (cleanTmax === null) faltantesTMax.push(date);
  }

  const totalDias = dates.length;

  const makeVariableObj = (unidad, faltantes, serie) => ({
    unidad,
    fechas: { inicio: meta.start, fin: meta.end },
    procedencia: 'live',
    fechaConsulta: new Date().toISOString(),
    fuenteId: 'nasa_power_daily',
    cobertura: {
      diasEsperados: totalDias,
      diasPresentes: totalDias - faltantes.length,
      porcentaje: Number((((totalDias - faltantes.length) / (totalDias || 1)) * 100).toFixed(1)),
      faltantes
    },
    serie
  });

  return {
    coordenadas: {
      solicitadas: { latitude: meta.lat, longitude: meta.lon },
      devueltas: { latitude: meta.lat, longitude: meta.lon }
    },
    periodo: { inicio: meta.start, fin: meta.end },
    resolucion: 'diaria',
    variables: {
      precipitacion: makeVariableObj('mm/día', faltantesPrecip, precipSerie),
      temperaturaMedia: makeVariableObj('°C', faltantesTMean, tMeanSerie),
      temperaturaMaxima: makeVariableObj('°C', faltantesTMax, tMaxSerie)
    },
    fuentes: [
      {
        id: 'nasa_power_daily',
        proveedor: 'NASA POWER (AG Community)',
        urlConsulta: meta.url,
        fechaConsulta: new Date().toISOString(),
        origen: 'live'
      }
    ]
  };
}