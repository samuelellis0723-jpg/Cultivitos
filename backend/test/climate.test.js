import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { createApp } from '../src/app.js';
import { createNasaService, adaptNasaResponse, validateHistoryQuery, cacheName, nasaUrl } from '../src/services/nasa/nasa.service.js';
import { simular } from '../src/services/simulation/simulation.service.js';

// Entirely synthetic: values only test transport/coverage, not agricultural rules.
const query = { latitude: 10.631234, longitude: -85.441234, start: '20240228', end: '20240301' };
const fechaConsulta = '2026-11-15T00:00:00.000Z';
const clock = () => Date.parse('2026-11-15T01:00:00.000Z');
function fixture(q = query) {
  return { geometry: { type: 'Point', coordinates: [-85.44, 10.63, 94] }, header: { start: q.start, end: q.end, time_standard: 'LST', fill_value: -999 }, parameters: { PRECTOTCORR: { units: 'mm/day' }, T2M: { units: 'C' }, T2M_MAX: { units: 'C' } }, properties: { parameter: { PRECTOTCORR: { '20240228': 0, '20240301': -999 }, T2M: { '20240228': -5, '20240229': 20, '20240301': 22 }, T2M_MAX: { '20240228': 1, '20240301': 30 } } } };
}
const response = raw => ({ ok: true, json: async () => raw });
const service = options => createNasaService({ cacheDir: null, backupDir: null, now: clock, ...options });
async function temporary(t) { const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'fieldverse-climate-')); t.after(() => fs.rm(dir, { recursive: true, force: true })); return dir; }
async function serve(t, history) { const server = createApp({ getClimateHistory: history }).listen(0, '127.0.0.1'); await once(server, 'listening'); t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); })); return `http://127.0.0.1:${server.address().port}`; }
const route = q => `/api/climate/history?${new URLSearchParams(q)}`;

