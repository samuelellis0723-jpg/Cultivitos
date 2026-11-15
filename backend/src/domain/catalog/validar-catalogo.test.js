import test from 'node:test';
import assert from 'node:assert/strict';
import { CODIGOS_ERROR_CATALOGO, validarCatalogo } from './validar-catalogo.js';

function crearFuentePrueba(id = 'fuente-prueba-1') {
  return {
    id,
    tipo: 'dataset',
    titulo: 'Fuente ficticia de prueba estructural',
    url: null,
    fecha: null,
    notas: 'Dato ficticio para pruebas; no es una fuente agronómica real.',
  };
}

function crearCicloPrueba(id, cultivoId, inicioMes, finMes) {
  return {
    id,
    cultivoId,
    ventanaSiembra: { inicioMes, finMes },
    duracionMeses: 3,
    fuenteId: 'fuente-prueba-1',
  };
}

function crearCatalogoValido() {
  return {
    version: 'catalogo-prueba-0.0.0',
    fuentes: [crearFuentePrueba()],
    cultivos: [
      {
        id: 'cultivo-prueba-a',
        nombre: 'Cultivo ficticio A',
        fuenteId: 'fuente-prueba-1',
        ciclos: [
          crearCicloPrueba('ciclo-prueba-a1', 'cultivo-prueba-a', 1, 3),
          crearCicloPrueba('ciclo-prueba-a2', 'cultivo-prueba-a', 4, 6),
        ],
      },
      {
        id: 'cultivo-prueba-b',
        nombre: 'Cultivo ficticio B',
        fuenteId: 'fuente-prueba-1',
        ciclos: [crearCicloPrueba('ciclo-prueba-b1', 'cultivo-prueba-b', 7, 9)],
      },
    ],
    estrategias: [
      {
        id: 'estrategia-prueba-1',
        nombre: 'Estrategia ficticia 1',
        descripcion: 'Combinación ficticia para comprobar la estructura.',
        pasos: [
          { orden: 1, cultivoId: 'cultivo-prueba-a', cicloId: 'ciclo-prueba-a1' },
          { orden: 2, cultivoId: 'cultivo-prueba-b', cicloId: 'ciclo-prueba-b1' },
        ],
        parametrosPuntuacion: [
          {
            id: 'parametro-prueba-1',
            valor: 0,
            unidad: 'unidad-ficticia',
            fuenteId: 'fuente-prueba-1',
            notas: null,
          },
        ],
        fuenteId: 'fuente-prueba-1',
      },
    ],
    opcionesFinca: {
      suelo: [{ valor: 'desconocido', etiqueta: 'Desconocido (prueba)' }],
      drenaje: [{ valor: 'desconocido', etiqueta: 'Desconocido (prueba)' }],
      riego: [{ valor: 'desconocido', etiqueta: 'Desconocido (prueba)' }],
      prioridad: [
        { valor: 'equilibrio', etiqueta: 'Equilibrio (prueba)' },
        { valor: 'agua', etiqueta: 'Agua (prueba)' },
        { valor: 'suelo', etiqueta: 'Suelo (prueba)' },
      ],
      mesInicio: [{ valor: 1, etiqueta: 'Enero (prueba)' }],
    },
  };
}

function buscarError(resultado, codigo, campoParcial) {
  return resultado.errores.find(
    (error) => error.codigo === codigo && error.campo.includes(campoParcial)
  );
}

