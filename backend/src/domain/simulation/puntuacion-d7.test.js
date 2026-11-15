import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CODIGOS_ERROR_D7,
  DIRECCIONES_D7,
  ErrorPuntuacionD7,
  calcularPuntuacionesD7,
} from './puntuacion-d7.js';
import { ESTADOS, calcularMinimaxRegret } from './minimax-regret.js';

const ESCENARIOS = ['habitual', 'seco', 'humedo'];
const FUENTE = 'fixture-sintetico';

function crearReglas() {
  return {
    id: 'fixture-solo-pruebas',
    version: '1',
    indicadores: [
      {
        id: 'agua_sintetica',
        unidad: 'punto_sintetico',
        direccion: DIRECCIONES_D7.MAYOR_MEJOR,
        normalizacion: { min: 0, max: 100 },
        pesosPorPrioridad: { equilibrio: 0.5, agua: 0.8, suelo: 0.2 },
        fuenteIds: [FUENTE],
      },
      {
        id: 'ajuste_suelo_sintetico',
        unidad: 'punto_sintetico',
        direccion: DIRECCIONES_D7.MAYOR_MEJOR,
        normalizacion: { min: 0, max: 100 },
        pesosPorPrioridad: { equilibrio: 0.5, agua: 0.2, suelo: 0.8 },
        fuenteIds: [FUENTE],
      },
    ],
  };
}

function dato(valor, unidad = 'punto_sintetico', fuenteIds = [FUENTE]) {
  return { valor, unidad, fuenteIds };
}

function crearEstrategia(id, valores, extra = {}) {
  return {
    id,
    elegible: true,
    motivosDescarte: [],
    valoresPorEscenario: Object.fromEntries(
      ESCENARIOS.map((escenario, indice) => [
        escenario,
        {
          agua_sintetica: dato(valores.agua[indice]),
          ajuste_suelo_sintetico: dato(valores.suelo[indice]),
        },
      ])
    ),
    ...extra,
  };
}

function crearEntrada(extra = {}) {
  return {
    modo: 'prueba_sintetica',
    prioridad: 'equilibrio',
    escenarios: [...ESCENARIOS],
    reglas: crearReglas(),
    estrategias: [
      crearEstrategia('A', { agua: [80, 40, 70], suelo: [60, 60, 60] }),
      crearEstrategia('B', { agua: [60, 70, 80], suelo: [90, 90, 90] }),
    ],
    evidencia: {
      catalogoVersion: 'fixture-sintetico-1',
      fuentes: [{ id: FUENTE, tipo: 'sintetica', url: null, fecha: null }],
    },
    ...extra,
  };
}

function assertErrorD7(callback, codigo) {
  assert.throws(callback, (error) => {
    assert.ok(error instanceof ErrorPuntuacionD7);
    assert.equal(error.codigo, codigo);
    assert.equal(typeof error.campo, 'string');
    return true;
  });
}

function aMinimax(salida) {
  return calcularMinimaxRegret({
    escenarios: salida.escenarios,
    estrategias: salida.resultados.map((resultado) => ({
      id: resultado.estrategiaId,
      elegible: resultado.elegible,
      puntuaciones: resultado.puntuaciones,
      motivosDescarte: resultado.motivosDescarte,
    })),
  });
}

function congelarProfundo(valor) {
  if (valor !== null && typeof valor === 'object' && !Object.isFrozen(valor)) {
    Object.freeze(valor);
    for (const clave of Object.keys(valor)) congelarProfundo(valor[clave]);
  }
  return valor;
}

