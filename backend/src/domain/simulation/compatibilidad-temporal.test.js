import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ESTADOS_COMPATIBILIDAD,
  CODIGOS_MOTIVO_TEMPORAL,
  CODIGOS_ERROR_COMPATIBILIDAD,
  ErrorEntradaDominio,
  primerDiaMes,
  ultimoDiaMes,
  evaluarCompatibilidadTemporal,
} from './compatibilidad-temporal.js';

// Helpers para crear datos sintéticos de prueba conformes al vocabulario del contrato D19
function crearCicloSintetico({
  id = 'ciclo-sintetico-1',
  cultivoId = 'cultivo-sintetico-a',
  ventanaSiembra = { inicioMes: 5, finMes: 6 },
  duracionDias = { min: 60, max: 75 },
  alcanceGeografico = 'local',
  localidad = 'Liberia',
  nivelEvidencia = 'directa_local',
  fuenteId = 'fuente-sintetica-1',
} = {}) {
  return {
    id,
    cultivoId,
    ventanaSiembra,
    duracionDias,
    alcanceGeografico,
    localidad,
    nivelEvidencia,
    fuenteId,
  };
}

test('Funciones calendáricas auxiliares: primerDiaMes y ultimoDiaMes en año común de 365 días', () => {
  // Enero
  assert.equal(primerDiaMes(1), 1);
  assert.equal(ultimoDiaMes(1), 31);

  // Febrero (28 días en año estándar)
  assert.equal(primerDiaMes(2), 32);
  assert.equal(ultimoDiaMes(2), 59);

  // Marzo
  assert.equal(primerDiaMes(3), 60);
  assert.equal(ultimoDiaMes(3), 90);

  // Diciembre
  assert.equal(primerDiaMes(12), 335);
  assert.equal(ultimoDiaMes(12), 365);
});

test('Estado compatible: transición holgada entre ciclo 1 y ciclo 2', () => {
  // Ciclo 1 en Mayo (mesInicio = 5). Días 121 a 151.
  // Duración: 60 a 70 días.
  // finMin = 121 + 60 - 1 = 180 (29 de junio)
  // finMax = 151 + 70 - 1 = 220 (8 de agosto)
  // Ciclo 2 con ventana en Septiembre-Octubre ([9, 10]). inicio2Min = 244 (1 de septiembre).
  // finMax + buffer (220 + 0) < inicio2Min (244) -> COMPATIBLE
  const ciclo1 = crearCicloSintetico({
    ventanaSiembra: { inicioMes: 5, finMes: 6 },
    duracionDias: { min: 60, max: 70 },
  });
  const ciclo2 = crearCicloSintetico({
    ventanaSiembra: { inicioMes: 9, finMes: 10 },
    duracionDias: { min: 70, max: 80 },
  });

  const resultado = evaluarCompatibilidadTemporal({
    ciclo1,
    ciclo2,
    mesInicio: 5,
    bufferDias: 0,
  });

  assert.equal(resultado.estado, ESTADOS_COMPATIBILIDAD.COMPATIBLE);
  assert.equal(resultado.viable, true);
  assert.equal(resultado.codigoMotivo, CODIGOS_MOTIVO_TEMPORAL.TRANSICION_COMPATIBLE);
  assert.equal(resultado.datosFaltantes.length, 0);
  assert.ok(resultado.fechas !== null);
  assert.equal(resultado.fechas.ciclo1.finMax, 220);
  assert.equal(resultado.fechas.ciclo2.inicioMin, 244);
});

