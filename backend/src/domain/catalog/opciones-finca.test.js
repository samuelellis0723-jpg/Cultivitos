import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ESTADOS_OPCIONES_FINCA,
  obtenerOpcionesFinca,
  validarValorFinca,
} from './opciones-finca.js';

function crearCatalogoPrueba() {
  return {
    version: 'catalogo-prueba-0.0.0',
    opcionesFinca: {
      suelo: [
        { valor: 'textura-ficticia-a', etiqueta: 'Textura ficticia A' },
        { valor: 'textura-ficticia-b', etiqueta: 'Textura ficticia B' },
      ],
      drenaje: [{ valor: 'drenaje-ficticio', etiqueta: 'Drenaje ficticio' }],
      riego: [{ valor: 'riego-ficticio', etiqueta: 'Riego ficticio' }],
      prioridad: [
        { valor: 'equilibrio', etiqueta: 'Equilibrio (prueba)' },
        { valor: 'agua', etiqueta: 'Agua (prueba)' },
        { valor: 'suelo', etiqueta: 'Suelo (prueba)' },
      ],
      mesInicio: [
        { valor: 1, etiqueta: 'Enero (prueba)' },
        { valor: 12, etiqueta: 'Diciembre (prueba)' },
      ],
      claveFutura: [{ valor: 'valor-futuro', etiqueta: 'Valor futuro (prueba)' }],
    },
  };
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

test('obtiene las opciones declaradas y conserva valor y etiqueta', () => {
  const catalogo = crearCatalogoPrueba();
  const resultado = obtenerOpcionesFinca(catalogo, 'suelo');

  assert.equal(resultado.disponible, true);
  assert.equal(resultado.clave, 'suelo');
  assert.equal(resultado.estado, ESTADOS_OPCIONES_FINCA.DISPONIBLE);
  assert.equal(resultado.motivo, null);
  assert.deepEqual(resultado.opciones, [
    { valor: 'textura-ficticia-a', etiqueta: 'Textura ficticia A' },
    { valor: 'textura-ficticia-b', etiqueta: 'Textura ficticia B' },
  ]);

  const meses = obtenerOpcionesFinca(catalogo, 'mesInicio');

  assert.deepEqual(meses.opciones, [
    { valor: 1, etiqueta: 'Enero (prueba)' },
    { valor: 12, etiqueta: 'Diciembre (prueba)' },
  ]);
});

test('valida un valor existente y devuelve la opción completa', () => {
  const catalogo = crearCatalogoPrueba();
  const resultado = validarValorFinca(catalogo, 'prioridad', 'agua');

  assert.equal(resultado.valido, true);
  assert.equal(resultado.clave, 'prioridad');
  assert.equal(resultado.valor, 'agua');
  assert.equal(resultado.estado, ESTADOS_OPCIONES_FINCA.VALIDO);
  assert.equal(resultado.motivo, null);
  assert.deepEqual(resultado.opcion, {
    valor: 'agua',
    etiqueta: 'Agua (prueba)',
  });

  const mes = validarValorFinca(catalogo, 'mesInicio', 12);

  assert.equal(mes.valido, true);
  assert.deepEqual(mes.opcion, { valor: 12, etiqueta: 'Diciembre (prueba)' });
});

test('rechaza un valor que no pertenece al catálogo', () => {
  const catalogo = crearCatalogoPrueba();
  const resultado = validarValorFinca(catalogo, 'suelo', 'textura-ficticia-z');

  assert.equal(resultado.valido, false);
  assert.equal(resultado.estado, ESTADOS_OPCIONES_FINCA.NO_PERTENECE);
  assert.equal(resultado.opcion, null);
  assert.equal(typeof resultado.motivo, 'string');
  assert.ok(resultado.motivo.length > 0);
});

test('maneja un catálogo sin opcionesFinca sin convertirlo en error fatal', () => {
  const catalogo = { version: 'catalogo-prueba-0.0.0' };

  const consulta = obtenerOpcionesFinca(catalogo, 'suelo');

  assert.equal(consulta.disponible, false);
  assert.equal(consulta.estado, ESTADOS_OPCIONES_FINCA.OPCIONES_NO_DISPONIBLES);
  assert.deepEqual(consulta.opciones, []);
  assert.equal(typeof consulta.motivo, 'string');

  const validacion = validarValorFinca(catalogo, 'suelo', 'textura-ficticia-a');

  assert.equal(validacion.valido, false);
  assert.equal(validacion.estado, ESTADOS_OPCIONES_FINCA.OPCIONES_NO_DISPONIBLES);
  assert.equal(validacion.opcion, null);
});

test('distingue una clave no declarada de una lista vacía', () => {
  const catalogo = crearCatalogoPrueba();
  const claveAusente = obtenerOpcionesFinca(catalogo, 'clave-inexistente');

  assert.equal(claveAusente.disponible, false);
  assert.equal(claveAusente.estado, ESTADOS_OPCIONES_FINCA.CLAVE_NO_DECLARADA);
  assert.deepEqual(claveAusente.opciones, []);

  catalogo.opcionesFinca.suelo = [];

  const listaVacia = obtenerOpcionesFinca(catalogo, 'suelo');
  const validacion = validarValorFinca(catalogo, 'suelo', 'textura-ficticia-a');

  assert.equal(listaVacia.disponible, true);
  assert.equal(listaVacia.estado, ESTADOS_OPCIONES_FINCA.DISPONIBLE);
  assert.deepEqual(listaVacia.opciones, []);
  assert.equal(validacion.valido, false);
  assert.equal(validacion.estado, ESTADOS_OPCIONES_FINCA.NO_PERTENECE);
});

test('maneja entradas malformadas con resultados explícitos', () => {
  const catalogo = crearCatalogoPrueba();

  const catalogosInvalidos = [null, [], 'catalogo', 1];
  for (const invalido of catalogosInvalidos) {
    const resultado = obtenerOpcionesFinca(invalido, 'suelo');

    assert.equal(resultado.disponible, false);
    assert.equal(resultado.estado, ESTADOS_OPCIONES_FINCA.ENTRADA_INVALIDA);
    assert.deepEqual(resultado.opciones, []);
    assert.equal(typeof resultado.motivo, 'string');
  }

  for (const claveInvalida of [undefined, null, '', '   ', 1]) {
    const resultado = obtenerOpcionesFinca(catalogo, claveInvalida);

    assert.equal(resultado.disponible, false);
    assert.equal(resultado.estado, ESTADOS_OPCIONES_FINCA.ENTRADA_INVALIDA);
  }

  const opcionesNoObjeto = crearCatalogoPrueba();
  opcionesNoObjeto.opcionesFinca = [];

  assert.equal(
    obtenerOpcionesFinca(opcionesNoObjeto, 'suelo').estado,
    ESTADOS_OPCIONES_FINCA.ESTRUCTURA_INVALIDA
  );

  const listaNoArray = crearCatalogoPrueba();
  listaNoArray.opcionesFinca.suelo = 'no-es-array';

  assert.equal(
    obtenerOpcionesFinca(listaNoArray, 'suelo').estado,
    ESTADOS_OPCIONES_FINCA.ESTRUCTURA_INVALIDA
  );

  const opcionesMalformadas = [
    null,
    {},
    { valor: 'textura-ficticia-a' },
    { etiqueta: 'Sin valor' },
    { valor: '', etiqueta: 'Valor vacío' },
    { valor: 'textura-ficticia-a', etiqueta: '' },
    { valor: Number.NaN, etiqueta: 'Valor no finito' },
  ];

  for (const opcion of opcionesMalformadas) {
    const catalogoMalformado = crearCatalogoPrueba();
    catalogoMalformado.opcionesFinca.suelo = [opcion];

    const resultado = obtenerOpcionesFinca(catalogoMalformado, 'suelo');

    assert.equal(resultado.disponible, false);
    assert.equal(resultado.estado, ESTADOS_OPCIONES_FINCA.ESTRUCTURA_INVALIDA);
  }

  const valorAusente = validarValorFinca(catalogo, 'suelo', undefined);
  const valorNulo = validarValorFinca(catalogo, 'suelo', null);

  assert.equal(valorAusente.valido, false);
  assert.equal(valorAusente.estado, ESTADOS_OPCIONES_FINCA.ENTRADA_INVALIDA);
  assert.equal(valorNulo.valido, false);
  assert.equal(valorNulo.estado, ESTADOS_OPCIONES_FINCA.ENTRADA_INVALIDA);

  const valorObjeto = validarValorFinca(catalogo, 'suelo', Object.create(null));

  assert.equal(valorObjeto.valido, false);
  assert.equal(valorObjeto.estado, ESTADOS_OPCIONES_FINCA.NO_PERTENECE);
  assert.equal(typeof valorObjeto.motivo, 'string');
});

test('no modifica el catálogo ni expone referencias mutables a sus opciones', () => {
  const catalogo = crearCatalogoPrueba();
  const copia = structuredClone(catalogo);

  congelarProfundo(catalogo);

  const consulta = obtenerOpcionesFinca(catalogo, 'suelo');

  assert.equal(consulta.disponible, true);
  assert.deepEqual(catalogo, copia);

  consulta.opciones[0].etiqueta = 'Etiqueta mutada en la salida';
  consulta.opciones.push({ valor: 'agregado-ficticio', etiqueta: 'Agregado' });

  assert.deepEqual(catalogo, copia);

  const validacion = validarValorFinca(catalogo, 'suelo', 'textura-ficticia-a');

  assert.equal(validacion.valido, true);
  validacion.opcion.etiqueta = 'Etiqueta mutada en la validación';

  assert.deepEqual(catalogo, copia);
});

test('es determinista y no comparte estado entre llamadas', () => {
  const catalogo = crearCatalogoPrueba();

  const primeraConsulta = obtenerOpcionesFinca(catalogo, 'suelo');
  const segundaConsulta = obtenerOpcionesFinca(catalogo, 'suelo');

  assert.deepEqual(primeraConsulta, segundaConsulta);

  primeraConsulta.opciones[0].etiqueta = 'Etiqueta mutada';
  primeraConsulta.opciones.push({ valor: 'agregado-ficticio', etiqueta: 'Agregado' });

  const terceraConsulta = obtenerOpcionesFinca(catalogo, 'suelo');

  assert.deepEqual(terceraConsulta, segundaConsulta);

  const primeraValidacion = validarValorFinca(catalogo, 'prioridad', 'equilibrio');
  const segundaValidacion = validarValorFinca(catalogo, 'prioridad', 'equilibrio');

  assert.deepEqual(primeraValidacion, segundaValidacion);

  primeraValidacion.opcion.etiqueta = 'Etiqueta mutada';

  const terceraValidacion = validarValorFinca(catalogo, 'prioridad', 'equilibrio');

  assert.deepEqual(terceraValidacion, segundaValidacion);
});

test('respeta vocabularios definidos dinámicamente en el catálogo', () => {
  const catalogo = crearCatalogoPrueba();
  catalogo.opcionesFinca.suelo = [
    { valor: 'vocabulario-ficticio-x', etiqueta: 'Vocabulario ficticio X' },
    { valor: 'vocabulario-ficticio-y', etiqueta: 'Vocabulario ficticio Y' },
  ];

  const consulta = obtenerOpcionesFinca(catalogo, 'suelo');

  assert.deepEqual(consulta.opciones, [
    { valor: 'vocabulario-ficticio-x', etiqueta: 'Vocabulario ficticio X' },
    { valor: 'vocabulario-ficticio-y', etiqueta: 'Vocabulario ficticio Y' },
  ]);

  const validacion = validarValorFinca(catalogo, 'suelo', 'vocabulario-ficticio-y');

  assert.equal(validacion.valido, true);
  assert.deepEqual(validacion.opcion, {
    valor: 'vocabulario-ficticio-y',
    etiqueta: 'Vocabulario ficticio Y',
  });

  const claveFutura = obtenerOpcionesFinca(catalogo, 'claveFutura');

  assert.equal(claveFutura.disponible, true);
  assert.deepEqual(claveFutura.opciones, [
    { valor: 'valor-futuro', etiqueta: 'Valor futuro (prueba)' },
  ]);
});