test('produce las puntuaciones documentadas para las tres prioridades y escenarios', () => {
  const entrada = crearEntrada();
  const esperadas = {
    equilibrio: { A: [70, 50, 65], B: [75, 80, 85] },
    agua: { A: [76, 44, 68], B: [66, 74, 82] },
    suelo: { A: [64, 56, 62], B: [84, 86, 88] },
  };

  for (const [prioridad, estrategiasEsperadas] of Object.entries(esperadas)) {
    const salida = calcularPuntuacionesD7({ ...entrada, prioridad });
    assert.deepEqual(salida.escenarios, ESCENARIOS);
    assert.equal(salida.modo, 'prueba_sintetica');
    assert.deepEqual(salida.reglas, { id: 'fixture-solo-pruebas', version: '1' });
    assert.deepEqual(salida.evidencia.fuenteIds, [FUENTE]);

    for (const resultado of salida.resultados) {
      assert.deepEqual(
        ESCENARIOS.map((escenario) => resultado.puntuaciones[escenario]),
        estrategiasEsperadas[resultado.estrategiaId]
      );
      assert.deepEqual(resultado.motivosNoCalculable, {});
    }
  }
});

test('normaliza linealmente un rango distinto de 0–100 y menor_mejor en los extremos', () => {
  const entrada = crearEntrada({
    reglas: {
      id: 'rango-sintetico',
      version: '1',
      indicadores: [{
        id: 'temperatura_sintetica',
        unidad: 'grado_sintetico',
        direccion: DIRECCIONES_D7.MENOR_MEJOR,
        normalizacion: { min: 10, max: 30 },
        pesosPorPrioridad: { equilibrio: 1, agua: 1, suelo: 1 },
        fuenteIds: [FUENTE],
      }],
    },
    estrategias: [{
      id: 'extremos',
      elegible: true,
      motivosDescarte: [],
      valoresPorEscenario: {
        habitual: { temperatura_sintetica: dato(10, 'grado_sintetico') },
        seco: { temperatura_sintetica: dato(20, 'grado_sintetico') },
        humedo: { temperatura_sintetica: dato(30, 'grado_sintetico') },
      },
    }],
  });

  const resultado = calcularPuntuacionesD7(entrada).resultados[0];
  assert.deepEqual(resultado.puntuaciones, { habitual: 100, seco: 50, humedo: 0 });
});

test('faltantes son null por escenario y no se redistribuyen pesos, incluso si pesan cero', () => {
  const entrada = crearEntrada();
  entrada.prioridad = 'agua';
  entrada.estrategias[0].valoresPorEscenario.seco.ajuste_suelo_sintetico = null;

  const resultado = calcularPuntuacionesD7(entrada).resultados[0];
  assert.deepEqual(resultado.puntuaciones, { habitual: 76, seco: null, humedo: 68 });
  assert.deepEqual(resultado.motivosNoCalculable, {
    seco: ['INDICADOR_AUSENTE: ajuste_suelo_sintetico'],
  });

  const ceroPeso = crearEntrada();
  ceroPeso.prioridad = 'agua';
  ceroPeso.reglas.indicadores[0].pesosPorPrioridad.agua = 1;
  ceroPeso.reglas.indicadores[1].pesosPorPrioridad.agua = 0;
  ceroPeso.estrategias[0].valoresPorEscenario.seco.ajuste_suelo_sintetico = undefined;
  const ceroResultado = calcularPuntuacionesD7(ceroPeso).resultados[0];
  assert.equal(ceroResultado.puntuaciones.seco, null);
});

test('estrategia descartada conserva motivos y no exige observaciones', () => {
  const entrada = crearEntrada({
    estrategias: [{
      id: 'descartada',
      elegible: false,
      motivosDescarte: ['fuera de ventana', 'evidencia pendiente'],
    }],
  });

  const resultado = calcularPuntuacionesD7(entrada).resultados[0];
  assert.equal(resultado.elegible, false);
  assert.equal(resultado.puntuaciones, null);
  assert.deepEqual(resultado.motivosNoCalculable, {});
  assert.deepEqual(resultado.motivosDescarte, ['fuera de ventana', 'evidencia pendiente']);
});