function assertError(resultado, codigo, campoParcial) {
  const error = buscarError(resultado, codigo, campoParcial);

  assert.ok(
    error,
    `Se esperaba ${codigo} en "${campoParcial}". Errores: ${JSON.stringify(resultado.errores)}`
  );
  assert.equal(typeof error.motivo, 'string');
  assert.ok(error.motivo.length > 0);

  return error;
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

test('acepta un catálogo estructuralmente válido con datos ficticios', () => {
  const resultado = validarCatalogo(crearCatalogoValido());

  assert.equal(resultado.valido, true);
  assert.deepEqual(resultado.errores, []);
});

test('exige una versión no vacía', () => {
  const sinVersion = crearCatalogoValido();
  delete sinVersion.version;

  assertError(validarCatalogo(sinVersion), CODIGOS_ERROR_CATALOGO.CAMPO_REQUERIDO, 'version');

  const versionVacia = crearCatalogoValido();
  versionVacia.version = '   ';

  assertError(
    validarCatalogo(versionVacia),
    CODIGOS_ERROR_CATALOGO.VERSION_INVALIDA,
    'version'
  );

  const versionNoTexto = crearCatalogoValido();
  versionNoTexto.version = 1;

  assertError(
    validarCatalogo(versionNoTexto),
    CODIGOS_ERROR_CATALOGO.VERSION_INVALIDA,
    'version'
  );
});

test('rechaza identificadores duplicados en fuentes, cultivos, ciclos, estrategias y parámetros', () => {
  const fuenteDuplicada = crearCatalogoValido();
  fuenteDuplicada.fuentes.push(crearFuentePrueba());

  assertError(
    validarCatalogo(fuenteDuplicada),
    CODIGOS_ERROR_CATALOGO.IDENTIFICADOR_DUPLICADO,
    'fuentes[1].id'
  );

  const cultivoDuplicado = crearCatalogoValido();
  cultivoDuplicado.cultivos.push(structuredClone(cultivoDuplicado.cultivos[0]));

  assertError(
    validarCatalogo(cultivoDuplicado),
    CODIGOS_ERROR_CATALOGO.IDENTIFICADOR_DUPLICADO,
    'cultivos[2].id'
  );

  const cicloDuplicado = crearCatalogoValido();
  cicloDuplicado.cultivos[0].ciclos.push(
    structuredClone(cicloDuplicado.cultivos[0].ciclos[0])
  );

  assertError(
    validarCatalogo(cicloDuplicado),
    CODIGOS_ERROR_CATALOGO.IDENTIFICADOR_DUPLICADO,
    'cultivos[0].ciclos[2].id'
  );

  const estrategiaDuplicada = crearCatalogoValido();
  estrategiaDuplicada.estrategias.push(structuredClone(estrategiaDuplicada.estrategias[0]));

  assertError(
    validarCatalogo(estrategiaDuplicada),
    CODIGOS_ERROR_CATALOGO.IDENTIFICADOR_DUPLICADO,
    'estrategias[1].id'
  );

  const parametroDuplicado = crearCatalogoValido();
  parametroDuplicado.estrategias[0].parametrosPuntuacion.push(
    structuredClone(parametroDuplicado.estrategias[0].parametrosPuntuacion[0])
  );

  assertError(
    validarCatalogo(parametroDuplicado),
    CODIGOS_ERROR_CATALOGO.IDENTIFICADOR_DUPLICADO,
    'estrategias[0].parametrosPuntuacion[1].id'
  );
});

test('rechaza referencias a fuentes inexistentes en cultivos, ciclos, estrategias y parámetros', () => {
  const cultivoSinFuente = crearCatalogoValido();
  cultivoSinFuente.cultivos[0].fuenteId = 'fuente-inexistente';

  assertError(
    validarCatalogo(cultivoSinFuente),
    CODIGOS_ERROR_CATALOGO.FUENTE_NO_ENCONTRADA,
    'cultivos[0].fuenteId'
  );

  const cicloSinFuente = crearCatalogoValido();
  cicloSinFuente.cultivos[0].ciclos[0].fuenteId = 'fuente-inexistente';

  assertError(
    validarCatalogo(cicloSinFuente),
    CODIGOS_ERROR_CATALOGO.FUENTE_NO_ENCONTRADA,
    'cultivos[0].ciclos[0].fuenteId'
  );

  const estrategiaSinFuente = crearCatalogoValido();
  estrategiaSinFuente.estrategias[0].fuenteId = 'fuente-inexistente';

  assertError(
    validarCatalogo(estrategiaSinFuente),
    CODIGOS_ERROR_CATALOGO.FUENTE_NO_ENCONTRADA,
    'estrategias[0].fuenteId'
  );

  const parametroSinFuente = crearCatalogoValido();
  parametroSinFuente.estrategias[0].parametrosPuntuacion[0].fuenteId = 'fuente-inexistente';

  assertError(
    validarCatalogo(parametroSinFuente),
    CODIGOS_ERROR_CATALOGO.FUENTE_NO_ENCONTRADA,
    'estrategias[0].parametrosPuntuacion[0].fuenteId'
  );
});

test('rechaza cultivos y ciclos inexistentes en los pasos de una estrategia', () => {
  const cultivoInexistente = crearCatalogoValido();
  cultivoInexistente.estrategias[0].pasos[0].cultivoId = 'cultivo-inexistente';

  assertError(
    validarCatalogo(cultivoInexistente),
    CODIGOS_ERROR_CATALOGO.CULTIVO_NO_ENCONTRADO,
    'estrategias[0].pasos[0].cultivoId'
  );

  const cicloInexistente = crearCatalogoValido();
  cicloInexistente.estrategias[0].pasos[0].cicloId = 'ciclo-inexistente';

  assertError(
    validarCatalogo(cicloInexistente),
    CODIGOS_ERROR_CATALOGO.CICLO_NO_ENCONTRADO,
    'estrategias[0].pasos[0].cicloId'
  );
});

test('rechaza ciclos asociados al cultivo incorrecto', () => {
  const cicloAnidadoIncorrecto = crearCatalogoValido();
  cicloAnidadoIncorrecto.cultivos[0].ciclos[0].cultivoId = 'cultivo-prueba-b';

  assertError(
    validarCatalogo(cicloAnidadoIncorrecto),
    CODIGOS_ERROR_CATALOGO.CICLO_NO_PERTENECE_AL_CULTIVO,
    'cultivos[0].ciclos[0].cultivoId'
  );

  const pasoConCicloAjeno = crearCatalogoValido();
  pasoConCicloAjeno.estrategias[0].pasos[1].cultivoId = 'cultivo-prueba-a';

  assertError(
    validarCatalogo(pasoConCicloAjeno),
    CODIGOS_ERROR_CATALOGO.CICLO_NO_PERTENECE_AL_CULTIVO,
    'estrategias[0].pasos[1].cicloId'
  );
});

test('exige exactamente dos pasos por estrategia', () => {
  const unPaso = crearCatalogoValido();
  unPaso.estrategias[0].pasos = [unPaso.estrategias[0].pasos[0]];

  assertError(
    validarCatalogo(unPaso),
    CODIGOS_ERROR_CATALOGO.PASOS_INVALIDOS,
    'estrategias[0].pasos'
  );

  const tresPasos = crearCatalogoValido();
  tresPasos.estrategias[0].pasos.push({
    orden: 3,
    cultivoId: 'cultivo-prueba-a',
    cicloId: 'ciclo-prueba-a2',
  });

  assertError(
    validarCatalogo(tresPasos),
    CODIGOS_ERROR_CATALOGO.PASOS_INVALIDOS,
    'estrategias[0].pasos'
  );
});

test('exige que los pasos estén ordenados como 1 y 2', () => {
  const pasosInvertidos = crearCatalogoValido();
  pasosInvertidos.estrategias[0].pasos.reverse();

  assertError(
    validarCatalogo(pasosInvertidos),
    CODIGOS_ERROR_CATALOGO.ORDEN_INVALIDO,
    'estrategias[0].pasos[0].orden'
  );

  const ordenDuplicado = crearCatalogoValido();
  ordenDuplicado.estrategias[0].pasos[1].orden = 1;

  assertError(
    validarCatalogo(ordenDuplicado),
    CODIGOS_ERROR_CATALOGO.ORDEN_INVALIDO,
    'estrategias[0].pasos[1].orden'
  );
});

test('rechaza parámetros incompletos y conserva cero como valor válido', () => {
  const valido = validarCatalogo(crearCatalogoValido());

  assert.equal(valido.valido, true);
  assert.equal(crearCatalogoValido().estrategias[0].parametrosPuntuacion[0].valor, 0);

  const sinValor = crearCatalogoValido();
  delete sinValor.estrategias[0].parametrosPuntuacion[0].valor;

  assertError(
    validarCatalogo(sinValor),
    CODIGOS_ERROR_CATALOGO.PARAMETRO_INCOMPLETO,
    'estrategias[0].parametrosPuntuacion[0].valor'
  );

  const sinUnidad = crearCatalogoValido();
  delete sinUnidad.estrategias[0].parametrosPuntuacion[0].unidad;

  assertError(
    validarCatalogo(sinUnidad),
    CODIGOS_ERROR_CATALOGO.PARAMETRO_INCOMPLETO,
    'estrategias[0].parametrosPuntuacion[0].unidad'
  );

  const sinFuente = crearCatalogoValido();
  delete sinFuente.estrategias[0].parametrosPuntuacion[0].fuenteId;

  assertError(
    validarCatalogo(sinFuente),
    CODIGOS_ERROR_CATALOGO.PARAMETRO_INCOMPLETO,
    'estrategias[0].parametrosPuntuacion[0].fuenteId'
  );
});

test('rechaza valores de parámetro no finitos', () => {
  const conNaN = crearCatalogoValido();
  conNaN.estrategias[0].parametrosPuntuacion[0].valor = Number.NaN;

  assertError(
    validarCatalogo(conNaN),
    CODIGOS_ERROR_CATALOGO.VALOR_NO_FINITO,
    'estrategias[0].parametrosPuntuacion[0].valor'
  );

  const conInfinito = crearCatalogoValido();
  conInfinito.estrategias[0].parametrosPuntuacion[0].valor = Number.POSITIVE_INFINITY;

  assertError(
    validarCatalogo(conInfinito),
    CODIGOS_ERROR_CATALOGO.VALOR_NO_FINITO,
    'estrategias[0].parametrosPuntuacion[0].valor'
  );

  const conTexto = crearCatalogoValido();
  conTexto.estrategias[0].parametrosPuntuacion[0].valor = '0';

  assertError(
    validarCatalogo(conTexto),
    CODIGOS_ERROR_CATALOGO.VALOR_NO_FINITO,
    'estrategias[0].parametrosPuntuacion[0].valor'
  );
});

test('rechaza meses fuera del rango 1 a 12 en ciclos y opciones de finca', () => {
  const inicioFueraDeRango = crearCatalogoValido();
  inicioFueraDeRango.cultivos[0].ciclos[0].ventanaSiembra.inicioMes = 0;

  assertError(
    validarCatalogo(inicioFueraDeRango),
    CODIGOS_ERROR_CATALOGO.MES_FUERA_DE_RANGO,
    'cultivos[0].ciclos[0].ventanaSiembra.inicioMes'
  );

  const finFueraDeRango = crearCatalogoValido();
  finFueraDeRango.cultivos[0].ciclos[0].ventanaSiembra.finMes = 13;

  assertError(
    validarCatalogo(finFueraDeRango),
    CODIGOS_ERROR_CATALOGO.MES_FUERA_DE_RANGO,
    'cultivos[0].ciclos[0].ventanaSiembra.finMes'
  );

  const mesNoEntero = crearCatalogoValido();
  mesNoEntero.cultivos[0].ciclos[0].ventanaSiembra.inicioMes = 1.5;

  assertError(
    validarCatalogo(mesNoEntero),
    CODIGOS_ERROR_CATALOGO.MES_FUERA_DE_RANGO,
    'cultivos[0].ciclos[0].ventanaSiembra.inicioMes'
  );

  const opcionMesFueraDeRango = crearCatalogoValido();
  opcionMesFueraDeRango.opcionesFinca.mesInicio[0].valor = 13;

  assertError(
    validarCatalogo(opcionMesFueraDeRango),
    CODIGOS_ERROR_CATALOGO.MES_FUERA_DE_RANGO,
    'opcionesFinca.mesInicio[0].valor'
  );
});

test('rechaza entradas malformadas sin lanzar excepciones', () => {
  const casos = [
    null,
    [],
    'catalogo',
    {},
    { version: 'catalogo-prueba-0.0.0' },
    { version: 'catalogo-prueba-0.0.0', fuentes: 'no', cultivos: [], estrategias: [] },
    { version: 'catalogo-prueba-0.0.0', fuentes: [], cultivos: null, estrategias: [] },
    { version: 'catalogo-prueba-0.0.0', fuentes: [], cultivos: [], estrategias: {} },
  ];

  for (const caso of casos) {
    const resultado = validarCatalogo(caso);

    assert.equal(resultado.valido, false);
    assert.ok(resultado.errores.length > 0);
  }

  const raizInvalida = validarCatalogo(null);
  assertError(raizInvalida, CODIGOS_ERROR_CATALOGO.ESTRUCTURA_INVALIDA, 'catalogo');

  const fuenteNula = crearCatalogoValido();
  fuenteNula.fuentes.push(null);
  assertError(validarCatalogo(fuenteNula), CODIGOS_ERROR_CATALOGO.TIPO_INVALIDO, 'fuentes[1]');

  const cultivoNulo = crearCatalogoValido();
  cultivoNulo.cultivos.push(null);
  assertError(validarCatalogo(cultivoNulo), CODIGOS_ERROR_CATALOGO.TIPO_INVALIDO, 'cultivos[2]');

  const estrategiaNula = crearCatalogoValido();
  estrategiaNula.estrategias.push(null);
  assertError(
    validarCatalogo(estrategiaNula),
    CODIGOS_ERROR_CATALOGO.TIPO_INVALIDO,
    'estrategias[1]'
  );

  const ciclosNulos = crearCatalogoValido();
  ciclosNulos.cultivos[0].ciclos = null;
  assertError(
    validarCatalogo(ciclosNulos),
    CODIGOS_ERROR_CATALOGO.CAMPO_REQUERIDO,
    'cultivos[0].ciclos'
  );

  const pasosNulos = crearCatalogoValido();
  pasosNulos.estrategias[0].pasos = null;
  assertError(
    validarCatalogo(pasosNulos),
    CODIGOS_ERROR_CATALOGO.CAMPO_REQUERIDO,
    'estrategias[0].pasos'
  );

  const opcionesInvalidas = crearCatalogoValido();
  opcionesInvalidas.opcionesFinca = [];
  assertError(
    validarCatalogo(opcionesInvalidas),
    CODIGOS_ERROR_CATALOGO.TIPO_INVALIDO,
    'opcionesFinca'
  );
});

test('no impone que los dos cultivos de una estrategia sean diferentes', () => {
  const catalogo = crearCatalogoValido();
  catalogo.estrategias[0].pasos = [
    { orden: 1, cultivoId: 'cultivo-prueba-a', cicloId: 'ciclo-prueba-a1' },
    { orden: 2, cultivoId: 'cultivo-prueba-a', cicloId: 'ciclo-prueba-a2' },
  ];

  const resultado = validarCatalogo(catalogo);

  assert.equal(resultado.valido, true);
  assert.deepEqual(resultado.errores, []);
});

test('no exige campos propuestos ni añade vocabulario no aprobado', () => {
  const catalogo = crearCatalogoValido();
  delete catalogo.generado;
  delete catalogo.localidadPiloto;
  delete catalogo.opcionesFinca;
  delete catalogo.fuentes[0].tipo;
  delete catalogo.fuentes[0].url;
  delete catalogo.fuentes[0].fecha;
  delete catalogo.fuentes[0].notas;
  delete catalogo.estrategias[0].descripcion;
  catalogo.cultivos[0].ciclos[0].duracionMeses = null;

  const resultado = validarCatalogo(catalogo);

  assert.equal(resultado.valido, true);
  assert.deepEqual(resultado.errores, []);
});

test('valida opcionesFinca solo con las reglas confirmadas', () => {
  const opcionPropuesta = crearCatalogoValido();
  opcionPropuesta.opcionesFinca.suelo.push({
    valor: 'arenoso',
    etiqueta: 'Arenoso (prueba)',
  });

  assert.equal(validarCatalogo(opcionPropuesta).valido, true);

  const prioridadNoAprobada = crearCatalogoValido();
  prioridadNoAprobada.opcionesFinca.prioridad.push({
    valor: 'otra-prioridad',
    etiqueta: 'Otra prioridad (prueba)',
  });

  assertError(
    validarCatalogo(prioridadNoAprobada),
    CODIGOS_ERROR_CATALOGO.OPCION_INVALIDA,
    'opcionesFinca.prioridad[3].valor'
  );

  const opcionDuplicada = crearCatalogoValido();
  opcionDuplicada.opcionesFinca.suelo.push({
    valor: 'desconocido',
    etiqueta: 'Duplicado (prueba)',
  });

  assertError(
    validarCatalogo(opcionDuplicada),
    CODIGOS_ERROR_CATALOGO.VALOR_DUPLICADO,
    'opcionesFinca.suelo[1].valor'
  );

  const etiquetaVacia = crearCatalogoValido();
  etiquetaVacia.opcionesFinca.suelo[0].etiqueta = '';

  assertError(
    validarCatalogo(etiquetaVacia),
    CODIGOS_ERROR_CATALOGO.OPCION_INVALIDA,
    'opcionesFinca.suelo[0].etiqueta'
  );
});

test('inmutabilidad: no modifica la entrada, incluso si está congelada', () => {
  const catalogo = crearCatalogoValido();
  const copia = structuredClone(catalogo);

  congelarProfundo(catalogo);

  const resultado = validarCatalogo(catalogo);

  assert.equal(resultado.valido, true);
  assert.deepEqual(catalogo, copia);

  resultado.errores.push({ codigo: 'PRUEBA', campo: 'prueba', motivo: 'mutación de salida' });

  assert.deepEqual(catalogo, copia);
});
