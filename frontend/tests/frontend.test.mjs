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
  assert.equal(draft.mesInicio, '');
  assert.ok(res.errors.mesInicio);
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
  const stratA = incomplete.resultados.find((r) => r.estrategiaId === 'E1');
  const stratB = incomplete.resultados.find((r) => r.estrategiaId === 'E2');
  assert.equal(stratA.puntajes.seco, null);
  assert.equal(stratB.puntajes.habitual, 0);
});

test('Matriz demostrativa E1/E2/E3 tiene E3 como ganadora y arrepentimientos 45/25/10', () => {
  const def = adaptSimulationResponse(DEMO_SIMULATION_CASES.default);
  assert.deepEqual(def.ganadoras, ['E3']);
  assert.equal(def.resultados.find((r) => r.estrategiaId === 'E1').peorArrepentimiento, 45);
  assert.equal(def.resultados.find((r) => r.estrategiaId === 'E2').peorArrepentimiento, 25);
  assert.equal(def.resultados.find((r) => r.estrategiaId === 'E3').peorArrepentimiento, 10);
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

for (const [name, mutate] of [
  ['estado ausente', x => delete x.estado],
  ['elegibilidad ausente', x => delete x.resultados[0].elegible],
  ['puntaje texto', x => x.resultados[0].puntajes.seco = '0'],
  ['puntaje fuera de rango', x => x.resultados[0].puntajes.seco = 101],
  ['ganadora inexistente', x => x.ganadoras = ['Z']],
  ['ganadora incorrecta', x => x.ganadoras = ['E1']],
  ['incompleto con ganadora', x => x.estado = 'incompleto'],
]) test(`rechaza ${name}`, () => {
  const raw = structuredClone(DEMO_SIMULATION_CASES.default); mutate(raw);
  assert.throws(() => adaptSimulationResponse(raw), { code: 'INVALID_SIMULATION' });
});
test('no inventa origen live', () => {
  const raw = structuredClone(DEMO_SIMULATION_CASES.default); raw.estado = 'completo'; delete raw.evidencia.origen;
  assert.equal(adaptSimulationResponse(raw).evidencia.origen, null);
});
test('rechaza ciclos ajenos y orden repetido', () => {
  const raw = structuredClone(DEMO_CATALOG); raw.estrategias[0].pasos[1].cicloId = 'inexistente';
  assert.throws(() => adaptCatalog(raw));
});

test('adaptSimulationResponse acepta D10 elegible: null con elegibilidadEstado no_evaluable', () => {
  const raw = {
    estado: 'incompleto',
    escenarios: ['habitual', 'seco', 'humedo'],
    resultados: [
      {
        estrategiaId: 'E1',
        elegible: null,
        elegibilidadEstado: 'no_evaluable',
        puntajes: { habitual: null, seco: null, humedo: null },
        peorArrepentimiento: null,
        motivoPeorArrepentimiento: 'No calculable',
        motivosNoCalculable: { habitual: 'pendiente', seco: 'pendiente', humedo: 'pendiente' },
        motivosDescarte: [],
      },
    ],
    descartes: [],
    ganadoras: [],
    explicacion: 'Evaluación incompleta.',
    evidencia: { origen: 'backup', fuentes: [{ id: 'f1', origen: 'backup' }] },
  };
  const adapted = adaptSimulationResponse(raw);
  assert.equal(adapted.resultados[0].elegible, null);
  assert.equal(adapted.resultados[0].elegibilidadEstado, 'no_evaluable');
  assert.deepEqual(adapted.ganadoras, []);
});

test('rechaza sin_opciones con elegible null (insuficiencia prevalece sobre sin_opciones)', () => {
  const raw = structuredClone(DEMO_SIMULATION_CASES.no_options);
  raw.resultados[0].elegible = null;
  raw.resultados[0].elegibilidadEstado = 'no_evaluable';
  raw.resultados[0].motivosDescarte = [];
  raw.resultados[0].motivosNoCalculable = { habitual: 'pendiente', seco: 'pendiente', humedo: 'pendiente' };
  raw.descartes = raw.descartes.filter((d) => d.estrategiaId !== raw.resultados[0].estrategiaId);
  assert.throws(() => adaptSimulationResponse(raw), { code: 'INVALID_SIMULATION' });
});

test('rechaza elegibilidadEstado inconsistente con elegible null', () => {
  const raw = structuredClone(DEMO_SIMULATION_CASES.incomplete);
  raw.resultados[0].elegible = null;
  raw.resultados[0].elegibilidadEstado = 'elegible';
  assert.throws(() => adaptSimulationResponse(raw), { code: 'INVALID_SIMULATION' });
});
