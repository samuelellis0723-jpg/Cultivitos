import test from 'node:test';
import assert from 'node:assert/strict';
import { calendarDay, validIsoDate, validPeriod } from '../src/utils/dates.js';
import { adaptClimateHistory, adaptClimateForecast, adaptSimulationResponse } from '../src/services/adapters.js';
import { DEMO_CLIMATE_HISTORY, DEMO_SIMULATION_CASES } from '../src/fixtures/demoData.js';
import { getClimateHistory } from '../src/services/climate.js';
import { cycleDurationLabel } from '../src/utils/catalog.js';
function climate() {
  const raw = structuredClone(DEMO_CLIMATE_HISTORY);
  delete raw.origen;
  raw.fuentes[0].origen = 'live'; raw.fuentes[0].urlConsulta = 'https://example.org/test-fixture';
  for (const variable of Object.values(raw.variables)) variable.procedencia = 'live';
  return raw;
}
test('calendar dates handle leap years, impossible days, year zero and periods', () => {
  for (const value of ['20250229','20241301','20240431','00000101','2024-01-01','20240100']) assert.equal(calendarDay(value), null);
  assert.notEqual(calendarDay('20240229'), null);
  assert.equal(validIsoDate('2025-02-29T12:00:00Z'), false);
  assert.equal(validIsoDate('2024-02-29T25:00:00Z'), false);
  assert.equal(validPeriod({inicio:'20250101', fin:'20240101'}), false);
});
test('invalid configured date fails before network', async () => {
  await assert.rejects(getClimateHistory({latitude:0,longitude:0,start:'20250229',end:'20250301'}), /Historial pendiente/);
});
test('history derives origin from variable metadata and preserves zero/null', () => {
  const data = adaptClimateHistory(climate());
  assert.equal(data.origen,'live');
  assert.equal(data.chartSeries[1].precipitacion,0);
  assert.equal(data.chartSeries[4].precipitacion,null);
  assert.ok(data.variables.temperaturaMaxima);
});
test('wrapped HTTP history validates climate and retains its declared source metadata', () => {
  const source = { sistema: 'API FIELDVERSE', nota: 'fuente simulada de contrato' };
  const data = adaptClimateHistory({ clima: climate(), fuente: source });
  assert.equal(data.origen, 'live');
  assert.deepEqual(data.fuente, source);
  assert.equal(data.variables.precipitacion.unidad, 'mm');
});
test('wrapped HTTP history still rejects incompatible climate units', () => {
  const wrapped = { clima: climate(), fuente: { nombre: 'fuente declarada' } };
  wrapped.clima.variables.precipitacion.unidad = 'mm/día';
  assert.throws(() => adaptClimateHistory(wrapped), { code: 'INVALID_CLIMATE_HISTORY' });
});
test('published Alex climate source metadata remains rejected until it meets Hellen climate validation', () => {
  const raw = climate();
  raw.fuentes = [{
    id: 'nasa_power_daily',
    proveedor: 'NASA POWER (AG Community)',
    urlConsulta: 'https://power.larc.nasa.gov/api/temporal/daily/point',
    origen: 'live',
  }];
  assert.throws(() => adaptClimateHistory(raw), { code: 'INVALID_CLIMATE_HISTORY' });
});
test('mixed live/backup retains per-variable provenance and source age', () => {
  const raw = climate(); const source = {...raw.fuentes[0],id:'backup-test',origen:'backup',antiguedad:'2 días'};
  raw.fuentes.push(source);
  Object.assign(raw.variables.temperaturaMedia,{fuenteId:source.id,procedencia:'backup'});
  const data = adaptClimateHistory(raw);
  assert.equal(data.origen,'mixed'); assert.equal(data.variables.temperaturaMedia.procedencia,'backup');
});
for (const [name, mutate] of [
  ['missing maximum',r=>delete r.variables.temperaturaMaxima],
  ['wrong unit',r=>r.variables.precipitacion.unidad='mm/día'],
  ['missing dates',r=>delete r.variables.precipitacion.fechas],
  ['invalid calendar',r=>r.variables.precipitacion.serie[0].fecha='20260230'],
  ['duplicate date',r=>r.variables.precipitacion.serie[1].fecha=r.variables.precipitacion.serie[0].fecha],
  ['omitted day',r=>r.variables.precipitacion.serie.pop()],
  ['sentinel',r=>r.variables.precipitacion.serie[0].valor=-999],
  ['string number',r=>r.variables.precipitacion.serie[0].valor='0'],
  ['coverage',r=>r.variables.precipitacion.cobertura.diasPresentes=14],
  ['missing null dates',r=>r.variables.precipitacion.cobertura.faltantes=[]],
  ['source reference',r=>r.variables.precipitacion.fuenteId='absent'],
  ['missing provenance',r=>delete r.variables.precipitacion.procedencia],
  ['source mismatch',r=>r.variables.precipitacion.procedencia='backup'],
  ['backup age',r=>{r.fuentes[0].origen='backup';for(const v of Object.values(r.variables))v.procedencia='backup';}],
  ['bad query date',r=>r.fuentes[0].fechaConsulta='2025-02-29T00:00:00Z'],
  ['bad coordinates',r=>r.coordenadas.devueltas.latitude=91],
  ['root contradicts metadata',r=>r.origen='backup'],
  ['connection mode is not data provenance',r=>r.origen='cache_local'],
]) test(`climate rejects ${name}`,()=>{const raw=climate();mutate(raw);assert.throws(()=>adaptClimateHistory(raw),{code:'INVALID_CLIMATE_HISTORY'});});
test('discarded strategies require nonblank reasons',()=>{
  for(const reason of [undefined,[],[''],['   '],[null]]) {
    const raw=structuredClone(DEMO_SIMULATION_CASES.no_options);raw.resultados[0].motivosDescarte=reason;
    assert.throws(()=>adaptSimulationResponse(raw),{code:'INVALID_SIMULATION'});
  }
});
test('published Alex simulation shape preserves incomplete reasons and declares no winner', () => {
  const raw = {
    estado: 'incompleto',
    escenarios: ['habitual', 'seco', 'humedo'],
    resultados: ['E1', 'E2'].map(estrategiaId => ({
      estrategiaId,
      elegible: true,
      puntajes: { habitual: null, seco: null, humedo: null },
      peorArrepentimiento: null,
      motivoPeorArrepentimiento: null,
      motivosNoCalculable: {
        habitual: 'Puntuación ausente.',
        seco: 'Puntuación ausente.',
        humedo: 'Puntuación ausente.',
      },
      motivosDescarte: [],
    })),
    descartes: [],
    ganadoras: [],
    explicacion: 'Simulación incompleta: reglas pendientes.',
    evidencia: {
      origen: 'live',
      supuestos: ['Reglas de puntuación pendientes.'],
      datosFaltantes: ['Reglas de puntuación agronómica (pendiente Hellen).'],
      catalogoVersion: '1.0.0-piloto',
      motorVersion: 'minimax-regret v1',
      reglasVersion: 'no-implementado',
    },
  };
  const adapted = adaptSimulationResponse(raw);
  assert.equal(adapted.estado, 'incompleto');
  assert.deepEqual(adapted.ganadoras, []);
  assert.match(adapted.resultados[0].motivosNoCalculable.habitual, /ausente/i);
  assert.deepEqual(adapted.evidencia.datosFaltantes, raw.evidencia.datosFaltantes);
  assert.equal(adapted.evidencia.origen, 'live');
});
test('forecast rejects impossible calendar date',()=>assert.throws(()=>adaptClimateForecast({dias:[{fecha:'2025-02-29'}]}),{code:'INVALID_FORECAST'}));

