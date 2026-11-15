import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluarRespaldoRotacion,
  CODIGOS_ERROR_RESPALDO_ROTACION,
  ErrorRespaldoRotacion,
} from './evaluar-respaldo-rotacion.js';
import { ESTADOS_COMPATIBILIDAD } from './compatibilidad-temporal.js';

function crearCatalogo({ id = 'E1', duracion1 = { min: 60, max: 70 }, ventana2 = { inicioMes: 9, finMes: 10 }, evidenciaRotacion } = {}) {
  const estrategia = {
    id,
    nombre: `Secuencia sintética ${id}`,
    descripcion: 'Fixture sintético; no afirma validez agrícola.',
    fuenteId: 'fuente-general',
    pasos: [
      { orden: 1, cultivoId: 'cultivo-a', cicloId: 'ciclo-a' },
      { orden: 2, cultivoId: 'cultivo-b', cicloId: 'ciclo-b' },
    ],
    parametrosPuntuacion: [],
  };
  if (evidenciaRotacion !== undefined) estrategia.evidenciaRotacion = evidenciaRotacion;

  return {
    version: 'fixture-sintetico-1',
    fuentes: [{ id: 'fuente-general', tipo: 'dataset', titulo: 'Fuente ficticia general', url: null, fecha: null, notas: 'Fixture, no evidencia real.' }],
    cultivos: [
      {
        id: 'cultivo-a', nombre: 'Cultivo ficticio A', fuenteId: 'fuente-general',
        ciclos: [{ id: 'ciclo-a', cultivoId: 'cultivo-a', ventanaSiembra: { inicioMes: 5, finMes: 6 }, duracionMeses: 2, duracionDias: duracion1, alcanceGeografico: 'local', localidad: 'Liberia', nivelEvidencia: 'directa_local', fuenteId: 'fuente-general' }],
      },
      {
        id: 'cultivo-b', nombre: 'Cultivo ficticio B', fuenteId: 'fuente-general',
        ciclos: [{ id: 'ciclo-b', cultivoId: 'cultivo-b', ventanaSiembra: ventana2, duracionMeses: 2, duracionDias: { min: 60, max: 70 }, alcanceGeografico: 'local', localidad: 'Liberia', nivelEvidencia: 'directa_local', fuenteId: 'fuente-general' }],
      },
    ],
    estrategias: [estrategia],
    opcionesFinca: {
      suelo: [{ valor: 'desconocido', etiqueta: 'Desconocido' }],
      drenaje: [{ valor: 'desconocido', etiqueta: 'Desconocido' }],
      riego: [{ valor: 'desconocido', etiqueta: 'Desconocido' }],
      prioridad: [{ valor: 'equilibrio', etiqueta: 'Equilibrio' }, { valor: 'agua', etiqueta: 'Agua' }, { valor: 'suelo', etiqueta: 'Suelo' }],
      mesInicio: [{ valor: 5, etiqueta: 'Mayo' }],
    },
  };
}

const finca = Object.freeze({ mesInicio: 5 });
const pasosDeclarados = [
  { orden: 1, cultivoId: 'cultivo-a', cicloId: 'ciclo-a' },
  { orden: 2, cultivoId: 'cultivo-b', cicloId: 'ciclo-b' },
];

function evidencia(nivelEvidencia = 'directa_local', fuenteIds = ['fuente-general']) {
  return { pasos: structuredClone(pasosDeclarados), nivelEvidencia, fuenteIds };
}

function evaluar(catalogo) {
  return evaluarRespaldoRotacion({ catalogo, estrategiaId: catalogo.estrategias[0].id, finca });
}

test('E1: pasos y referencias válidos, fuentes de cultivo presentes y respaldo de secuencia ausente', () => {
  const resultado = evaluar(crearCatalogo({ id: 'E1' }));
  assert.equal(resultado.estructura.valida, true);
  assert.deepEqual(resultado.estructura.pasos, pasosDeclarados);
  assert.equal(resultado.compatibilidadTemporal.estado, ESTADOS_COMPATIBILIDAD.COMPATIBLE);
  assert.equal(resultado.elegibilidadDeCultivosYCiclos.elegible, true);
  assert.equal(resultado.evidenciaRotacion.estado, 'faltante');
  assert.equal(resultado.evidenciaRotacion.nivelEvidencia, 'pendiente');
  assert.match(resultado.evidenciaRotacion.motivosNoCalculable[0], /fuentes de cultivos o ciclos no la sustituyen/);
  assert.equal(resultado.recomendacionesHabilitadas, false);
});

