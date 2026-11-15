// Manual HTTP smoke check. No AI calls, credentials or cache writes.
// node backend/scripts/check-climate-http.mjs --offline
// node backend/scripts/check-climate-http.mjs --live 10.631234 -85.441234 20240101 20240103
import { once } from 'node:events';
import { createApp } from '../src/app.js';
import { createNasaService } from '../src/services/nasa/nasa.service.js';
const [mode, latitude = '10.63', longitude = '-85.44', start = '20150101', end = '20241231'] = process.argv.slice(2);
if (!['--live', '--offline'].includes(mode)) throw new Error('Indica --live o --offline.');
const getClimateHistory = createNasaService({
  cacheDir: null,
  ...(mode === '--live' ? { backupDir: null } : { fetchImpl: async () => { throw new Error('Offline smoke check'); } }),
});
const server = createApp({ getClimateHistory }).listen(0, '127.0.0.1');
await once(server, 'listening');
try {
  const query = new URLSearchParams({ latitude, longitude, start, end });
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/climate/history?${query}`);
  const body = await response.json();
  const summary = body.clima ? {
    coordenadas: body.clima.coordenadas, periodo: body.clima.periodo, fuente: body.fuente,
    variables: Object.fromEntries(Object.entries(body.clima.variables).map(([key, value]) => [key, {
      unidad: value.unidad, unidadOriginal: value.unidadOriginal, cobertura: value.cobertura,
      muestraPrimerosTresDias: value.serie.slice(0, 3), ultimoDia: value.serie.at(-1),
    }])),
  } : body;
  console.log(JSON.stringify({ tipo: 'verificacion_HTTP', modo: mode, fechaVerificacion: new Date().toISOString(), status: response.status, ...summary }, null, 2));
  if (!response.ok) process.exitCode = 1;
} finally {
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}