test('API simulation preserves backup or demo provenance regardless of connection',()=> {
  const raw=structuredClone(DEMO_SIMULATION_CASES.default);
  raw.estado='completo'; raw.evidencia.origen='backup'; raw.evidencia.fuentes=[{origen:'backup'}];
  assert.equal(adaptSimulationResponse(raw).evidencia.origen,'backup');
  delete raw.evidencia.origen;
  assert.equal(adaptSimulationResponse(raw).evidencia.origen,'backup');
  raw.evidencia.origen='live';
  assert.throws(()=>adaptSimulationResponse(raw),{code:'INVALID_PROVENANCE'});
});

test('top-level descartes also require reasons and discarded IDs',()=> {
  const raw=structuredClone(DEMO_SIMULATION_CASES.no_options);
  raw.descartes[0].motivos=[];
  assert.throws(()=>adaptSimulationResponse(raw),{code:'INVALID_SIMULATION'});
});
test('unknown cycle duration stays null and is shown as pending, never as zero', () => {
  for (const cycle of [
    { duracionMeses: null },
    { duracionDias: null },
    { duracionDias: null, duracionMeses: 4 },
  ]) {
    assert.equal(cycleDurationLabel(cycle), 'Duración: Pendiente de validación');
    assert.ok(Object.values(cycle).includes(null));
  }
  assert.equal(cycleDurationLabel({ duracionMeses: 4 }), null);
});

test('HTTP history must match requested period and coordinates',async t=> {
  const raw=climate();
  t.mock.method(globalThis,'fetch',async()=>new Response(JSON.stringify(raw),{status:200,headers:{'Content-Type':'application/json'}}));
  await assert.rejects(getClimateHistory({latitude:9.93,longitude:-84.09,start:'20150101',end:'20241231'}),{code:'INVALID_CLIMATE_HISTORY'});
  await assert.rejects(getClimateHistory({latitude:0,longitude:0,start:'20260501',end:'20260514'}),{code:'INVALID_CLIMATE_HISTORY'});
});