test('E2: el validador existente rechaza orden y referencias inválidas', () => {
  const ordenInvalido = crearCatalogo({ id: 'E2' });
  ordenInvalido.estrategias[0].pasos.reverse();
  assert.throws(() => evaluar(ordenInvalido), (error) => error.codigo === CODIGOS_ERROR_RESPALDO_ROTACION.CATALOGO_INVALIDO);

  const referenciaInvalida = crearCatalogo({ id: 'E2' });
  referenciaInvalida.estrategias[0].pasos[0].cicloId = 'ciclo-ausente';
  assert.throws(() => evaluar(referenciaInvalida), (error) => error.codigo === CODIGOS_ERROR_RESPALDO_ROTACION.CATALOGO_INVALIDO);
});

test('E2: incompatibilidad temporal comprobada conserva su estado, aparte del respaldo', () => {
  const resultado = evaluar(crearCatalogo({ id: 'E2', duracion1: { min: 124, max: 130 }, ventana2: { inicioMes: 7, finMes: 8 }, evidenciaRotacion: evidencia() }));
  assert.equal(resultado.compatibilidadTemporal.estado, ESTADOS_COMPATIBILIDAD.INCOMPATIBLE);
  assert.equal(resultado.evidenciaRotacion.estado, 'declarada');
});

test('E3: duraciones ausentes mantienen no_evaluable según D18 y no se convierten desde meses', () => {
  const catalogo = crearCatalogo({ id: 'E3', duracion1: null });
  catalogo.cultivos[0].ciclos[0].duracionMeses = 3;
  const resultado = evaluar(catalogo);
  assert.equal(resultado.compatibilidadTemporal.estado, ESTADOS_COMPATIBILIDAD.NO_EVALUABLE);
  assert.deepEqual(resultado.compatibilidadTemporal.datosFaltantes, ['ciclo1.duracionDias']);
  assert.equal(resultado.evidenciaRotacion.estado, 'faltante');
});

test('E1/E2/E3: la declaración de evidencia debe referir exactamente el orden y las referencias de la secuencia', () => {
  for (const id of ['E1', 'E2', 'E3']) {
    const declaracionIncorrecta = evidencia();
    declaracionIncorrecta.pasos.reverse();
    assert.throws(
      () => evaluar(crearCatalogo({ id, evidenciaRotacion: declaracionIncorrecta })),
      (error) => error instanceof ErrorRespaldoRotacion && error.codigo === CODIGOS_ERROR_RESPALDO_ROTACION.EVIDENCIA_ROTACION_INVALIDA
    );
  }
});

test('E1/E2/E3: reconoce los niveles D19 sin convertirlos en aprobación agronómica', () => {
  const esperado = [
    ['directa_local', 'declarada'],
    ['extrapolada', 'declarada'],
    ['parcial', 'parcial'],
    ['pendiente', 'pendiente'],
  ];
  for (const id of ['E1', 'E2', 'E3']) {
    for (const [nivel, estado] of esperado) {
      const fuenteIds = nivel === 'pendiente' ? [] : ['fuente-general'];
      const resultado = evaluar(crearCatalogo({ id, evidenciaRotacion: evidencia(nivel, fuenteIds) }));
      assert.equal(resultado.evidenciaRotacion.nivelEvidencia, nivel);
      assert.equal(resultado.evidenciaRotacion.estado, estado);
      assert.equal(resultado.evidenciaRotacion.calidadCientificaVerificada, false);
      assert.equal(resultado.recomendacionesHabilitadas, false);
    }
  }
});

test('E1: una referencia de fuente inexistente no se acepta como evidencia declarada', () => {
  assert.throws(
    () => evaluar(crearCatalogo({ evidenciaRotacion: evidencia('directa_local', ['fuente-inexistente']) })),
    (error) => error.codigo === CODIGOS_ERROR_RESPALDO_ROTACION.FUENTE_NO_ENCONTRADA
  );
});

test('rechaza entrada y declaración de evidencia explícitamente malformadas', () => {
  assert.throws(
    () => evaluarRespaldoRotacion(null),
    (error) => error.codigo === CODIGOS_ERROR_RESPALDO_ROTACION.ENTRADA_INVALIDA
  );
  const catalogo = crearCatalogo();
  catalogo.estrategias[0].evidenciaRotacion = null;
  assert.throws(
    () => evaluar(catalogo),
    (error) => error.codigo === CODIGOS_ERROR_RESPALDO_ROTACION.EVIDENCIA_ROTACION_INVALIDA
  );
});

test('E1: inmutabilidad y determinismo con entradas congeladas', () => {
  const catalogo = crearCatalogo({ evidenciaRotacion: evidencia('extrapolada') });
  const freezeDeep = (value) => {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      Object.freeze(value);
      Object.values(value).forEach(freezeDeep);
    }
    return value;
  };
  freezeDeep(catalogo);
  const primera = evaluar(catalogo);
  const segunda = evaluar(catalogo);
  assert.deepEqual(primera, segunda);
  assert.ok(Object.isFrozen(primera));
  assert.ok(Object.isFrozen(primera.estructura.pasos));
  assert.ok(Object.isFrozen(primera.evidenciaRotacion.fuenteIds));
});
