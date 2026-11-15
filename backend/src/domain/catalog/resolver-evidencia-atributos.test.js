import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolverEvidenciaAtributos,
  ESTADOS_EVIDENCIA_ATRIBUTO,
  CODIGOS_ERROR_EVIDENCIA_ATRIBUTO,
} from './resolver-evidencia-atributos.js';
import { MODOS_PUNTUACION_D7 } from '../simulation/puntuacion-d7.js';

function crearCatalogoSintetico() {
  const fuente = (id) => ({
    id,
    tipo: 'dataset',
    titulo: `Fuente sintética de prueba ${id}`,
    url: null,
    fecha: null,
    notas: 'Fixture sintético; no representa ni cita una fuente agrícola real.',
  });
  const ciclo = (id, cultivoId, fuenteId) => ({
    id,
    cultivoId,
    ventanaSiembra: { inicioMes: 5, finMes: 6 },
    duracionMeses: 2,
    duracionDias: { min: 60, max: 70 },
    fuenteId,
  });
  return {
    version: 'fixture-d22-sintetico',
    fuentes: [fuente('fuente-uno'), fuente('fuente-dos')],
    cultivos: [
      { id: 'cultivo-uno', nombre: 'Cultivo sintético uno', fuenteId: 'fuente-uno', ciclos: [ciclo('ciclo-uno', 'cultivo-uno', 'fuente-uno')] },
      { id: 'cultivo-dos', nombre: 'Cultivo sintético dos', fuenteId: 'fuente-dos', ciclos: [ciclo('ciclo-dos', 'cultivo-dos', 'fuente-dos')] },
    ],
    estrategias: [{
      id: 'estrategia-sintetica',
      nombre: 'Estrategia sintética de prueba',
      descripcion: 'Solo valida forma y trazabilidad; no representa una recomendación.',
      fuenteId: 'fuente-uno',
      pasos: [
        { orden: 1, cultivoId: 'cultivo-uno', cicloId: 'ciclo-uno' },
        { orden: 2, cultivoId: 'cultivo-dos', cicloId: 'ciclo-dos' },
      ],
      parametrosPuntuacion: [],
    }],
    opcionesFinca: {
      suelo: [{ valor: 'desconocido', etiqueta: 'Desconocido' }],
      drenaje: [{ valor: 'desconocido', etiqueta: 'Desconocido' }],
      riego: [{ valor: 'desconocido', etiqueta: 'Desconocido' }],
      prioridad: [{ valor: 'equilibrio', etiqueta: 'Equilibrio' }, { valor: 'agua', etiqueta: 'Agua' }, { valor: 'suelo', etiqueta: 'Suelo' }],
      mesInicio: [{ valor: 5, etiqueta: 'Mayo' }],
    },
  };
}

const atributosSinteticos = [
  { id: 'atributo-ventana-sintetico', alcanceGeografico: 'local', localidad: 'Liberia' },
  { id: 'atributo-duracion-sintetico', alcanceGeografico: 'regional', localidad: 'Chorotega' },
];

function declaracion({
  atributoId = atributosSinteticos[0].id,
  fuenteId = 'fuente-uno',
  respaldaAtributo = true,
  nivelEvidencia = 'directa_local',
  alcanceGeografico = 'local',
  localidad = 'Liberia',
  contextoFuente = 'sintetica_prueba',
} = {}) {
  return { atributoId, fuenteId, respaldaAtributo, nivelEvidencia, alcanceGeografico, localidad, contextoFuente };
}

function resolver({
  atributos = atributosSinteticos.slice(0, 1),
  declaraciones = [declaracion()],
  modo = MODOS_PUNTUACION_D7.PRUEBA_SINTETICA,
  catalogo = crearCatalogoSintetico(),
} = {}) {
  return resolverEvidenciaAtributos({ catalogo, atributos, declaraciones, modo });
}

test('resuelve declaraciones sintéticas por atributo sin asumir que otra fuente cubre todos los atributos', () => {
  const resultado = resolver({
    atributos: atributosSinteticos,
    declaraciones: [
      declaracion(),
      declaracion({
        atributoId: atributosSinteticos[1].id,
        fuenteId: 'fuente-dos',
        nivelEvidencia: 'extrapolada',
        alcanceGeografico: 'regional',
        localidad: 'Chorotega',
      }),
    ],
  });
  assert.deepEqual(resultado.resultados.map((item) => item.atributoId), atributosSinteticos.map((item) => item.id));
  assert.equal(resultado.resultados[0].evidencias[0].estado, ESTADOS_EVIDENCIA_ATRIBUTO.EVIDENCIA_DECLARADA);
  assert.equal(resultado.resultados[0].evidencias[0].naturalezaFuente, 'sintetica_prueba');
  assert.equal(resultado.resultados[1].evidencias[0].estado, ESTADOS_EVIDENCIA_ATRIBUTO.EVIDENCIA_DECLARADA);
  assert.equal(resultado.calidadCientificaVerificada, false);
  assert.equal(resultado.recomendacionesHabilitadas, false);
});

test('distingue atributos sin fuente y fuentes que no declaran respaldar el atributo', () => {
  const resultado = resolver({
    atributos: [atributosSinteticos[0], atributosSinteticos[1]],
    declaraciones: [declaracion({ atributoId: atributosSinteticos[1].id, fuenteId: null, respaldaAtributo: false })],
  });
  assert.equal(resultado.resultados[0].estado, ESTADOS_EVIDENCIA_ATRIBUTO.ATRIBUTO_SIN_FUENTE);
  assert.equal(resultado.resultados[1].evidencias[0].estado, ESTADOS_EVIDENCIA_ATRIBUTO.ATRIBUTO_SIN_FUENTE);

  const noRespalda = resolver({
    declaraciones: [declaracion({ respaldaAtributo: false })],
  });
  assert.equal(noRespalda.resultados[0].evidencias[0].estado, ESTADOS_EVIDENCIA_ATRIBUTO.FUENTE_NO_DECLARA_ATRIBUTO);
});