test('query requires location and dates; no defaults, aliases, repeated or malformed inputs', () => {
  assert.deepEqual(validateHistoryQuery({ ...query, latitude: String(query.latitude) }), query);
  for (const input of [{}, { ...query, latitude: '' }, { ...query, latitude: null }, { ...query, latitude: true }, { ...query, latitude: ['10','11'] }, { ...query, longitude: Infinity }, { ...query, latitude: 91 }, { ...query, lat: 10 }, { ...query, start: '20240230' }, { ...query, end: '20240227' }, { ...query, end: '99991231' }]) assert.throws(() => validateHistoryQuery(input), e => e.status === 400);
});
test('exact coordinates and all requested calendar days including leap day, zeros and nulls', () => {
  const raw = fixture(), before = structuredClone(raw);
  const data = adaptNasaResponse(raw, query, { fechaConsulta, now: clock() });
  assert.deepEqual(raw, before);
  assert.deepEqual(data.coordenadas.solicitadas, { latitude: query.latitude, longitude: query.longitude });
  assert.deepEqual(data.coordenadas.devueltas, { latitude: 10.63, longitude: -85.44 });
  assert.deepEqual(data.variables.precipitacion.serie.map(x => x.valor), [0, null, null]);
  const { porcentaje, ...coverage } = data.variables.precipitacion.cobertura;
  assert.deepEqual(coverage, { diasEsperados: 3, diasPresentes: 1, faltantes: ['20240229','20240301'] });
  assert.ok(Math.abs(porcentaje - 100 / 3) < 1e-12, 'Coverage preserves precision within floating-point rounding');
  assert.equal(data.variables.temperaturaMedia.serie[0].valor, -5);
  assert.equal(data.variables.precipitacion.unidad, 'mm');
  assert.equal(data.variables.precipitacion.unidadOriginal, 'mm/day');
});
test('malformed response, units, missing series, missing geometry, wrong period and future date rejected', () => {
  for (const change of [r => { r.parameters.PRECTOTCORR.units = 'mm'; }, r => { delete r.properties.parameter.T2M; }, r => { delete r.geometry; }, r => { r.header.start = '20240229'; }, r => { r.header.time_standard = 'UTC'; }, r => { r.properties.parameter.T2M['20240230'] = 2; }]) {
    const raw = fixture(); change(raw); assert.throws(() => adaptNasaResponse(raw, query, { fechaConsulta, now: clock() }), e => e.status === 502);
  }
  assert.throws(() => adaptNasaResponse(fixture(), query, { fechaConsulta: '2099-01-01', now: clock() }));
});
test('invalid values are null; absent dates in every variable remain in expected coverage', () => {
  const raw = fixture(); raw.properties.parameter.T2M = { '20240228': NaN, '20240229': Infinity, '20240301': '20' };
  const data = adaptNasaResponse(raw, query, { fechaConsulta, now: clock() });
  assert.equal(data.variables.temperaturaMedia.cobertura.porcentaje, 0);
  assert.deepEqual(data.variables.temperaturaMedia.serie.map(x => x.valor), [null,null,null]);
});
test('HTTP uses selected location without rounding and returns envelope compatible with frontend', async t => {
  let url;
  const base = await serve(t, service({ fetchImpl: async value => { url = new URL(value); return response(fixture()); } }));
  const res = await fetch(base + route(query)); assert.equal(res.status, 200);
  const body = await res.json(); assert.equal(body.clima.coordenadas.solicitadas.latitude, query.latitude);
  assert.equal(url.searchParams.get('latitude'), String(query.latitude));
  assert.equal(url.searchParams.get('longitude'), String(query.longitude));
  assert.equal(body.fuente.id, body.clima.fuentes[0].id);
});
test('HTTP bad requests fail before calling NASA', async t => {
  let calls = 0;
  const base = await serve(t, service({ fetchImpl: async () => { calls++; return response(fixture()); } }));
  for (const suffix of [route({ ...query, latitude: 'NaN' }), route({ lat: 10, lon: 20 }), route(query) + '&latitude=9', route({ ...query, start: 'invalid' })]) {
    const res = await fetch(base + suffix); assert.equal(res.status,400); assert.equal((await res.json()).error.code,'INVALID_CLIMATE_QUERY');
  }
  assert.equal(calls,0);
});
test('HTTP empty provider data is 502 NASA_NO_DATA, not an invented live climate', async t => {
  const raw = fixture(); for (const key of Object.keys(raw.properties.parameter)) raw.properties.parameter[key] = {};
  const base = await serve(t, service({ fetchImpl: async () => response(raw) }));
  const res = await fetch(base + route(query)); assert.equal(res.status,502); assert.equal((await res.json()).error.code,'NASA_NO_DATA');
});
test('HTTP non-JSON and upstream failure are 502', async t => {
  for (const fetchImpl of [async () => ({ ok: false }), async () => ({ ok: true, json: async () => { throw new SyntaxError(); } })]) {
    const base = await serve(t, service({ fetchImpl })); const res = await fetch(base + route(query)); assert.equal(res.status,502);
  }
});
test('timeout includes body read and aborts request; HTTP 504', async t => {
  let signal;
  const base = await serve(t, service({ timeoutMs: 15, fetchImpl: async (_, options) => { signal = options.signal; return { ok: true, json: () => new Promise(() => {}) }; } }));
  const res = await fetch(base + route(query)); assert.equal(res.status,504); assert.equal((await res.json()).error.code,'NASA_TIMEOUT'); assert.equal(signal.aborted,true);
});
test('cache identity differs for nearby exact points and periods; validated cache is backup', async t => {
  const dir = await temporary(t); let calls = 0;
  const get = service({ cacheDir: dir, fetchImpl: async () => { calls++; return response(fixture()); } });
  assert.equal((await get(query)).origen,'live');
  const cached = await get(query); assert.equal(cached.origen,'backup'); assert.equal(cached.fuentes[0].fechaConsulta,new Date(clock()).toISOString()); assert.ok(cached.fuentes[0].antiguedad); assert.equal(calls,1);
  assert.notEqual(cacheName(query),cacheName({ ...query, latitude: 10.631235 }));
  assert.notEqual(cacheName(query),cacheName({ ...query, start: '20240229' }));
});
test('HTTP fallback uses exact verified snapshot and keeps acquisition date', async t => {
  const dir = await temporary(t);
  await fs.writeFile(path.join(dir,cacheName(query)), JSON.stringify({ schemaVersion:1, consulta:query, urlConsulta:nasaUrl(query), fechaConsulta, raw:fixture() }));
  const base = await serve(t, service({ backupDir:dir, fetchImpl:async () => { throw new Error('offline'); } }));
  const res = await fetch(base + route(query)); assert.equal(res.status,200);
  const { clima } = await res.json(); assert.equal(clima.origen,'backup'); assert.equal(clima.fuentes[0].fechaConsulta,fechaConsulta); assert.equal(clima.fuentes[0].antiguedad,'3600 segundos desde la consulta original');
});
test('misnamed, mismatched, corrupt, legacy and unverifiable snapshots never substitute another query', async t => {
  const dir = await temporary(t);
  const valid = { schemaVersion:1, consulta:query, urlConsulta:nasaUrl(query), fechaConsulta, raw:fixture() };
  for (const content of ['bad json', JSON.stringify({ ...valid, consulta:{ ...query, latitude:9.93 } }), JSON.stringify({ ...valid, fechaConsulta:null }), JSON.stringify({ ...valid, urlConsulta:'https://example.com' }), JSON.stringify({ coordenadas:{ solicitadas:query }, variables:{} })]) {
    await fs.writeFile(path.join(dir,cacheName(query)),content);
    await assert.rejects(service({ backupDir:dir, fetchImpl:async () => { throw new Error('offline'); } })(query),e => e.status===502);
  }
});
test('cache write failure does not discard valid NASA response', async t => {
  const dir = await temporary(t), file = path.join(dir,'file'); await fs.writeFile(file,'x');
  const diagnostics=[];
  const get = service({ cacheDir:file, fetchImpl:async () => response(fixture()),onDiagnostic:d => diagnostics.push(d) });
  assert.equal((await get(query)).origen,'live'); assert.ok(diagnostics.some(d => d.code==='CACHE_WRITE_FAILED'));
});
test('reviewed real Liberia snapshot can be served offline; other locations cannot reuse it', async () => {
  const get = createNasaService({ cacheDir:null, fetchImpl:async () => { throw new Error('offline'); } });
  const data = await get({ latitude:10.63,longitude:-85.44,start:'20150101',end:'20241231' });
  assert.equal(data.origen,'backup'); assert.equal(data.variables.precipitacion.cobertura.diasEsperados,3653); assert.equal(data.variables.precipitacion.cobertura.diasPresentes,3653);
  await assert.rejects(get({ latitude:10.631,longitude:-85.44,start:'20150101',end:'20241231' }),e => e.status===502);
});
const finca = { latitude:query.latitude,longitude:query.longitude,mesInicio:5,suelo:'desconocido',drenaje:'desconocido',riego:'desconocido',prioridad:'equilibrio',cultivosAnteriores:[] };
const explain = async input => ({ explicacionIA:input.explicacionBase,origen:'fixture_explanation' });
test('simulation without climate reports null origin, no sources and no winners', async () => {
  let requested;
  const data = await simular({ finca }, { getClimate:async q => { requested=q; throw new Error('offline'); },explain });
  assert.deepEqual(requested,{ latitude:query.latitude,longitude:query.longitude,start:'20150101',end:'20241231' });
  assert.equal(data.evidencia.origen,null); assert.deepEqual(data.evidencia.fuentes,[]); assert.equal(data.clima,null); assert.equal(data.estado,'incompleto'); assert.deepEqual(data.ganadoras,[]);
});
test('simulation preserves backup evidence and demo never fetches NASA', async () => {
  const climate = adaptNasaResponse(fixture(),query,{ fechaConsulta,origen:'backup',now:clock() });
  const real = await simular({ finca },{ getClimate:async () => climate,explain }); assert.equal(real.evidencia.origen,'backup'); assert.deepEqual(real.evidencia.fuentes,climate.fuentes);
  const demo = await simular({ finca,modo:'demo' },{ getClimate:async () => assert.fail('demo requested NASA'),explain }); assert.equal(demo.estado,'demo'); assert.equal(demo.evidencia.origen,'demo'); assert.deepEqual(demo.ganadoras,['E3']);
});