test('Condición de frontera exacta para compatible: finMax + buffer === inicio2Min - 1', () => {
  // Mes 5 (mayo, día 121 a 151).
  // Queremos que finMax sea exactamente 243 (último día de agosto).
  // 151 + duracionMax - 1 = 243 => duracionMax = 243 - 150 = 93 días.
  // Ciclo 2 empieza en mes 9 (1 de septiembre, día 244).
  // finMax (243) + 0 < inicio2Min (244) -> COMPATIBLE (margen exacto de 1 día, no se tocan).
  const ciclo1 = crearCicloSintetico({
    ventanaSiembra: { inicioMes: 5, finMes: 6 },
    duracionDias: { min: 50, max: 93 },
  });
  const ciclo2 = crearCicloSintetico({
    ventanaSiembra: { inicioMes: 9, finMes: 10 },
  });

  const resultado = evaluarCompatibilidadTemporal({
    ciclo1,
    ciclo2,
    mesInicio: 5,
    bufferDias: 0,
  });

  assert.equal(resultado.estado, ESTADOS_COMPATIBILIDAD.COMPATIBLE);
  assert.equal(resultado.viable, true);
  assert.equal(resultado.fechas.ciclo1.finMax, 243);
  assert.equal(resultado.fechas.ciclo2.inicioMin, 244);
  assert.ok(resultado.fechas.ciclo1.finMax < resultado.fechas.ciclo2.inicioMin);
});

test('Restricción de simultaneidad: el ciclo 2 nunca comienza el mismo día en que termina el ciclo 1', () => {
  // Si finMax es 244 y el ciclo 2 empieza el día 244, NO es compatible
  const ciclo1 = crearCicloSintetico({
    ventanaSiembra: { inicioMes: 5, finMes: 6 },
    duracionDias: { min: 50, max: 94 }, // 151 + 94 - 1 = 244
  });
  const ciclo2 = crearCicloSintetico({
    ventanaSiembra: { inicioMes: 9, finMes: 10 }, // inicio2Min = 244
  });

  const resultado = evaluarCompatibilidadTemporal({
    ciclo1,
    ciclo2,
    mesInicio: 5,
    bufferDias: 0,
  });

  // Al coincidir el día 244, no se garantiza que ciclo 2 empiece después (podría coincidir en el mismo día)
  assert.notEqual(resultado.estado, ESTADOS_COMPATIBILIDAD.COMPATIBLE);
  assert.equal(resultado.viable, false);
});

test('Estado incompatible confirmado por solapamiento: finMin + buffer >= inicio2Max', () => {
  // Ciclo 1 en Junio (mes 6, días 152 a 181).
  // Duración: 120 a 130 días.
  // finMin = 152 + 120 - 1 = 271 (28 de septiembre).
  // Ciclo 2 con ventana en Julio-Agosto ([7, 8]).
  // inicio2Max = ultimoDiaMes(8) = 243 (31 de agosto).
  // finMin (271) >= inicio2Max (243) -> INCOMPATIBLE
  const ciclo1 = crearCicloSintetico({
    ventanaSiembra: { inicioMes: 6, finMes: 6 },
    duracionDias: { min: 120, max: 130 },
  });
  const ciclo2 = crearCicloSintetico({
    ventanaSiembra: { inicioMes: 7, finMes: 8 },
  });

  const resultado = evaluarCompatibilidadTemporal({
    ciclo1,
    ciclo2,
    mesInicio: 6,
    bufferDias: 0,
  });

  assert.equal(resultado.estado, ESTADOS_COMPATIBILIDAD.INCOMPATIBLE);
  assert.equal(resultado.viable, false);
  assert.equal(resultado.codigoMotivo, CODIGOS_MOTIVO_TEMPORAL.SOLAPAMIENTO_TEMPORAL);
});

test('Condición de frontera exacta para incompatible: finMin + buffer === inicio2Max', () => {
  // Ciclo 1 en mes 5 (días 121 a 151).
  // inicio1Min = 121.
  // Si duracionMin = 123 días: finMin = 121 + 123 - 1 = 243.
  // Ciclo 2 en mes 7-8 ([7, 8]): inicio2Max = 243 (31 de agosto).
  // finMin (243) + 0 >= inicio2Max (243) -> INCOMPATIBLE
  const ciclo1 = crearCicloSintetico({
    ventanaSiembra: { inicioMes: 5, finMes: 6 },
    duracionDias: { min: 123, max: 130 },
  });
  const ciclo2 = crearCicloSintetico({
    ventanaSiembra: { inicioMes: 7, finMes: 8 },
  });

  const resultado = evaluarCompatibilidadTemporal({
    ciclo1,
    ciclo2,
    mesInicio: 5,
    bufferDias: 0,
  });

  assert.equal(resultado.estado, ESTADOS_COMPATIBILIDAD.INCOMPATIBLE);
  assert.equal(resultado.viable, false);
});

