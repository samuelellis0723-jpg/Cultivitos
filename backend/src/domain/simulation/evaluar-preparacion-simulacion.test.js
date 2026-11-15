import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { evaluarPreparacionSimulacion } from './evaluar-preparacion-simulacion.js';
import { adaptarCatalogoDominio } from '../catalog/adaptar-catalogo-dominio.js';
import { calcularPuntuacionesD7 } from './puntuacion-d7.js';
import { adaptNasaResponse } from '../../services/nasa/nasa.service.js';

const legado = JSON.parse(readFileSync(new URL('../../../../data/catalog.json', import.meta.url)));
const snapshot = JSON.parse(readFileSync(new URL('../../../data/backups/nasa-v1-066452b318d18182037c1e9f0956981013c77ef4c3e95659e6981c340523cf30.json', import.meta.url)));
// Captura real ya guardada: solo adaptación en memoria, ninguna llamada NASA ni IA.
const clima = adaptNasaResponse(snapshot.raw, snapshot.consulta, {
  origen: 'backup', fechaConsulta: snapshot.fechaConsulta,
  now: Date.parse(snapshot.fechaConsulta), urlConsulta: snapshot.urlConsulta,
});
const finca = { latitude: 10.63, longitude: -85.44, mesInicio: 5, suelo: 'desconocido', drenaje: 'desconocido', riego: 'desconocido', prioridad: 'agua' };

function completo() {
  const catalogo = structuredClone(legado);
  catalogo.version = 'fixture-sintetico-cierre';
  catalogo.fuentes.forEach((f) => { f.notas = 'Fixture sintético, sin validación agronómica.'; });
  const declaraciones = [];
  for (const cultivo of catalogo.cultivos) {
    for (const ciclo of cultivo.ciclos) {
      ciclo.duracionDias = { min: 60, max: 70 };
      ciclo.nivelEvidencia = 'directa_local';
      ciclo.alcanceGeografico = 'local';
      ciclo.localidad = 'Liberia';
      for (const nombre of ['ventanaSiembra', 'duracionDias']) {
        declaraciones.push({ atributoId: `${cultivo.id}/${ciclo.id}/${nombre}`, fuenteId: ciclo.fuenteId,
          respaldaAtributo: true, nivelEvidencia: 'directa_local', alcanceGeografico: 'local', localidad: 'Liberia', contextoFuente: 'sintetica_prueba' });
      }
    }
  }
  catalogo.estrategias.forEach((e) => {
    e.evidenciaRotacion = { pasos: structuredClone(e.pasos), nivelEvidencia: 'directa_local', fuenteIds: [e.fuenteId] };
  });
  return { finca, catalogo, clima, evidenciaAtributos: { modo: 'prueba_sintetica', declaraciones } };
}

test('catálogo actual y respaldo real: incompleto, sin aprobaciones por defecto, con motivos y trazabilidad', () => {
  const resultado = evaluarPreparacionSimulacion({ finca, catalogo: legado, clima });
  assert.equal(resultado.estadoPreparacion, 'incompleto');
  assert.equal(resultado.trazabilidad.validacionClima.valido, true);
  assert.equal(resultado.trazabilidad.clima.fuentes[0].origen, 'backup');
  assert.deepEqual(resultado.ganadoras, []);
  for (const e of resultado.estrategias) {
    assert.equal(e.elegibilidadEstado, 'no_evaluable');
    assert.deepEqual(e.motivosDescarte, []);
    assert.deepEqual(e.puntajes, { habitual: null, seco: null, humedo: null });
    assert.ok(e.motivosNoCalculable.some((m) => m.includes('D6/D7')));
  }
  assert.ok(resultado.datosFaltantes.some((m) => m.endsWith('/duracionDias')));
});

test('clima ausente y finca desconocida no producen descarte definitivo', () => {
  const resultado = evaluarPreparacionSimulacion({ finca: { suelo: 'desconocido' }, catalogo: legado });
  assert.equal(resultado.trazabilidad.clima, null);
  assert.ok(resultado.datosFaltantes.includes('clima'));
  assert.ok(resultado.datosFaltantes.includes('finca.mesInicio'));
  assert.ok(resultado.estrategias.every((e) => e.elegibilidadEstado === 'no_evaluable' && e.motivosDescarte.length === 0));
  assert.equal(resultado.trazabilidad.modulos.d5d18d20.ejecutado, false);
});

test('adaptación conserva legado, acepta duraciones futuras y no convierte meses', () => {
  const adaptado = adaptarCatalogoDominio(legado);
  assert.equal(adaptado.catalogo.cultivos[0].ciclos[0].duracionMeses, 4);
  assert.equal(adaptado.catalogo.cultivos[0].ciclos[0].duracionDias, null);
  assert.equal(adaptado.catalogo.cultivos[0].ciclos[0].nivelEvidencia, 'pendiente');
  const futuro = completo().catalogo;
  delete futuro.cultivos[0].ciclos[0].duracionMeses;
  const copia = adaptarCatalogoDominio(futuro).catalogo;
  assert.equal(copia.cultivos[0].ciclos[0].duracionMeses, null);
  assert.deepEqual(copia.cultivos[0].ciclos[0].duracionDias, { min: 60, max: 70 });
});

