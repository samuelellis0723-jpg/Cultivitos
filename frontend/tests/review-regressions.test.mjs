import test from 'node:test';
import assert from 'node:assert/strict';
import { DEMO_CATALOG, DEMO_SIMULATION_CASES } from '../src/fixtures/demoData.js';
import { adaptSimulationResponse } from '../src/services/adapters.js';
import { loadSavedComparisons, saveComparison, isLegacyDemoComparison } from '../src/services/storage.js';
import { getClimateHistory } from '../src/services/climate.js';

const finca = { latitude: 10.63, longitude: -85.44, suelo: 'desconocido', drenaje: 'desconocido', riego: 'desconocido', cultivosAnteriores: [], mesInicio: 5, prioridad: 'equilibrio' };
function entry(simulation = structuredClone(DEMO_SIMULATION_CASES.default)) {
  return { id: 'review', schemaVersion: 2, savedAt: '2026-11-15T20:00:00Z', dataMode: 'demo', finca, catalog: structuredClone(DEMO_CATALOG), simulation, selectedStrategyId: 'E3' };
}
function storage(t) {
  const values = new Map();
  const previous = globalThis.window;
  globalThis.window = { localStorage: { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) } };
  t.after(() => { if (previous === undefined) delete globalThis.window; else globalThis.window = previous; });
  return values;
}

test('todos los casos demo referencian E1/E2/E3 del catálogo y conservan la matriz ficticia', () => {
  assert.deepEqual(DEMO_CATALOG.estrategias.map(e => e.id), ['E1', 'E2', 'E3']);
  for (const fixture of Object.values(DEMO_SIMULATION_CASES)) {
    const data = adaptSimulationResponse(fixture);
    assert.deepEqual(data.resultados.map(r => r.estrategiaId), ['E1', 'E2', 'E3']);
    assert.ok([...data.ganadoras, ...data.descartes.map(r => r.estrategiaId)].every(id => DEMO_CATALOG.estrategias.some(e => e.id === id)));
    assert.equal(data.evidencia.origen, 'demo');
  }
  const demo = DEMO_SIMULATION_CASES.default;
  assert.deepEqual(demo.resultados.map(r => Object.values(r.puntajes)), [[90,35,55],[75,80,50],[80,70,75]]);
  assert.deepEqual(demo.resultados.map(r => r.peorArrepentimiento), [45,25,10]);
  assert.deepEqual(demo.ganadoras, ['E3']);
});

test('advertencias HTTP sobreviven adaptación, guardado y recarga sin descartar elegibilidad desconocida', t => {
  storage(t);
  const raw = structuredClone(DEMO_SIMULATION_CASES.default);
  raw.estado = 'incompleto'; raw.ganadoras = []; raw.evidencia.origen = 'backup';
  for (const r of raw.resultados) Object.assign(r, { elegible: null, elegibilidadEstado: 'no_evaluable', puntajes: {habitual:null,seco:null,humedo:null}, peorArrepentimiento: null, motivosNoCalculable: {habitual:'D7 pendiente',seco:'D7 pendiente',humedo:'D7 pendiente'}, advertencias: ['FINCA_DESCONOCIDA: suelo; no constituye restricción comprobada.', 'D20/D22 experimentales; las declaraciones no verifican calidad científica.'] });
  const adapted = adaptSimulationResponse(raw);
  assert.deepEqual(adapted.resultados[0].advertencias, raw.resultados[0].advertencias);
  assert.notEqual(adapted.resultados[0].advertencias, raw.resultados[0].advertencias);
  const record = { ...entry(adapted), dataMode: 'live' };
  assert.equal(saveComparison(record).ok, true);
  const reloaded = loadSavedComparisons().items[0];
  assert.deepEqual(JSON.parse(JSON.stringify(reloaded)).simulation, adapted);
  assert.equal(reloaded.simulation.resultados[0].elegible, null);
  assert.deepEqual(reloaded.simulation.descartes, []);
});

test('registros antiguos sin advertencias siguen siendo compatibles; tipo inválido se rechaza', () => {
  assert.deepEqual(adaptSimulationResponse(DEMO_SIMULATION_CASES.default).resultados[0].advertencias, []);
  for (const invalid of [null, 'aviso', [null], [{}], [''], ['   ']]) {
    const raw = structuredClone(DEMO_SIMULATION_CASES.default);
    raw.resultados[0].advertencias = invalid;
    assert.throws(() => adaptSimulationResponse(raw), { code: 'INVALID_SIMULATION' });
  }
});

test('demo histórica A/B/C reconocida se conserva sin migración ni escritura; reales no se reclasifican', t => {
  const values = storage(t);
  const legacy = entry();
  const ids = { E1:'A', E2:'B', E3:'C' };
  legacy.catalog.estrategias.forEach(e => { e.id = ids[e.id]; });
  legacy.simulation.resultados.forEach(r => { r.estrategiaId = ids[r.estrategiaId]; });
  legacy.simulation.ganadoras = ['C']; legacy.selectedStrategyId = 'C';
  assert.equal(isLegacyDemoComparison(legacy), true);
  const stored = JSON.stringify([legacy]); values.set('fieldverse.comparisons.v1', stored);
  assert.deepEqual(loadSavedComparisons().items, [legacy]);
  assert.equal(values.get('fieldverse.comparisons.v1'), stored);
  for (const mutate of [r => r.dataMode = 'live', r => { r.simulation.evidencia.origen = 'backup'; r.simulation.estado = 'completo'; }, r => r.catalog.version = 'otra-version']) {
    const real = structuredClone(legacy); mutate(real);
    assert.equal(isLegacyDemoComparison(real), false);
    assert.equal(saveComparison(real).ok, true);
    assert.deepEqual(loadSavedComparisons().items[0], real);
  }
});

test('sin período explícito no se consulta historial ni se asume ubicación o fechas', async t => {
  let calls = 0;
  const previous = globalThis.fetch;
  globalThis.fetch = async () => { calls++; throw new Error('No debería consultarse'); };
  t.after(() => { globalThis.fetch = previous; });
  await assert.rejects(getClimateHistory({ latitude:10.63, longitude:-85.44 }), /Historial pendiente/);
  assert.equal(calls, 0);
});