test('prioridad agua se integra con Minimax sin modificarlo: A=30, B=10, gana B', () => {
  const salidaD7 = calcularPuntuacionesD7({ ...crearEntrada(), prioridad: 'agua' });
  const salidaMinimax = aMinimax(salidaD7);

  assert.equal(salidaMinimax.estado, ESTADOS.COMPLETO);
  assert.equal(salidaMinimax.resultados.find(({ estrategiaId }) => estrategiaId === 'A').peorArrepentimiento, 30);
  assert.equal(salidaMinimax.resultados.find(({ estrategiaId }) => estrategiaId === 'B').peorArrepentimiento, 10);
  assert.deepEqual(salidaMinimax.ganadoras, ['B']);
});

test('una matriz elegible incompleta llega a Minimax como incompleto y sin ganadoras', () => {
  const entrada = crearEntrada({ prioridad: 'agua' });
  entrada.estrategias[0].valoresPorEscenario.seco.agua_sintetica.valor = null;
  const salidaD7 = calcularPuntuacionesD7(entrada);
  const salidaMinimax = aMinimax(salidaD7);

  assert.equal(salidaD7.resultados[0].puntuaciones.seco, null);
  assert.equal(salidaMinimax.estado, ESTADOS.INCOMPLETO);
  assert.deepEqual(salidaMinimax.ganadoras, []);
});

test('rechaza modos real y demo con error identificable', () => {
  assertErrorD7(
    () => calcularPuntuacionesD7({ ...crearEntrada(), modo: 'real' }),
    CODIGOS_ERROR_D7.MODO_NO_HABILITADO
  );
  assertErrorD7(
    () => calcularPuntuacionesD7({ ...crearEntrada(), modo: 'demo' }),
    CODIGOS_ERROR_D7.MODO_NO_HABILITADO
  );
});

test('rechaza prioridad, escenarios desconocidos, repetidos o incompletos', () => {
  assertErrorD7(
    () => calcularPuntuacionesD7({ ...crearEntrada(), prioridad: 'riego' }),
    CODIGOS_ERROR_D7.ENTRADA_INVALIDA
  );
  assertErrorD7(
    () => calcularPuntuacionesD7({ ...crearEntrada(), escenarios: ['habitual', 'seco', 'lluvioso'] }),
    CODIGOS_ERROR_D7.ENTRADA_INVALIDA
  );
  assertErrorD7(
    () => calcularPuntuacionesD7({ ...crearEntrada(), escenarios: ['habitual', 'seco', 'seco'] }),
    CODIGOS_ERROR_D7.ENTRADA_INVALIDA
  );
  assertErrorD7(
    () => calcularPuntuacionesD7({ ...crearEntrada(), escenarios: ['habitual', 'seco'] }),
    CODIGOS_ERROR_D7.ENTRADA_INVALIDA
  );
});

test('rechaza configuración, identificadores y fuentes inválidas o duplicadas', () => {
  const duplicadoIndicador = crearEntrada();
  duplicadoIndicador.reglas.indicadores[1].id = 'agua_sintetica';
  assertErrorD7(() => calcularPuntuacionesD7(duplicadoIndicador), CODIGOS_ERROR_D7.CONFIGURACION_INVALIDA);

  const duplicadaEstrategia = crearEntrada();
  duplicadaEstrategia.estrategias[1].id = 'A';
  assertErrorD7(() => calcularPuntuacionesD7(duplicadaEstrategia), CODIGOS_ERROR_D7.ENTRADA_INVALIDA);

  for (const [min, max] of [[1, 1], [2, 1], [Number.NaN, 2], [0, Number.POSITIVE_INFINITY]]) {
    const entrada = crearEntrada();
    entrada.reglas.indicadores[0].normalizacion = { min, max };
    assertErrorD7(() => calcularPuntuacionesD7(entrada), CODIGOS_ERROR_D7.CONFIGURACION_INVALIDA);
  }

  const tipoFuenteInvalido = crearEntrada();
  tipoFuenteInvalido.evidencia.fuentes[0].tipo = 'dataset';
  assertErrorD7(() => calcularPuntuacionesD7(tipoFuenteInvalido), CODIGOS_ERROR_D7.CONFIGURACION_INVALIDA);

  const fuenteDuplicada = crearEntrada();
  fuenteDuplicada.evidencia.fuentes.push({ id: FUENTE, tipo: 'sintetica' });
  assertErrorD7(() => calcularPuntuacionesD7(fuenteDuplicada), CODIGOS_ERROR_D7.CONFIGURACION_INVALIDA);

  const fuenteSinResolver = crearEntrada();
  fuenteSinResolver.reglas.indicadores[0].fuenteIds = ['ausente'];
  assertErrorD7(() => calcularPuntuacionesD7(fuenteSinResolver), CODIGOS_ERROR_D7.FUENTE_NO_ENCONTRADA);
});