test('fixtures sintéticos completos ejecutan D5/D18/D20/D22 sin habilitar metodología real', () => {
  const resultado = evaluarPreparacionSimulacion(completo());
  const e1 = resultado.estrategias[0];
  assert.equal(e1.evidencia.d5Ejecutado, true);
  assert.equal(e1.evidencia.d18Ejecutado, true);
  assert.equal(e1.evidencia.d20.compatibilidadTemporal.estado, 'compatible');
  assert.equal(e1.evidencia.d20.evidenciaRotacion.estado, 'declarada');
  assert.equal(resultado.trazabilidad.d22.resultados[0].evidencias[0].estado, 'evidencia_declarada');
  assert.equal(resultado.metodologiaRealHabilitada, false);
  assert.equal(e1.elegibilidadEstado, 'no_evaluable');
  assert.deepEqual(resultado.ganadoras, []);
});

test('distingue incompatibilidad comprobada, incertidumbre y cruce de año D18', () => {
  const entrada = completo();
  entrada.finca = { ...finca, mesInicio: 12 };
  const incompatible = evaluarPreparacionSimulacion(entrada);
  assert.equal(incompatible.estrategias[0].elegibilidadEstado, 'no_elegible');
  assert.ok(incompatible.estrategias[0].motivosDescarte.length > 0);
  assert.equal(incompatible.estadoPreparacion, 'incompleto');
  entrada.catalogo.cultivos[0].ciclos[0].ventanaSiembra = { inicioMes: 12, finMes: 12 };
  entrada.catalogo.cultivos[1].ciclos[0].ventanaSiembra = { inicioMes: 1, finMes: 2 };
  const cruce = evaluarPreparacionSimulacion(entrada);
  assert.equal(cruce.estrategias[0].evidencia.d20.compatibilidadTemporal.estado, 'no_evaluable');
  assert.equal(cruce.estrategias[0].elegibilidadEstado, 'no_evaluable');
  assert.deepEqual(cruce.estrategias[0].motivosDescarte, []);
});

test('catálogo inválido y declaración D22 malformada registran bloqueos específicos', () => {
  const entrada = completo();
  entrada.catalogo.estrategias[0].pasos.reverse();
  const invalido = evaluarPreparacionSimulacion(entrada);
  assert.equal(invalido.trazabilidad.validacionCatalogo.valido, false);
  assert.equal(invalido.trazabilidad.modulos.d22.ejecutado, false);
  assert.equal(invalido.estrategias.length, 3);
  assert.ok(invalido.estrategias.every((e) => e.elegibilidadEstado === 'no_evaluable'));
  const malformado = completo();
  malformado.evidenciaAtributos.declaraciones[0].nivelEvidencia = 'aprobada';
  assert.ok(evaluarPreparacionSimulacion(malformado).trazabilidad.errorD22);
});

test('solapamiento indeterminado y errores de precondición nunca se traducen a descarte', () => {
  const entrada = completo();
  entrada.finca = { ...finca, mesInicio: 6 };
  entrada.catalogo.cultivos[0].ciclos[0].duracionDias = { min: 115, max: 135 };
  const resultado = evaluarPreparacionSimulacion(entrada);
  assert.equal(resultado.estrategias[0].evidencia.d20.compatibilidadTemporal.estado, 'indeterminada');
  assert.equal(resultado.estrategias[0].elegibilidadEstado, 'no_evaluable');
  assert.deepEqual(resultado.estrategias[0].motivosDescarte, []);
  entrada.catalogo.cultivos[0].ciclos[0].ventanaSiembra = { inicioMes: 6, finMes: 5 };
  const error = evaluarPreparacionSimulacion(entrada);
  assert.ok(error.estrategias[0].evidencia.errorD20);
  assert.match(error.trazabilidad.modulos.d5d18d20.motivo, /ERROR_EVALUACION/);
  assert.equal(error.estrategias[0].elegibilidadEstado, 'no_evaluable');
});

test('inmutabilidad profunda y determinismo sin compartir referencias', () => {
  const entrada = completo();
  const congelar = (x) => {
    if (x && typeof x === 'object' && !Object.isFrozen(x)) { Object.freeze(x); Object.values(x).forEach(congelar); }
  };
  congelar(entrada);
  const a = evaluarPreparacionSimulacion(entrada);
  const b = evaluarPreparacionSimulacion(entrada);
  assert.deepEqual(a, b);
  a.trazabilidad.clima.fuentes[0].origen = 'modificado';
  assert.equal(entrada.clima.fuentes[0].origen, 'backup');
});

test('D7 real continúa rechazado con su error de dominio identificable', () => {
  assert.throws(() => calcularPuntuacionesD7({ modo: 'real' }), (e) => e.codigo === 'MODO_NO_HABILITADO_D7');
});