test('Estado incompatible por mesInicio fuera de la ventana del ciclo 1 (D21)', () => {
  const ciclo1 = crearCicloSintetico({
    ventanaSiembra: { inicioMes: 5, finMes: 6 }, // Mayo a Junio
    duracionDias: { min: 60, max: 70 },
  });
  const ciclo2 = crearCicloSintetico({
    ventanaSiembra: { inicioMes: 9, finMes: 10 },
  });

  // Se intenta iniciar en Julio (mes 7), fuera de [5, 6]
  const resultado = evaluarCompatibilidadTemporal({
    ciclo1,
    ciclo2,
    mesInicio: 7,
  });

  assert.equal(resultado.estado, ESTADOS_COMPATIBILIDAD.INCOMPATIBLE);
  assert.equal(resultado.viable, false);
  assert.equal(resultado.codigoMotivo, CODIGOS_MOTIVO_TEMPORAL.MES_INICIO_FUERA_DE_VENTANA);
  assert.ok(resultado.motivo.includes('mes de inicio'));
  assert.equal(resultado.fechas, null);
});

test('Estado indeterminada por solapamiento parcial e incertidumbre de fechas', () => {
  // Ciclo 1 en Junio (mes 6), duración 115 a 135 días.
  // finMin = 152 + 115 - 1 = 266 (23 de septiembre).
  // finMax = 181 + 135 - 1 = 315 (11 de noviembre).
  // Ciclo 2 con ventana en Septiembre-Octubre ([9, 10]).
  // inicio2Min = 244 (1 de sep), inicio2Max = 304 (31 de oct).
  // finMin (266) < inicio2Max (304), pero finMax (315) >= inicio2Min (244) -> INDETERMINADA
  const ciclo1 = crearCicloSintetico({
    ventanaSiembra: { inicioMes: 6, finMes: 6 },
    duracionDias: { min: 115, max: 135 },
  });
  const ciclo2 = crearCicloSintetico({
    ventanaSiembra: { inicioMes: 9, finMes: 10 },
  });

  const resultado = evaluarCompatibilidadTemporal({
    ciclo1,
    ciclo2,
    mesInicio: 6,
    bufferDias: 0,
  });

  assert.equal(resultado.estado, ESTADOS_COMPATIBILIDAD.INDETERMINADA);
  assert.equal(resultado.viable, false);
  assert.equal(resultado.codigoMotivo, CODIGOS_MOTIVO_TEMPORAL.INCERTIDUMBRE_TEMPORAL);
});

