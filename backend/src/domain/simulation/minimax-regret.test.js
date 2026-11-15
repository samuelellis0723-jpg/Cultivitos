import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CODIGOS_ERROR,
  ESTADOS,
  ErrorEntradaDominio,
  MOTIVO_MATRIZ_INCOMPLETA,
  MOTIVOS_NO_CALCULABLE,
  calcularMinimaxRegret,
} from './minimax-regret.js';

const ESCENARIOS = ['habitual', 'seco', 'humedo'];

function entrada(estrategias, escenarios = ESCENARIOS) {
  return { escenarios, estrategias };
}

function elegible(id, puntuaciones, extra = {}) {
  return { id, elegible: true, puntuaciones, ...extra };
}

function descartada(id, motivosDescarte, puntuaciones = null) {
  return { id, elegible: false, motivosDescarte, puntuaciones };
}

function resultadoDe(salida, estrategiaId) {
  return salida.resultados.find((resultado) => resultado.estrategiaId === estrategiaId);
}

function congelarProfundo(valor) {
  if (valor !== null && typeof valor === 'object' && !Object.isFrozen(valor)) {
    Object.freeze(valor);

    for (const clave of Object.keys(valor)) {
      congelarProfundo(valor[clave]);
    }
  }

  return valor;
}

function assertEntradaInvalida(entradaInvalida, codigo = CODIGOS_ERROR.ENTRADA_INVALIDA) {
  assert.throws(
    () => calcularMinimaxRegret(entradaInvalida),
    (error) => {
      assert.ok(error instanceof ErrorEntradaDominio);
      assert.equal(error.codigo, codigo);
      return true;
    }
  );
}

test('matriz ficticia del contrato: A=45, B=25, C=10 y ganadora C', () => {
  const salida = calcularMinimaxRegret(
    entrada([
      elegible('A', { habitual: 90, seco: 35, humedo: 55 }),
      elegible('B', { habitual: 75, seco: 80, humedo: 50 }),
      elegible('C', { habitual: 80, seco: 70, humedo: 75 }),
    ])
  );

  assert.equal(salida.estado, ESTADOS.COMPLETO);
  assert.equal(salida.matrizCompleta, true);
  assert.deepEqual(salida.escenarios, ESCENARIOS);
  assert.deepEqual(salida.mejoresPorEscenario, { habitual: 90, seco: 80, humedo: 75 });
  assert.deepEqual(salida.resultados.map((resultado) => resultado.estrategiaId), ['A', 'B', 'C']);

  const a = resultadoDe(salida, 'A');
  const b = resultadoDe(salida, 'B');
  const c = resultadoDe(salida, 'C');

  assert.deepEqual(a.arrepentimientos, { habitual: 0, seco: 45, humedo: 20 });
  assert.deepEqual(b.arrepentimientos, { habitual: 15, seco: 0, humedo: 25 });
  assert.deepEqual(c.arrepentimientos, { habitual: 10, seco: 10, humedo: 0 });
  assert.equal(a.peorArrepentimiento, 45);
  assert.equal(b.peorArrepentimiento, 25);
  assert.equal(c.peorArrepentimiento, 10);
  assert.equal(salida.peorArrepentimientoMinimo, 10);
  assert.deepEqual(salida.ganadoras, ['C']);
  assert.deepEqual(salida.descartes, []);

  for (const resultado of salida.resultados) {
    assert.equal(resultado.elegible, true);
    assert.equal(resultado.evaluada, true);
    assert.equal(resultado.motivoPeorArrepentimiento, null);
    assert.deepEqual(resultado.motivosNoCalculable, {});
    assert.deepEqual(resultado.motivosDescarte, []);
  }
});

test('empates: se seleccionan todas las estrategias con el menor peor arrepentimiento', () => {
  const salida = calcularMinimaxRegret(
    entrada([
      elegible('A', { habitual: 90, seco: 80, humedo: 70 }),
      elegible('B', { habitual: 80, seco: 90, humedo: 70 }),
      elegible('C', { habitual: 70, seco: 70, humedo: 50 }),
    ])
  );

  assert.equal(salida.estado, ESTADOS.COMPLETO);
  assert.deepEqual(salida.mejoresPorEscenario, { habitual: 90, seco: 90, humedo: 70 });
  assert.equal(resultadoDe(salida, 'A').peorArrepentimiento, 10);
  assert.equal(resultadoDe(salida, 'B').peorArrepentimiento, 10);
  assert.equal(resultadoDe(salida, 'C').peorArrepentimiento, 20);
  assert.equal(salida.peorArrepentimientoMinimo, 10);
  assert.deepEqual(salida.ganadoras, ['A', 'B']);
});