test('comprueba suma de pesos para las tres prioridades y valores válidos', () => {
  for (const cambiarPeso of [
    (pesos) => { pesos.agua = 1.1; },
    (pesos) => { delete pesos.suelo; },
    (pesos) => { pesos.equilibrio = -0.1; },
    (pesos) => { pesos.suelo = Number.POSITIVE_INFINITY; },
  ]) {
    const entrada = crearEntrada();
    cambiarPeso(entrada.reglas.indicadores[0].pesosPorPrioridad);
    assertErrorD7(() => calcularPuntuacionesD7(entrada), CODIGOS_ERROR_D7.CONFIGURACION_INVALIDA);
  }

  const sumaSoloSueloMal = crearEntrada();
  sumaSoloSueloMal.reglas.indicadores[0].pesosPorPrioridad.suelo = 0.3;
  assertErrorD7(() => calcularPuntuacionesD7(sumaSoloSueloMal), CODIGOS_ERROR_D7.CONFIGURACION_INVALIDA);

  const aceptaSumaDecimal = crearEntrada();
  aceptaSumaDecimal.reglas.indicadores[0].pesosPorPrioridad = {
    equilibrio: 0.1,
    agua: 0.2,
    suelo: 0.7,
  };
  aceptaSumaDecimal.reglas.indicadores[1].pesosPorPrioridad = {
    equilibrio: 0.9,
    agua: 0.8,
    suelo: 0.3,
  };
  assert.doesNotThrow(() => calcularPuntuacionesD7(aceptaSumaDecimal));
});

test('rechaza unidades incompatibles, referencias no resueltas y números mal formados', () => {
  const unidad = crearEntrada();
  unidad.estrategias[0].valoresPorEscenario.habitual.agua_sintetica.unidad = 'otra_unidad';
  assertErrorD7(() => calcularPuntuacionesD7(unidad), CODIGOS_ERROR_D7.CONFIGURACION_INVALIDA);

  const fuente = crearEntrada();
  fuente.estrategias[0].valoresPorEscenario.seco.agua_sintetica.fuenteIds = ['no-existe'];
  assertErrorD7(() => calcularPuntuacionesD7(fuente), CODIGOS_ERROR_D7.FUENTE_NO_ENCONTRADA);

  for (const valor of ['80', Number.NaN, Number.POSITIVE_INFINITY, true, -1, 101]) {
    const entrada = crearEntrada();
    entrada.estrategias[0].valoresPorEscenario.habitual.agua_sintetica.valor = valor;
    assertErrorD7(() => calcularPuntuacionesD7(entrada), CODIGOS_ERROR_D7.VALOR_INVALIDO);
  }
});

test('conserva entradas congeladas, es determinista y no comparte referencias de salida', () => {
  const entrada = congelarProfundo(crearEntrada());
  const primera = calcularPuntuacionesD7(entrada);
  const segunda = calcularPuntuacionesD7(entrada);

  assert.deepEqual(primera, segunda);
  primera.resultados[0].puntuaciones.habitual = 0;
  primera.evidencia.fuenteIds.push('modificada');
  assert.equal(entrada.estrategias[0].valoresPorEscenario.habitual.agua_sintetica.valor, 80);
  assert.deepEqual(entrada.reglas.indicadores[0].fuenteIds, [FUENTE]);
});
