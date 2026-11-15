import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CODIGOS_ERROR_CLIMA,
  UNIDADES_REQUERIDAS,
  VARIABLES_REQUERIDAS,
  validarClima,
} from './validar-clima.js';

const FECHAS = Object.freeze([
  '20200101',
  '20200102',
  '20200103',
  '20200104',
  '20200105',
  '20200106',
  '20200107',
  '20200108',
  '20200109',
  '20200110',
]);

const PERIODO = Object.freeze({ inicio: '20200101', fin: '20200110' });
const FECHA_CONSULTA = '2026-11-14T12:00:00Z';
const COORDENADAS = Object.freeze({ latitude: 9.93, longitude: -84.09 });

const VALORES = Object.freeze({
  precipitacion: [0, 1.2, null, 0, 5.5, 0, 0, 2.3, null, 0],
  temperaturaMedia: [22.1, 22.5, 23.0, 22.8, 23.4, 24.0, 23.7, 22.9, 22.4, 21.8],
  temperaturaMaxima: [29.5, 30.1, 31.0, null, 30.8, 31.5, 30.2, 29.9, 30.4, 29.7],
});

function construirSerie(valores) {
  return FECHAS.map((fecha, indice) => ({ fecha, valor: valores[indice] }));
}

function construirCobertura(valores) {
  const faltantes = FECHAS.filter((_, indice) => valores[indice] === null);
  const diasEsperados = valores.length;
  const diasPresentes = diasEsperados - faltantes.length;

  return {
    diasEsperados,
    diasPresentes,
    porcentaje: Number(((diasPresentes / diasEsperados) * 100).toFixed(2)),
    faltantes,
  };
}

function construirVariable(nombre, valores) {
  return {
    unidad: UNIDADES_REQUERIDAS[nombre],
    fechas: { ...PERIODO },
    procedencia: 'live',
    fechaConsulta: FECHA_CONSULTA,
    fuenteId: 'fuente-demo',
    cobertura: construirCobertura(valores),
    serie: construirSerie(valores),
  };
}

function crearClimaValido() {
  const variables = {};

  for (const nombre of VARIABLES_REQUERIDAS) {
    variables[nombre] = construirVariable(nombre, VALORES[nombre]);
  }

  return {
    coordenadas: {
      solicitadas: { ...COORDENADAS },
      devueltas: { ...COORDENADAS },
    },
    periodo: { ...PERIODO },
    resolucion: 'diaria',
    variables,
    fuentes: [
      {
        id: 'fuente-demo',
        proveedor: 'Proveedor ficticio de pruebas',
        urlConsulta: 'https://example.test/clima',
        coordenadasSolicitadas: { ...COORDENADAS },
        coordenadasDevueltas: { ...COORDENADAS },
        periodo: { ...PERIODO },
        unidades: { ...UNIDADES_REQUERIDAS },
        fechaConsulta: FECHA_CONSULTA,
        cobertura: { porcentaje: 90 },
        origen: 'live',
        antiguedad: null,
      },
    ],
  };
}

function buscarError(resultado, codigo, campoParcial, variable) {
  return resultado.errores.find(
    (error) =>
      error.codigo === codigo &&
      error.campo.includes(campoParcial) &&
      (variable === undefined || error.variable === variable)
  );
}