test('Estado no_evaluable por datos esenciales de transición faltantes', () => {
  // Caso A: ciclo1 sin duración
  const ciclo1SinDuracion = crearCicloSintetico({
    ventanaSiembra: { inicioMes: 5, finMes: 6 },
    duracionDias: null,
  });
  const ciclo2Valido = crearCicloSintetico({
    ventanaSiembra: { inicioMes: 9, finMes: 10 },
  });

  const resA = evaluarCompatibilidadTemporal({
    ciclo1: ciclo1SinDuracion,
    ciclo2: ciclo2Valido,
    mesInicio: 5,
  });

  assert.equal(resA.estado, ESTADOS_COMPATIBILIDAD.NO_EVALUABLE);
  assert.equal(resA.viable, false);
  assert.equal(resA.codigoMotivo, CODIGOS_MOTIVO_TEMPORAL.DATOS_ESENCIALES_FALTANTES);
  assert.deepEqual(resA.datosFaltantes, ['ciclo1.duracionDias']);

  // Caso B: ciclo2 sin ventanaSiembra
  const ciclo1Valido = crearCicloSintetico();
  const ciclo2SinVentana = crearCicloSintetico({ ventanaSiembra: null });

  const resB = evaluarCompatibilidadTemporal({
    ciclo1: ciclo1Valido,
    ciclo2: ciclo2SinVentana,
    mesInicio: 5,
  });

  assert.equal(resB.estado, ESTADOS_COMPATIBILIDAD.NO_EVALUABLE);
  assert.deepEqual(resB.datosFaltantes, ['ciclo2.ventanaSiembra']);

  // Caso C: ciclo1 sin ventanaSiembra
  const ciclo1SinVentana = crearCicloSintetico({ ventanaSiembra: null });
  const resC = evaluarCompatibilidadTemporal({
    ciclo1: ciclo1SinVentana,
    ciclo2: ciclo2Valido,
    mesInicio: 5,
  });

  assert.equal(resC.estado, ESTADOS_COMPATIBILIDAD.NO_EVALUABLE);
  assert.deepEqual(resC.datosFaltantes, ['ciclo1.ventanaSiembra']);

  // Caso D: múltiples datos faltantes simultáneos
  const ciclo1Vacio = crearCicloSintetico({ ventanaSiembra: null, duracionDias: null });
  const resD = evaluarCompatibilidadTemporal({
    ciclo1: ciclo1Vacio,
    ciclo2: ciclo2SinVentana,
    mesInicio: 5,
  });
  assert.equal(resD.estado, ESTADOS_COMPATIBILIDAD.NO_EVALUABLE);
  assert.deepEqual(resD.datosFaltantes, [
    'ciclo1.ventanaSiembra',
    'ciclo1.duracionDias',
    'ciclo2.ventanaSiembra',
  ]);
});

test('Independencia de la transición: evalúa con éxito aunque ciclo2.duracionDias sea null', () => {
  // La duración del ciclo 2 no interviene en la transición hacia él.
  const ciclo1 = crearCicloSintetico({
    ventanaSiembra: { inicioMes: 5, finMes: 6 },
    duracionDias: { min: 60, max: 70 },
  });
  const ciclo2SinDuracion = crearCicloSintetico({
    ventanaSiembra: { inicioMes: 9, finMes: 10 },
    duracionDias: null, // No afecta la transición D18
  });

  const resultado = evaluarCompatibilidadTemporal({
    ciclo1,
    ciclo2: ciclo2SinDuracion,
    mesInicio: 5,
  });

  assert.equal(resultado.estado, ESTADOS_COMPATIBILIDAD.COMPATIBLE);
  assert.equal(resultado.viable, true);
  assert.equal(resultado.datosFaltantes.length, 0);
});

test('Cruce de año: se reporta como no_evaluable con código explicativo, no como incompatible agronómico', () => {
  // Ciclo 1 en Noviembre (mes 11).
  // Ciclo 2 en Enero-Febrero del año siguiente ([1, 2]).
  // En v0.2 las capacidades del motor no soportan cruce de año.
  const ciclo1 = crearCicloSintetico({
    ventanaSiembra: { inicioMes: 11, finMes: 11 },
    duracionDias: { min: 60, max: 70 },
  });
  const ciclo2 = crearCicloSintetico({
    ventanaSiembra: { inicioMes: 1, finMes: 2 },
  });

  const resultado = evaluarCompatibilidadTemporal({
    ciclo1,
    ciclo2,
    mesInicio: 11,
  });

  assert.equal(resultado.estado, ESTADOS_COMPATIBILIDAD.NO_EVALUABLE);
  assert.equal(resultado.viable, false);
  assert.equal(resultado.codigoMotivo, CODIGOS_MOTIVO_TEMPORAL.CRUCE_DE_ANO_NO_SOPORTADO);
  assert.ok(resultado.motivo.includes('cruza el límite del año calendario'));
});