test('distingue una referencia de fuente no resuelta', () => {
  const resultado = resolver({ declaraciones: [declaracion({ fuenteId: 'fuente-ausente' })] });
  assert.equal(resultado.resultados[0].evidencias[0].estado, ESTADOS_EVIDENCIA_ATRIBUTO.FUENTE_NO_RESUELTA);
});

test('preserva nivel y alcance y señala alcance no coincidente sin inferir contención geográfica', () => {
  const resultado = resolver({
    declaraciones: [declaracion({ nivelEvidencia: 'extrapolada', alcanceGeografico: 'regional', localidad: 'Chorotega' })],
  });
  const evidencia = resultado.resultados[0].evidencias[0];
  assert.equal(evidencia.estado, ESTADOS_EVIDENCIA_ATRIBUTO.ALCANCE_NO_COINCIDENTE);
  assert.equal(evidencia.nivelEvidencia, 'extrapolada');
  assert.equal(evidencia.alcanceGeografico, 'regional');
  assert.equal(evidencia.calidadCientificaVerificada, false);
});

test('mantiene niveles D19 existentes y diferencia evidencia parcial o pendiente', () => {
  const parcial = resolver({ declaraciones: [declaracion({ nivelEvidencia: 'parcial' })] });
  const pendiente = resolver({ declaraciones: [declaracion({ nivelEvidencia: 'pendiente' })] });
  assert.equal(parcial.resultados[0].evidencias[0].estado, ESTADOS_EVIDENCIA_ATRIBUTO.EVIDENCIA_PARCIAL);
  assert.equal(pendiente.resultados[0].evidencias[0].estado, ESTADOS_EVIDENCIA_ATRIBUTO.EVIDENCIA_PENDIENTE);
});

test('distingue fixture sintético del contexto de referencia del catálogo en modo real sin validar calidad científica', () => {
  const sintetico = resolver();
  assert.equal(sintetico.modo, MODOS_PUNTUACION_D7.PRUEBA_SINTETICA);
  assert.equal(sintetico.resultados[0].evidencias[0].naturalezaFuente, 'sintetica_prueba');

  const rechazadoEnReal = resolver({ modo: MODOS_PUNTUACION_D7.REAL });
  assert.equal(rechazadoEnReal.resultados[0].evidencias[0].estado, ESTADOS_EVIDENCIA_ATRIBUTO.CONTEXTO_FUENTE_INCOMPATIBLE);

  const declaradoEnReal = resolver({
    modo: MODOS_PUNTUACION_D7.REAL,
    declaraciones: [declaracion({ contextoFuente: 'referencia_catalogo' })],
  });
  assert.equal(declaradoEnReal.resultados[0].evidencias[0].estado, ESTADOS_EVIDENCIA_ATRIBUTO.EVIDENCIA_DECLARADA);
  assert.equal(declaradoEnReal.resultados[0].evidencias[0].naturalezaFuente, 'referencia_catalogo_no_verificada');
  assert.equal(declaradoEnReal.recomendacionesHabilitadas, false);
});

test('acepta más de una fuente por atributo y conserva cada declaración por separado', () => {
  const resultado = resolver({ declaraciones: [
    declaracion(),
    declaracion({
      fuenteId: 'fuente-dos',
      nivelEvidencia: 'extrapolada',
      alcanceGeografico: 'regional',
      localidad: 'Chorotega',
    }),
  ] });
  assert.equal(resultado.resultados[0].evidencias.length, 2);
  assert.deepEqual(resultado.resultados[0].evidencias.map((item) => item.fuenteId), ['fuente-uno', 'fuente-dos']);
});

test('rechaza niveles, alcances y estructuras fuera de los vocabularios existentes', () => {
  assert.throws(
    () => resolver({ declaraciones: [declaracion({ nivelEvidencia: 'aprobada' })] }),
    (error) => error.codigo === CODIGOS_ERROR_EVIDENCIA_ATRIBUTO.NIVEL_EVIDENCIA_INVALIDO
  );
  assert.throws(
    () => resolver({ declaraciones: [declaracion({ alcanceGeografico: 'global', localidad: null })] }),
    (error) => error.codigo === CODIGOS_ERROR_EVIDENCIA_ATRIBUTO.ALCANCE_INVALIDO
  );
  assert.throws(
    () => resolver({ modo: 'demo' }),
    (error) => error.codigo === CODIGOS_ERROR_EVIDENCIA_ATRIBUTO.ENTRADA_INVALIDA
  );
});

test('es inmutable y determinista con entradas congeladas', () => {
  const entrada = {
    catalogo: crearCatalogoSintetico(),
    atributos: structuredClone(atributosSinteticos.slice(0, 1)),
    declaraciones: [declaracion()],
    modo: MODOS_PUNTUACION_D7.PRUEBA_SINTETICA,
  };
  const congelarProfundo = (valor) => {
    if (valor && typeof valor === 'object' && !Object.isFrozen(valor)) {
      Object.freeze(valor);
      Object.values(valor).forEach(congelarProfundo);
    }
    return valor;
  };
  congelarProfundo(entrada);
  const primera = resolverEvidenciaAtributos(entrada);
  const segunda = resolverEvidenciaAtributos(entrada);
  assert.deepEqual(primera, segunda);
  assert.ok(Object.isFrozen(primera));
  assert.ok(Object.isFrozen(primera.resultados));
  assert.ok(Object.isFrozen(primera.resultados[0].evidencias));
});