function assertError(resultado, codigo, campoParcial, variable) {
  const error = buscarError(resultado, codigo, campoParcial, variable);

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

test('acepta un clima completo y coherente', () => {
  const resultado = validarClima(crearClimaValido());

  assert.equal(resultado.valido, true);
  assert.deepEqual(resultado.errores, []);
});

test('distingue cero de dato ausente y valida los null de la serie', () => {
  const clima = crearClimaValido();
  const precipitacion = clima.variables.precipitacion;

  assert.equal(precipitacion.serie[0].valor, 0);
  assert.equal(precipitacion.serie[2].valor, null);
  assert.equal(precipitacion.cobertura.diasPresentes, 8);
  assert.deepEqual([...precipitacion.cobertura.faltantes].sort(), ['20200103', '20200109']);
  assert.equal(validarClima(clima).valido, true);
});

test('rechaza unidades incorrectas en variables y fuentes', () => {
  const climaVariable = crearClimaValido();
  climaVariable.variables.precipitacion.unidad = 'cm';

  const resultadoVariable = validarClima(climaVariable);

  assert.equal(resultadoVariable.valido, false);
  assertError(
    resultadoVariable,
    CODIGOS_ERROR_CLIMA.UNIDAD_INVALIDA,
    'variables.precipitacion.unidad',
    'precipitacion'
  );

  const climaFuente = crearClimaValido();
  climaFuente.fuentes[0].unidades.temperaturaMaxima = 'K';

  const resultadoFuente = validarClima(climaFuente);

  assertError(
    resultadoFuente,
    CODIGOS_ERROR_CLIMA.UNIDAD_INVALIDA,
    'fuentes[0].unidades.temperaturaMaxima',
    'temperaturaMaxima'
  );
});

test('rechaza fechas inexistentes y periodos con orden inválido', () => {
  const climaFecha = crearClimaValido();
  climaFecha.periodo.inicio = '20200230';

  const resultadoFecha = validarClima(climaFecha);
  const errorFecha = assertError(resultadoFecha, CODIGOS_ERROR_CLIMA.FECHA_INVALIDA, 'periodo.inicio');

  assert.equal(errorFecha.variable, null);

  const climaPeriodo = crearClimaValido();
  climaPeriodo.periodo = { inicio: '20200110', fin: '20200101' };

  const resultadoPeriodo = validarClima(climaPeriodo);

  assertError(resultadoPeriodo, CODIGOS_ERROR_CLIMA.PERIODO_INVALIDO, 'periodo');

  const climaSerie = crearClimaValido();
  climaSerie.variables.temperaturaMedia.serie[3].fecha = '20200132';

  const resultadoSerie = validarClima(climaSerie);

  assertError(
    resultadoSerie,
    CODIGOS_ERROR_CLIMA.FECHA_INVALIDA,
    'variables.temperaturaMedia.serie[3].fecha',
    'temperaturaMedia'
  );
});

test('rechaza coberturas incoherentes con los días y porcentajes declarados', () => {
  const climaDias = crearClimaValido();
  climaDias.variables.precipitacion.cobertura.diasPresentes = 7;

  const resultadoDias = validarClima(climaDias);

  assertError(
    resultadoDias,
    CODIGOS_ERROR_CLIMA.COBERTURA_INCONSISTENTE,
    'variables.precipitacion.cobertura.diasPresentes',
    'precipitacion'
  );

  const climaPorcentaje = crearClimaValido();
  climaPorcentaje.variables.temperaturaMedia.cobertura.porcentaje = 99;

  const resultadoPorcentaje = validarClima(climaPorcentaje);

  assertError(
    resultadoPorcentaje,
    CODIGOS_ERROR_CLIMA.COBERTURA_INCONSISTENTE,
    'variables.temperaturaMedia.cobertura.porcentaje',
    'temperaturaMedia'
  );

  const climaEsperados = crearClimaValido();
  climaEsperados.variables.temperaturaMaxima.cobertura.diasEsperados = 9;

  const resultadoEsperados = validarClima(climaEsperados);

  assertError(
    resultadoEsperados,
    CODIGOS_ERROR_CLIMA.COBERTURA_INCONSISTENTE,
    'variables.temperaturaMaxima.cobertura.diasEsperados',
    'temperaturaMaxima'
  );
});

test('rechaza faltantes que no coinciden con las fechas null de la serie', () => {
  const clima = crearClimaValido();
  clima.variables.precipitacion.cobertura.faltantes = ['20200103'];

  const resultado = validarClima(clima);

  assertError(
    resultado,
    CODIGOS_ERROR_CLIMA.FALTANTES_INCONSISTENTES,
    'variables.precipitacion.cobertura.faltantes',
    'precipitacion'
  );
});

test('rechaza series incompletas que no cubren el periodo declarado', () => {
  const clima = crearClimaValido();
  clima.variables.precipitacion.serie.pop();

  const resultado = validarClima(clima);

  assertError(
    resultado,
    CODIGOS_ERROR_CLIMA.SERIE_NO_CUBRE_PERIODO,
    'variables.precipitacion.serie',
    'precipitacion'
  );
  assertError(
    resultado,
    CODIGOS_ERROR_CLIMA.SERIE_INCOMPLETA,
    'variables.precipitacion.serie',
    'precipitacion'
  );
});

test('rechaza huecos, desorden y fechas duplicadas en la serie', () => {
  const climaHueco = crearClimaValido();
  climaHueco.variables.precipitacion.serie.splice(4, 1);

  const resultadoHueco = validarClima(climaHueco);

  assertError(
    resultadoHueco,
    CODIGOS_ERROR_CLIMA.SERIE_NO_CONTINUA,
    'variables.precipitacion.serie[4].fecha',
    'precipitacion'
  );

  const climaDesorden = crearClimaValido();
  const serieDesorden = climaDesorden.variables.temperaturaMedia.serie;
  [serieDesorden[0], serieDesorden[1]] = [serieDesorden[1], serieDesorden[0]];

  const resultadoDesorden = validarClima(climaDesorden);

  assertError(
    resultadoDesorden,
    CODIGOS_ERROR_CLIMA.SERIE_DESORDENADA,
    'variables.temperaturaMedia.serie[1].fecha',
    'temperaturaMedia'
  );

  const climaDuplicado = crearClimaValido();
  climaDuplicado.variables.precipitacion.serie[1].fecha =
    climaDuplicado.variables.precipitacion.serie[0].fecha;

  const resultadoDuplicado = validarClima(climaDuplicado);

  assertError(
    resultadoDuplicado,
    CODIGOS_ERROR_CLIMA.FECHA_DUPLICADA,
    'variables.precipitacion.serie[1].fecha',
    'precipitacion'
  );
});

test('rechaza marcadores de ausencia y valores no finitos', () => {
  const climaCentinela = crearClimaValido();
  climaCentinela.variables.precipitacion.serie[1].valor = -999;

  const resultadoCentinela = validarClima(climaCentinela);

  assertError(
    resultadoCentinela,
    CODIGOS_ERROR_CLIMA.VALOR_CENTINELA,
    'variables.precipitacion.serie[1].valor',
    'precipitacion'
  );

  const climaNoFinito = crearClimaValido();
  climaNoFinito.variables.temperaturaMaxima.serie[0].valor = Number.NaN;

  const resultadoNoFinito = validarClima(climaNoFinito);

  assertError(
    resultadoNoFinito,
    CODIGOS_ERROR_CLIMA.VALOR_INVALIDO,
    'variables.temperaturaMaxima.serie[0].valor',
    'temperaturaMaxima'
  );

  const climaInfinito = crearClimaValido();
  climaInfinito.variables.temperaturaMedia.serie[2].valor = Number.POSITIVE_INFINITY;

  const resultadoInfinito = validarClima(climaInfinito);

  assertError(
    resultadoInfinito,
    CODIGOS_ERROR_CLIMA.VALOR_INVALIDO,
    'variables.temperaturaMedia.serie[2].valor',
    'temperaturaMedia'
  );

  const climaTexto = crearClimaValido();
  climaTexto.variables.temperaturaMedia.serie[2].valor = '22.8';

  const resultadoTexto = validarClima(climaTexto);

  assertError(
    resultadoTexto,
    CODIGOS_ERROR_CLIMA.VALOR_INVALIDO,
    'variables.temperaturaMedia.serie[2].valor',
    'temperaturaMedia'
  );
});

test('rechaza procedencias inválidas, inconsistencias y fuentes inexistentes', () => {
  const climaProcedencia = crearClimaValido();
  climaProcedencia.variables.precipitacion.procedencia = 'cache';

  const resultadoProcedencia = validarClima(climaProcedencia);

  assertError(
    resultadoProcedencia,
    CODIGOS_ERROR_CLIMA.PROCEDENCIA_INVALIDA,
    'variables.precipitacion.procedencia',
    'precipitacion'
  );

  const climaOrigen = crearClimaValido();
  climaOrigen.fuentes[0].origen = 'cache';

  const resultadoOrigen = validarClima(climaOrigen);

  assertError(resultadoOrigen, CODIGOS_ERROR_CLIMA.PROCEDENCIA_INVALIDA, 'fuentes[0].origen');

  const climaInconsistente = crearClimaValido();
  climaInconsistente.variables.temperaturaMedia.procedencia = 'backup';

  const resultadoInconsistente = validarClima(climaInconsistente);

  assertError(
    resultadoInconsistente,
    CODIGOS_ERROR_CLIMA.PROCEDENCIA_INCONSISTENTE,
    'variables.temperaturaMedia.procedencia',
    'temperaturaMedia'
  );

  const climaFuente = crearClimaValido();
  climaFuente.variables.precipitacion.fuenteId = 'fuente-inexistente';

  const resultadoFuente = validarClima(climaFuente);

  assertError(
    resultadoFuente,
    CODIGOS_ERROR_CLIMA.FUENTE_NO_ENCONTRADA,
    'variables.precipitacion.fuenteId',
    'precipitacion'
  );
});

test('exige antigüedad en fuentes backup y la acepta cuando está presente', () => {
  const climaSinAntiguedad = crearClimaValido();
  climaSinAntiguedad.fuentes[0].origen = 'backup';
  climaSinAntiguedad.fuentes[0].antiguedad = null;

  for (const nombre of VARIABLES_REQUERIDAS) {
    climaSinAntiguedad.variables[nombre].procedencia = 'backup';
  }

  const resultadoSinAntiguedad = validarClima(climaSinAntiguedad);

  assertError(
    resultadoSinAntiguedad,
    CODIGOS_ERROR_CLIMA.ANTIGUEDAD_REQUERIDA,
    'fuentes[0].antiguedad'
  );

  const climaConAntiguedad = crearClimaValido();
  climaConAntiguedad.fuentes[0].origen = 'backup';
  climaConAntiguedad.fuentes[0].antiguedad = '2 días';

  for (const nombre of VARIABLES_REQUERIDAS) {
    climaConAntiguedad.variables[nombre].procedencia = 'backup';
  }

  assert.equal(validarClima(climaConAntiguedad).valido, true);
});

test('rechaza estructuras incompletas, resolución y coordenadas inválidas', () => {
  assert.equal(
    validarClima(null).errores[0].codigo,
    CODIGOS_ERROR_CLIMA.ESTRUCTURA_INVALIDA
  );
  assert.equal(
    validarClima([]).errores[0].codigo,
    CODIGOS_ERROR_CLIMA.ESTRUCTURA_INVALIDA
  );

  const climaVariable = crearClimaValido();
  delete climaVariable.variables.precipitacion;

  const resultadoVariable = validarClima(climaVariable);

  assertError(
    resultadoVariable,
    CODIGOS_ERROR_CLIMA.CAMPO_REQUERIDO,
    'variables.precipitacion',
    'precipitacion'
  );

  const climaResolucion = crearClimaValido();
  climaResolucion.resolucion = 'horaria';

  const resultadoResolucion = validarClima(climaResolucion);

  assertError(resultadoResolucion, CODIGOS_ERROR_CLIMA.RESOLUCION_INVALIDA, 'resolucion');

  const climaCoordenadas = crearClimaValido();
  climaCoordenadas.coordenadas.solicitadas.latitude = 91;

  const resultadoCoordenadas = validarClima(climaCoordenadas);

  assertError(
    resultadoCoordenadas,
    CODIGOS_ERROR_CLIMA.COORDENADA_INVALIDA,
    'coordenadas.solicitadas.latitude'
  );
});

test('rechaza metadatos de fuente inválidos y periodos inconsistentes', () => {
  const climaUrl = crearClimaValido();
  climaUrl.fuentes[0].urlConsulta = 'https://usuario:secreto@example.test/clima';

  const resultadoUrl = validarClima(climaUrl);

  assertError(resultadoUrl, CODIGOS_ERROR_CLIMA.URL_INVALIDA, 'fuentes[0].urlConsulta');

  const climaConsulta = crearClimaValido();
  climaConsulta.variables.precipitacion.fechaConsulta = 'ayer';

  const resultadoConsulta = validarClima(climaConsulta);

  assertError(
    resultadoConsulta,
    CODIGOS_ERROR_CLIMA.FECHA_CONSULTA_INVALIDA,
    'variables.precipitacion.fechaConsulta',
    'precipitacion'
  );

  const climaCobertura = crearClimaValido();
  climaCobertura.fuentes[0].cobertura.porcentaje = 101;

  const resultadoCobertura = validarClima(climaCobertura);

  assertError(
    resultadoCobertura,
    CODIGOS_ERROR_CLIMA.COBERTURA_INVALIDA,
    'fuentes[0].cobertura.porcentaje'
  );

  const climaPeriodoVariable = crearClimaValido();
  climaPeriodoVariable.variables.temperaturaMedia.fechas.fin = '20200111';

  const resultadoPeriodoVariable = validarClima(climaPeriodoVariable);

  assertError(
    resultadoPeriodoVariable,
    CODIGOS_ERROR_CLIMA.PERIODO_INCONSISTENTE,
    'variables.temperaturaMedia.fechas',
    'temperaturaMedia'
  );

  const climaFaltantes = crearClimaValido();
  delete climaFaltantes.variables.precipitacion.cobertura.faltantes;

  const resultadoFaltantes = validarClima(climaFaltantes);

  assertError(
    resultadoFaltantes,
    CODIGOS_ERROR_CLIMA.CAMPO_REQUERIDO,
    'variables.precipitacion.cobertura.faltantes',
    'precipitacion'
  );
});

test('acepta una cobertura total de valores null sin convertirlos a cero', () => {
  const clima = crearClimaValido();
  const valoresNulos = [null, null, null, null, null, null, null, null, null, null];
  const variable = clima.variables.temperaturaMedia;

  variable.serie = construirSerie(valoresNulos);
  variable.cobertura = construirCobertura(valoresNulos);

  const resultado = validarClima(clima);

  assert.equal(resultado.valido, true);
  assert.equal(variable.cobertura.diasPresentes, 0);
  assert.equal(variable.cobertura.porcentaje, 0);
  assert.equal(variable.cobertura.faltantes.length, FECHAS.length);
  assert.ok(variable.serie.every((item) => item.valor === null));
});

test('no modifica el objeto de entrada', () => {
  const clima = crearClimaValido();
  const copia = structuredClone(clima);

  congelarProfundo(clima);

  const resultado = validarClima(clima);

  assert.equal(resultado.valido, true);
  assert.deepEqual(clima, copia);
});

test('es determinista para la misma entrada', () => {
  const clima = crearClimaValido();
  const primera = validarClima(clima);
  const segunda = validarClima(clima);

  assert.deepEqual(primera, segunda);
});
