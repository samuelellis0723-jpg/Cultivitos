import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEMO_CATALOG,
  DEMO_CLIMATE_HISTORY,
  DEMO_SIMULATION_CASES,
} from '../src/fixtures/demoData.js';
import {
  adaptCatalog,
  adaptClimateHistory,
  adaptSimulationResponse,
} from '../src/services/adapters.js';
import {
  computeInputsFingerprint,
  createEmptyFinca,
  validateFinca,
} from '../src/utils/validation.js';

test('validateFinca rechaza coordenadas vacías sin convertir "" a 0', () => {
  const draft = createEmptyFinca(DEMO_CATALOG);
  const res = validateFinca(draft, DEMO_CATALOG);
  assert.equal(res.valid, false);
  assert.ok(res.errors.latitude);
  assert.ok(res.errors.longitude);
});

test('validateFinca rechaza coordenadas fuera de rango y mes inválido', () => {
  const draft = {
    ...createEmptyFinca(DEMO_CATALOG),
    latitude: '95',
    longitude: '-200',
    mesInicio: 13,
  };
  const res = validateFinca(draft, DEMO_CATALOG);
  assert.equal(res.valid, false);
  assert.ok(res.errors.latitude);
  assert.ok(res.errors.longitude);
  assert.ok(res.errors.mesInicio);
});

test('validateFinca conserva "desconocido" sin convertirlo a 0', () => {
  const draft = {
    ...createEmptyFinca(DEMO_CATALOG),
    latitude: '9.93',
    longitude: '-84.09',
    suelo: 'desconocido',
    drenaje: 'desconocido',
    riego: 'desconocido',
    mesInicio: 5,
    prioridad: 'equilibrio',
  };
  const res = validateFinca(draft, DEMO_CATALOG);
  assert.equal(res.valid, true);
  assert.equal(res.normalized.suelo, 'desconocido');
  assert.equal(res.normalized.drenaje, 'desconocido');
  assert.equal(res.normalized.riego, 'desconocido');
  assert.equal(res.normalized.latitude, 9.93);
});

test('adaptClimateHistory conserva huecos null sin convertirlos en 0', () => {
  const adapted = adaptClimateHistory(DEMO_CLIMATE_HISTORY);
  const gapDay = adapted.chartSeries.find((d) => d.fecha === '2026-05-05');
  const zeroRainDay = adapted.chartSeries.find((d) => d.fecha === '2026-05-02');
  assert.equal(gapDay.precipitacion, null);
  assert.equal(gapDay.temperaturaMedia, null);
  assert.equal(zeroRainDay.precipitacion, 0);
});

test('adaptSimulationResponse distingue 0 válido de null y conserva ganadoras', () => {
  const incomplete = adaptSimulationResponse(DEMO_SIMULATION_CASES.incomplete);
  assert.equal(incomplete.estado, 'incompleto');
  assert.deepEqual(incomplete.ganadoras, []);
  const stratA = incomplete.resultados.find((r) => r.estrategiaId === 'A');
  const stratB = incomplete.resultados.find((r) => r.estrategiaId === 'B');
  assert.equal(stratA.puntajes.seco, null);
  assert.equal(stratB.puntajes.habitual, 0);
});

test('Matriz demostrativa A/B/C tiene C como ganadora y arrepentimientos 45/25/10', () => {
  const def = adaptSimulationResponse(DEMO_SIMULATION_CASES.default);
  assert.deepEqual(def.ganadoras, ['C']);
  assert.equal(def.resultados.find((r) => r.estrategiaId === 'A').peorArrepentimiento, 45);
  assert.equal(def.resultados.find((r) => r.estrategiaId === 'B').peorArrepentimiento, 25);
  assert.equal(def.resultados.find((r) => r.estrategiaId === 'C').peorArrepentimiento, 10);
});

test('adaptCatalog ordena los pasos de cada estrategia por orden', () => {
  const adapted = adaptCatalog(DEMO_CATALOG);
  for (const est of adapted.estrategias) {
    assert.equal(est.pasos.length, 2);
    assert.equal(est.pasos[0].orden, 1);
    assert.equal(est.pasos[1].orden, 2);
  }
});

test('computeInputsFingerprint cambia si cambia finca o versión de catálogo', () => {
  const finca = {
    latitude: 9.93,
    longitude: -84.09,
    suelo: 'desconocido',
    drenaje: 'desconocido',
    riego: 'desconocido',
    cultivosAnteriores: [],
    mesInicio: 5,
    prioridad: 'equilibrio',
  };
  const fp1 = computeInputsFingerprint(finca, 'v1', 'live');
  const fp2 = computeInputsFingerprint(finca, 'v2', 'live');
  const fp3 = computeInputsFingerprint({ ...finca, mesInicio: 6 }, 'v1', 'live');
  assert.notEqual(fp1, fp2);
  assert.notEqual(fp1, fp3);
});