test('estrategias no elegibles: conservan motivos y no participan en el cálculo', () => {
  const salida = calcularMinimaxRegret(
    entrada([
      elegible('A', { habitual: 60, seco: 60, humedo: 60 }),
      descartada('B', ['fuera de temporada'], { habitual: 100, seco: 100, humedo: 100 }),
      elegible('C', { habitual: 50, seco: 80, humedo: 70 }),
    ])
  );

  assert.equal(salida.estado, ESTADOS.COMPLETO);
  assert.deepEqual(salida.mejoresPorEscenario, { habitual: 60, seco: 80, humedo: 70 });

  const b = resultadoDe(salida, 'B');
  assert.equal(b.elegible, false);
  assert.equal(b.evaluada, false);
  assert.equal(b.peorArrepentimiento, null);
  assert.equal(b.arrepentimientos, null);
  assert.equal(b.motivoPeorArrepentimiento, null);
  assert.deepEqual(b.motivosDescarte, ['fuera de temporada']);
  assert.deepEqual(b.motivosNoCalculable, {});

  assert.deepEqual(salida.descartes, [{ estrategiaId: 'B', motivos: ['fuera de temporada'] }]);
  assert.deepEqual(salida.ganadoras, ['C']);
});

test('todas las estrategias descartadas: estado sin_opciones y ganadoras vacías', () => {
  const salida = calcularMinimaxRegret(
    entrada([
      descartada('A', ['suelo incompatible']),
      descartada('B', ['riego insuficiente', 'fuera de ventana'], { habitual: 90 }),
    ])
  );

  assert.equal(salida.estado, ESTADOS.SIN_OPCIONES);
  assert.equal(salida.matrizCompleta, false);
  assert.deepEqual(salida.ganadoras, []);
  assert.equal(salida.peorArrepentimientoMinimo, null);
  assert.deepEqual(salida.mejoresPorEscenario, { habitual: null, seco: null, humedo: null });
  assert.deepEqual(salida.descartes, [
    { estrategiaId: 'A', motivos: ['suelo incompatible'] },
    { estrategiaId: 'B', motivos: ['riego insuficiente', 'fuera de ventana'] },
  ]);

  for (const resultado of salida.resultados) {
    assert.equal(resultado.evaluada, false);
    assert.equal(resultado.peorArrepentimiento, null);
    assert.equal(resultado.arrepentimientos, null);
    assert.equal(resultado.motivoPeorArrepentimiento, null);
  }
});

test('puntuaciones esenciales faltantes: estado incompleto, nulls y motivos explícitos', () => {
  const salida = calcularMinimaxRegret(
    entrada([
      elegible('A', { habitual: 90, seco: 35, humedo: 55 }),
      elegible('B', { habitual: 75, seco: 80 }),
    ])
  );

  assert.equal(salida.estado, ESTADOS.INCOMPLETO);
  assert.equal(salida.matrizCompleta, false);
  assert.deepEqual(salida.ganadoras, []);
  assert.equal(salida.peorArrepentimientoMinimo, null);
  assert.deepEqual(salida.mejoresPorEscenario, { habitual: 90, seco: 80, humedo: 55 });

  const a = resultadoDe(salida, 'A');
  const b = resultadoDe(salida, 'B');

  assert.equal(a.evaluada, true);
  assert.deepEqual(a.puntuaciones, { habitual: 90, seco: 35, humedo: 55 });
  assert.deepEqual(a.arrepentimientos, { habitual: null, seco: null, humedo: null });
  assert.equal(a.peorArrepentimiento, null);
  assert.equal(a.motivoPeorArrepentimiento, MOTIVO_MATRIZ_INCOMPLETA);

  assert.equal(b.puntuaciones.humedo, null);
  assert.deepEqual(b.motivosNoCalculable, {
    humedo: MOTIVOS_NO_CALCULABLE.PUNTUACION_AUSENTE,
  });
  assert.deepEqual(b.arrepentimientos, { habitual: null, seco: null, humedo: null });
  assert.equal(b.peorArrepentimiento, null);
  assert.equal(b.motivoPeorArrepentimiento, MOTIVO_MATRIZ_INCOMPLETA);
});

test('puntuaciones ausentes por completo: incompleto sin inventar valores', () => {
  const salida = calcularMinimaxRegret(entrada([elegible('A'), elegible('B', null)]));

  assert.equal(salida.estado, ESTADOS.INCOMPLETO);
  assert.deepEqual(salida.ganadoras, []);
  assert.deepEqual(salida.mejoresPorEscenario, { habitual: null, seco: null, humedo: null });

  for (const identificador of ['A', 'B']) {
    const resultado = resultadoDe(salida, identificador);
    assert.deepEqual(resultado.puntuaciones, { habitual: null, seco: null, humedo: null });
    assert.deepEqual(resultado.motivosNoCalculable, {
      habitual: MOTIVOS_NO_CALCULABLE.PUNTUACION_AUSENTE,
      seco: MOTIVOS_NO_CALCULABLE.PUNTUACION_AUSENTE,
      humedo: MOTIVOS_NO_CALCULABLE.PUNTUACION_AUSENTE,
    });
    assert.equal(resultado.peorArrepentimiento, null);
    assert.equal(resultado.motivoPeorArrepentimiento, MOTIVO_MATRIZ_INCOMPLETA);
  }
});