test('Cruce de año parcial: finMin <= 365 y finMax > 365 con segundo ciclo posterior se reporta como no_evaluable', () => {
  // Ciclo 1 en Octubre (mes 10: días 274 a 304).
  // Duración: 60 a 90 días.
  // finMin = 274 + 60 - 1 = 333 (29 de noviembre, dentro del año).
  // finMax = 304 + 90 - 1 = 393 (28 de enero del año siguiente, excede 365).
  // Ciclo 2 con ventana en Noviembre-Diciembre ([11, 12]). ventana2.inicioMes (11) >= mesInicio (10).
  // Aunque finMin <= 365 y ventana2.inicioMes >= mesInicio, finMax > 365 excede el horizonte anual.
  const ciclo1 = crearCicloSintetico({
    ventanaSiembra: { inicioMes: 10, finMes: 10 },
    duracionDias: { min: 60, max: 90 },
  });
  const ciclo2 = crearCicloSintetico({
    ventanaSiembra: { inicioMes: 11, finMes: 12 },
  });

  const resultado = evaluarCompatibilidadTemporal({
    ciclo1,
    ciclo2,
    mesInicio: 10,
  });

  assert.equal(resultado.estado, ESTADOS_COMPATIBILIDAD.NO_EVALUABLE);
  assert.equal(resultado.viable, false);
  assert.equal(resultado.codigoMotivo, CODIGOS_MOTIVO_TEMPORAL.CRUCE_DE_ANO_NO_SOPORTADO);
  assert.equal(resultado.fechas, null);
});

test('Límite calendárico anual: finMax === 365 es evaluable mientras que finMax === 366 es no_evaluable', () => {
  // mesInicio = 10 (Octubre, días 274 a 304)
  // Caso 1: finMax exacto en 365 (31 de diciembre, último día del año)
  // 304 + max - 1 = 365 => max = 62 días
  const c1Dentro = crearCicloSintetico({
    ventanaSiembra: { inicioMes: 10, finMes: 10 },
    duracionDias: { min: 40, max: 62 },
  });
  const c2 = crearCicloSintetico({
    ventanaSiembra: { inicioMes: 11, finMes: 12 },
  });

  const resDentro = evaluarCompatibilidadTemporal({
    ciclo1: c1Dentro,
    ciclo2: c2,
    mesInicio: 10,
  });
  // No cruza el año: finMax === 365 está contenido en el horizonte anual
  assert.notEqual(resDentro.codigoMotivo, CODIGOS_MOTIVO_TEMPORAL.CRUCE_DE_ANO_NO_SOPORTADO);
  assert.ok(resDentro.fechas !== null);
  assert.equal(resDentro.fechas.ciclo1.finMax, 365);

  // Caso 2: finMax en 366 (1 de enero del año siguiente, cruce parcial por 1 día)
  // 304 + max - 1 = 366 => max = 63 días
  const c1Fuera = crearCicloSintetico({
    ventanaSiembra: { inicioMes: 10, finMes: 10 },
    duracionDias: { min: 40, max: 63 },
  });

  const resFuera = evaluarCompatibilidadTemporal({
    ciclo1: c1Fuera,
    ciclo2: c2,
    mesInicio: 10,
  });
  assert.equal(resFuera.estado, ESTADOS_COMPATIBILIDAD.NO_EVALUABLE);
  assert.equal(resFuera.viable, false);
  assert.equal(resFuera.codigoMotivo, CODIGOS_MOTIVO_TEMPORAL.CRUCE_DE_ANO_NO_SOPORTADO);
  assert.equal(resFuera.fechas, null);
});