test('valores fuera de rango: la entrada se rechaza, no se trata como dato faltante', () => {
  assertEntradaInvalida(
    entrada([elegible('A', { habitual: 101, seco: 50, humedo: 50 })]),
    CODIGOS_ERROR.PUNTUACION_FUERA_DE_RANGO
  );
  assertEntradaInvalida(
    entrada([elegible('A', { habitual: -0.01, seco: 50, humedo: 50 })]),
    CODIGOS_ERROR.PUNTUACION_FUERA_DE_RANGO
  );
});

test('límites 0 y 100 son puntuaciones válidas', () => {
  const salida = calcularMinimaxRegret(
    entrada(
      [
        elegible('A', { uno: 100, dos: 0 }),
        elegible('B', { uno: 0, dos: 100 }),
      ],
      ['uno', 'dos']
    )
  );

  assert.equal(salida.estado, ESTADOS.COMPLETO);
  assert.deepEqual(salida.mejoresPorEscenario, { uno: 100, dos: 100 });
  assert.equal(resultadoDe(salida, 'A').peorArrepentimiento, 100);
  assert.equal(resultadoDe(salida, 'B').peorArrepentimiento, 100);
  assert.deepEqual(salida.ganadoras, ['A', 'B']);
});

test('entradas malformadas: se rechazan explícitamente', () => {
  assertEntradaInvalida(null);
  assertEntradaInvalida([]);
  assertEntradaInvalida({});
  assertEntradaInvalida({ escenarios: [], estrategias: [] });
  assertEntradaInvalida({ escenarios: ['habitual', 'habitual'], estrategias: [] });
  assertEntradaInvalida({ escenarios: [''], estrategias: [] });
  assertEntradaInvalida({ escenarios: [1], estrategias: [] });
  assertEntradaInvalida({ escenarios: ESCENARIOS });
  assertEntradaInvalida({ escenarios: ESCENARIOS, estrategias: 'A' });
  assertEntradaInvalida(entrada([null]));
  assertEntradaInvalida(entrada([{ elegible: true, puntuaciones: {} }]));
  assertEntradaInvalida(entrada([{ id: '', elegible: true, puntuaciones: {} }]));
  assertEntradaInvalida(entrada([{ id: '  ', elegible: true, puntuaciones: {} }]));
  assertEntradaInvalida(entrada([elegible('A', {}), elegible('A', {})]));
  assertEntradaInvalida(entrada([{ id: 'A', puntuaciones: {} }]));
  assertEntradaInvalida(entrada([{ id: 'A', elegible: 'si', puntuaciones: {} }]));
  assertEntradaInvalida(entrada([{ id: 'A', elegible: false }]));
  assertEntradaInvalida(entrada([{ id: 'A', elegible: false, motivosDescarte: [] }]));
  assertEntradaInvalida(entrada([{ id: 'A', elegible: false, motivosDescarte: [''] }]));
  assertEntradaInvalida(entrada([{ id: 'A', elegible: true, motivosDescarte: ['x'] }]));
  assertEntradaInvalida(entrada([descartada('A', ['x'], 'puntuaciones')]));
  assertEntradaInvalida(entrada([elegible('A', [90, 35, 55])]));
  assertEntradaInvalida(entrada([elegible('A', { habitual: 90, otro: 50 })]));
  assertEntradaInvalida(entrada([elegible('A', { habitual: '90' })]));
  assertEntradaInvalida(entrada([elegible('A', { habitual: Number.NaN })]));
  assertEntradaInvalida(entrada([elegible('A', { habitual: Number.POSITIVE_INFINITY })]));
  assertEntradaInvalida(entrada([elegible('A', { habitual: true })]));
});

test('inmutabilidad: no se modifican los datos de entrada', () => {
  const entradaOriginal = entrada([
    elegible('A', { habitual: 90, seco: 35, humedo: 55 }),
    descartada('B', ['fuera de temporada'], { habitual: 100, seco: 100, humedo: 100 }),
  ]);
  const copia = structuredClone(entradaOriginal);

  congelarProfundo(entradaOriginal);

  const salida = calcularMinimaxRegret(entradaOriginal);

  assert.deepEqual(entradaOriginal, copia);
  assert.equal(salida.estado, ESTADOS.COMPLETO);

  salida.resultados[0].puntuaciones.habitual = 0;
  salida.resultados[1].motivosDescarte.push('motivo añadido a la salida');

  assert.equal(entradaOriginal.estrategias[0].puntuaciones.habitual, 90);
  assert.deepEqual(entradaOriginal.estrategias[1].motivosDescarte, ['fuera de temporada']);
});

test('determinismo: la misma entrada produce la misma salida', () => {
  const entradaFija = entrada([
    elegible('A', { habitual: 90, seco: 35, humedo: 55 }),
    elegible('B', { habitual: 75, seco: 80, humedo: 50 }),
    elegible('C', { habitual: 80, seco: 70, humedo: 75 }),
  ]);

  const primera = calcularMinimaxRegret(entradaFija);
  const segunda = calcularMinimaxRegret(entradaFija);

  assert.deepEqual(primera, segunda);

  primera.ganadoras.push('A');

  const tercera = calcularMinimaxRegret(entradaFija);

  assert.deepEqual(tercera, segunda);
});