test('Vocabulario de nivelEvidencia D19: valores permitidos (directa_local, extrapolada, parcial, pendiente)', () => {
  const nivelesPermitidos = [
    { nivelEvidencia: 'directa_local', alcanceGeografico: 'local', localidad: 'Liberia', fuenteId: 'f1' },
    { nivelEvidencia: 'extrapolada', alcanceGeografico: 'cantonal', localidad: 'Cañas', fuenteId: 'f2' },
    { nivelEvidencia: 'parcial', alcanceGeografico: 'regional', localidad: 'Chorotega', fuenteId: 'f3' },
    { nivelEvidencia: 'pendiente', alcanceGeografico: null, localidad: null, fuenteId: null },
  ];

  for (const config of nivelesPermitidos) {
    const c1 = crearCicloSintetico({
      ...config,
      ventanaSiembra: { inicioMes: 5, finMes: 6 },
      duracionDias: { min: 60, max: 70 },
    });
    const c2 = crearCicloSintetico({
      ...config,
      ventanaSiembra: { inicioMes: 9, finMes: 10 },
    });

    const resultado = evaluarCompatibilidadTemporal({
      ciclo1: c1,
      ciclo2: c2,
      mesInicio: 5,
    });

    // La pureza de D18 calcula la física temporal sin ser afectada por nivelEvidencia
    assert.equal(resultado.estado, ESTADOS_COMPATIBILIDAD.COMPATIBLE);
    assert.equal(resultado.viable, true);
  }
});

test('Efecto de bufferDias en la evaluación temporal', () => {
  // Con bufferDias = 0 es compatible:
  // finMax = 220, inicio2Min = 225. 220 + 0 < 225 -> COMPATIBLE.
  // Pero con bufferDias = 10: 220 + 10 = 230 >= 225 -> deja de ser compatible (pasa a INDETERMINADA).
  const ciclo1 = crearCicloSintetico({
    ventanaSiembra: { inicioMes: 5, finMes: 5 }, // 121 a 151
    duracionDias: { min: 50, max: 70 },          // finMin: 170, finMax: 220
  });
  const ciclo2 = crearCicloSintetico({
    ventanaSiembra: { inicioMes: 8, finMes: 9 }, // inicio2Min: 213, inicio2Max: 274
  });

  // Con buffer = 0: finMax (220) < inicio2Min (213)? No, 220 > 213.
  // Ajustemos para probar exactamente el paso de compatible a indeterminada:
  // finMax = 240, inicio2Min = 244 (mes 9, 1 de sept).
  // Con buffer = 0: 240 < 244 -> COMPATIBLE
  // Con buffer = 5: 240 + 5 = 245 >= 244 -> INDETERMINADA
  const c1 = crearCicloSintetico({
    ventanaSiembra: { inicioMes: 5, finMes: 5 }, // finMax = 151 + 90 - 1 = 240
    duracionDias: { min: 60, max: 90 },
  });
  const c2 = crearCicloSintetico({
    ventanaSiembra: { inicioMes: 9, finMes: 10 }, // inicio2Min = 244
  });

  const resBufferCero = evaluarCompatibilidadTemporal({
    ciclo1: c1,
    ciclo2: c2,
    mesInicio: 5,
    bufferDias: 0,
  });
  assert.equal(resBufferCero.estado, ESTADOS_COMPATIBILIDAD.COMPATIBLE);

  const resBufferCinco = evaluarCompatibilidadTemporal({
    ciclo1: c1,
    ciclo2: c2,
    mesInicio: 5,
    bufferDias: 5,
  });
  assert.equal(resBufferCinco.estado, ESTADOS_COMPATIBILIDAD.INDETERMINADA);
});

test('Acepta mesInicio a través de finca.mesInicio', () => {
  const ciclo1 = crearCicloSintetico();
  const ciclo2 = crearCicloSintetico({ ventanaSiembra: { inicioMes: 9, finMes: 10 } });

  const resultado = evaluarCompatibilidadTemporal({
    ciclo1,
    ciclo2,
    finca: { mesInicio: 5 },
  });

  assert.equal(resultado.estado, ESTADOS_COMPATIBILIDAD.COMPATIBLE);
});

test('Validación de esquema y rechazo con ErrorEntradaDominio ante entradas inválidas', () => {
  const cicloValido = crearCicloSintetico();

  // Entrada no es objeto plano
  assert.throws(
    () => evaluarCompatibilidadTemporal(null),
    (err) => err instanceof ErrorEntradaDominio && err.codigo === CODIGOS_ERROR_COMPATIBILIDAD.ENTRADA_INVALIDA
  );

  // mesInicio fuera de rango 1..12
  assert.throws(
    () => evaluarCompatibilidadTemporal({ ciclo1: cicloValido, ciclo2: cicloValido, mesInicio: 13 }),
    (err) => err instanceof ErrorEntradaDominio && err.codigo === CODIGOS_ERROR_COMPATIBILIDAD.RANGO_INVALIDO
  );
  assert.throws(
    () => evaluarCompatibilidadTemporal({ ciclo1: cicloValido, ciclo2: cicloValido, mesInicio: 0 }),
    (err) => err instanceof ErrorEntradaDominio && err.codigo === CODIGOS_ERROR_COMPATIBILIDAD.RANGO_INVALIDO
  );

  // bufferDias negativo
  assert.throws(
    () => evaluarCompatibilidadTemporal({ ciclo1: cicloValido, ciclo2: cicloValido, mesInicio: 5, bufferDias: -1 }),
    (err) => err instanceof ErrorEntradaDominio && err.codigo === CODIGOS_ERROR_COMPATIBILIDAD.RANGO_INVALIDO
  );

  // duracionDias inválido (min > max)
  const cicloDuracionInvertida = crearCicloSintetico({ duracionDias: { min: 90, max: 60 } });
  assert.throws(
    () => evaluarCompatibilidadTemporal({ ciclo1: cicloDuracionInvertida, ciclo2: cicloValido, mesInicio: 5 }),
    (err) => err instanceof ErrorEntradaDominio && err.codigo === CODIGOS_ERROR_COMPATIBILIDAD.RANGO_INVALIDO
  );

  // duracionDias con cero o negativos
  const cicloDuracionCero = crearCicloSintetico({ duracionDias: { min: 0, max: 60 } });
  assert.throws(
    () => evaluarCompatibilidadTemporal({ ciclo1: cicloDuracionCero, ciclo2: cicloValido, mesInicio: 5 }),
    (err) => err instanceof ErrorEntradaDominio && err.codigo === CODIGOS_ERROR_COMPATIBILIDAD.RANGO_INVALIDO
  );

  // ventanaSiembra con inicioMes > finMes en v0.2
  const cicloVentanaInvertida = crearCicloSintetico({ ventanaSiembra: { inicioMes: 8, finMes: 6 } });
  assert.throws(
    () => evaluarCompatibilidadTemporal({ ciclo1: cicloVentanaInvertida, ciclo2: cicloValido, mesInicio: 5 }),
    (err) => err instanceof ErrorEntradaDominio && err.codigo === CODIGOS_ERROR_COMPATIBILIDAD.RANGO_INVALIDO
  );
});

test('Inmutabilidad y determinismo del módulo', () => {
  const ciclo1 = Object.freeze(crearCicloSintetico());
  const ciclo2 = Object.freeze(crearCicloSintetico({ ventanaSiembra: { inicioMes: 9, finMes: 10 } }));
  const entrada = Object.freeze({
    ciclo1,
    ciclo2,
    mesInicio: 5,
    bufferDias: 0,
  });

  const res1 = evaluarCompatibilidadTemporal(entrada);
  const res2 = evaluarCompatibilidadTemporal(entrada);

  // El objeto retornado y sus subobjetos están congelados
  assert.ok(Object.isFrozen(res1));
  assert.ok(Object.isFrozen(res1.datosFaltantes));
  assert.ok(Object.isFrozen(res1.fechas));
  assert.ok(Object.isFrozen(res1.fechas.ciclo1));
  assert.ok(Object.isFrozen(res1.fechas.ciclo2));

  // Determinismo estricto
  assert.deepEqual(res1, res2);
});
