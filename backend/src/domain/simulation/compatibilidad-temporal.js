/**
 * FIELDVERSE / Cultivitos
 * Módulo de dominio: Compatibilidad temporal de secuencias de cultivo (D18).
 *
 * Función pura y determinista que evalúa la transición agronómica entre dos ciclos
 * consecutivos en una estrategia, conforme al contrato propuesto Ciclo v0.2.
 *
 * Principios:
 * 1. Independencia de la transición: evalúa si el ciclo 1 puede dar paso al ciclo 2.
 *    La duración del ciclo 2 no interviene en la transición (se requiere para la
 *    estrategia completa, pero no para la transición entre ambos ciclos).
 * 2. Fechas inclusivas: fin = inicio + duracionDias - 1.
 * 3. Restricción de simultaneidad: el ciclo 2 nunca puede empezar el mismo día
 *    en que termina el ciclo 1 (inicio2 >= fin1 + 1 + bufferDias).
 * 4. Cuatro estados exactos: compatible, incompatible, indeterminada, no_evaluable.
 */

export const ESTADOS_COMPATIBILIDAD = Object.freeze({
  COMPATIBLE: 'compatible',
  INCOMPATIBLE: 'incompatible',
  INDETERMINADA: 'indeterminada',
  NO_EVALUABLE: 'no_evaluable',
});

export const CODIGOS_MOTIVO_TEMPORAL = Object.freeze({
  TRANSICION_COMPATIBLE: 'TRANSICION_COMPATIBLE',
  MES_INICIO_FUERA_DE_VENTANA: 'MES_INICIO_FUERA_DE_VENTANA',
  SOLAPAMIENTO_TEMPORAL: 'SOLAPAMIENTO_TEMPORAL',
  INCERTIDUMBRE_TEMPORAL: 'INCERTIDUMBRE_TEMPORAL',
  DATOS_ESENCIALES_FALTANTES: 'DATOS_ESENCIALES_FALTANTES',
  CRUCE_DE_ANO_NO_SOPORTADO: 'CRUCE_DE_ANO_NO_SOPORTADO',
});

export const CODIGOS_ERROR_COMPATIBILIDAD = Object.freeze({
  ENTRADA_INVALIDA: 'ENTRADA_INVALIDA',
  TIPO_INVALIDO: 'TIPO_INVALIDO',
  RANGO_INVALIDO: 'RANGO_INVALIDO',
});

export class ErrorEntradaDominio extends Error {
  constructor(codigo, mensaje) {
    super(mensaje);
    this.name = 'ErrorEntradaDominio';
    this.codigo = codigo;
  }
}

/**
 * Tabla de días por mes en un año común estándar (365 días).
 * Enero = mes 1, Diciembre = mes 12.
 */
const DIAS_POR_MES = Object.freeze([31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]);

/**
 * Retorna el día del año (1-365) correspondiente al primer día del mes dado.
 * @param {number} mes (1-12)
 * @returns {number}
 */
export function primerDiaMes(mes) {
  let acumulado = 1;
  for (let m = 1; m < mes; m += 1) {
    acumulado += DIAS_POR_MES[m - 1];
  }
  return acumulado;
}

/**
 * Retorna el día del año (1-365) correspondiente al último día del mes dado.
 * @param {number} mes (1-12)
 * @returns {number}
 */
export function ultimoDiaMes(mes) {
  let acumulado = 0;
  for (let m = 1; m <= mes; m += 1) {
    acumulado += DIAS_POR_MES[m - 1];
  }
  return acumulado;
}

function esObjetoPlano(valor) {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

function validarEnteroRango(valor, min, max, nombre) {
  if (typeof valor !== 'number' || !Number.isInteger(valor) || valor < min || valor > max) {
    throw new ErrorEntradaDominio(
      CODIGOS_ERROR_COMPATIBILIDAD.RANGO_INVALIDO,
      `${nombre} debe ser un entero entre ${min} y ${max}. Valor recibido: ${valor}`
    );
  }
}

function validarVentanaSiembraEsquema(ventana, nombre) {
  if (ventana === null || ventana === undefined) {
    return null;
  }
  if (!esObjetoPlano(ventana)) {
    throw new ErrorEntradaDominio(
      CODIGOS_ERROR_COMPATIBILIDAD.TIPO_INVALIDO,
      `${nombre} debe ser un objeto plano { inicioMes, finMes } o null.`
    );
  }
  validarEnteroRango(ventana.inicioMes, 1, 12, `${nombre}.inicioMes`);
  validarEnteroRango(ventana.finMes, 1, 12, `${nombre}.finMes`);
  if (ventana.inicioMes > ventana.finMes) {
    throw new ErrorEntradaDominio(
      CODIGOS_ERROR_COMPATIBILIDAD.RANGO_INVALIDO,
      `${nombre}.inicioMes (${ventana.inicioMes}) no puede ser mayor que finMes (${ventana.finMes}) en v0.2.`
    );
  }
  return { inicioMes: ventana.inicioMes, finMes: ventana.finMes };
}

function validarDuracionDiasEsquema(duracion, nombre) {
  if (duracion === null || duracion === undefined) {
    return null;
  }
  if (!esObjetoPlano(duracion)) {
    throw new ErrorEntradaDominio(
      CODIGOS_ERROR_COMPATIBILIDAD.TIPO_INVALIDO,
      `${nombre} debe ser un objeto plano { min, max } o null.`
    );
  }
  if (
    typeof duracion.min !== 'number' ||
    !Number.isInteger(duracion.min) ||
    duracion.min <= 0
  ) {
    throw new ErrorEntradaDominio(
      CODIGOS_ERROR_COMPATIBILIDAD.RANGO_INVALIDO,
      `${nombre}.min debe ser un entero positivo mayor que 0.`
    );
  }
  if (
    typeof duracion.max !== 'number' ||
    !Number.isInteger(duracion.max) ||
    duracion.max <= 0
  ) {
    throw new ErrorEntradaDominio(
      CODIGOS_ERROR_COMPATIBILIDAD.RANGO_INVALIDO,
      `${nombre}.max debe ser un entero positivo mayor que 0.`
    );
  }
  if (duracion.min > duracion.max) {
    throw new ErrorEntradaDominio(
      CODIGOS_ERROR_COMPATIBILIDAD.RANGO_INVALIDO,
      `${nombre}.min (${duracion.min}) no puede ser mayor que max (${duracion.max}).`
    );
  }
  return { min: duracion.min, max: duracion.max };
}

/**
 * Evalúa la compatibilidad temporal de transición entre dos ciclos ordenados (D18).
 *
 * @param {Object} entrada
 * @param {Object} entrada.ciclo1 - Ciclo del primer paso.
 * @param {Object} entrada.ciclo2 - Ciclo del segundo paso.
 * @param {number} [entrada.mesInicio] - Mes de inicio previsto para el ciclo 1 (1-12).
 * @param {Object} [entrada.finca] - Alternativamente, objeto finca con { mesInicio }.
 * @param {number} [entrada.bufferDias=0] - Días de colchón agronómico entre ciclos (D18 fija 0 en v0.2).
 * @returns {Object} Resultado estructurado e inmutable de la compatibilidad temporal.
 */
export function evaluarCompatibilidadTemporal(entrada) {
  if (!esObjetoPlano(entrada)) {
    throw new ErrorEntradaDominio(
      CODIGOS_ERROR_COMPATIBILIDAD.ENTRADA_INVALIDA,
      'La entrada debe ser un objeto plano.'
    );
  }

  if (!esObjetoPlano(entrada.ciclo1) || !esObjetoPlano(entrada.ciclo2)) {
    throw new ErrorEntradaDominio(
      CODIGOS_ERROR_COMPATIBILIDAD.TIPO_INVALIDO,
      'ciclo1 y ciclo2 deben ser objetos planos.'
    );
  }

  const mesInicio = entrada.mesInicio !== undefined ? entrada.mesInicio : entrada.finca?.mesInicio;
  validarEnteroRango(mesInicio, 1, 12, 'mesInicio');

  const bufferDias = entrada.bufferDias ?? 0;
  if (
    typeof bufferDias !== 'number' ||
    !Number.isInteger(bufferDias) ||
    bufferDias < 0
  ) {
    throw new ErrorEntradaDominio(
      CODIGOS_ERROR_COMPATIBILIDAD.RANGO_INVALIDO,
      `bufferDias debe ser un entero mayor o igual a 0. Recibido: ${bufferDias}`
    );
  }

  const ventana1 = validarVentanaSiembraEsquema(entrada.ciclo1.ventanaSiembra, 'ciclo1.ventanaSiembra');
  const duracion1 = validarDuracionDiasEsquema(entrada.ciclo1.duracionDias, 'ciclo1.duracionDias');
  const ventana2 = validarVentanaSiembraEsquema(entrada.ciclo2.ventanaSiembra, 'ciclo2.ventanaSiembra');
  // Se valida el esquema de duracion2 si viene presente, pero NO se exige para evaluar la transición D18.
  validarDuracionDiasEsquema(entrada.ciclo2.duracionDias, 'ciclo2.duracionDias');

  // Paso 1: Verificación de pertenencia de mesInicio a la ventana del ciclo 1 (D21)
  if (ventana1 !== null) {
    if (mesInicio < ventana1.inicioMes || mesInicio > ventana1.finMes) {
      return Object.freeze({
        estado: ESTADOS_COMPATIBILIDAD.INCOMPATIBLE,
        viable: false,
        motivo: `El mes de inicio provisto (${mesInicio}) se encuentra fuera de la ventana de siembra del primer ciclo [${ventana1.inicioMes}, ${ventana1.finMes}].`,
        codigoMotivo: CODIGOS_MOTIVO_TEMPORAL.MES_INICIO_FUERA_DE_VENTANA,
        datosFaltantes: Object.freeze([]),
        fechas: null,
      });
    }
  }

  // Paso 2: Identificación de datos esenciales faltantes para la transición
  // Nota: duracionDias del ciclo 2 no es requerida para evaluar la transición D18.
  const datosFaltantes = [];
  if (ventana1 === null) {
    datosFaltantes.push('ciclo1.ventanaSiembra');
  }
  if (duracion1 === null) {
    datosFaltantes.push('ciclo1.duracionDias');
  }
  if (ventana2 === null) {
    datosFaltantes.push('ciclo2.ventanaSiembra');
  }

  if (datosFaltantes.length > 0) {
    return Object.freeze({
      estado: ESTADOS_COMPATIBILIDAD.NO_EVALUABLE,
      viable: false,
      motivo: 'Faltan datos esenciales de ventana de siembra o duración para evaluar la transición temporal.',
      codigoMotivo: CODIGOS_MOTIVO_TEMPORAL.DATOS_ESENCIALES_FALTANTES,
      datosFaltantes: Object.freeze(datosFaltantes),
      fechas: null,
    });
  }

  // Paso 3: Cálculo temporal en días de año común (1–365) con fechas inclusivas
  const inicio1Min = primerDiaMes(mesInicio);
  const inicio1Max = ultimoDiaMes(mesInicio);
  const finMin = inicio1Min + duracion1.min - 1;
  const finMax = inicio1Max + duracion1.max - 1;

  const inicio2Min = primerDiaMes(ventana2.inicioMes);
  const inicio2Max = ultimoDiaMes(ventana2.finMes);

  // Paso 4: Detección de casos que exceden las capacidades calendáricas de v0.2 (cruce de año)
  // No se clasifica como incompatible agronómico, sino como no_evaluable con código explicativo.
  // En v0.2 el motor opera en un horizonte anual de 365 días; cualquier cruce total (finMin > 365)
  // o parcial (finMax > 365), así como ventanas del segundo ciclo anteriores al mes de inicio
  // (ventana2.inicioMes < mesInicio), exceden el soporte calendárico.
  if (finMax > 365 || ventana2.inicioMes < mesInicio) {
    return Object.freeze({
      estado: ESTADOS_COMPATIBILIDAD.NO_EVALUABLE,
      viable: false,
      motivo: 'La secuencia temporal cruza el límite del año calendario, lo cual excede las capacidades calendáricas del motor en la versión v0.2.',
      codigoMotivo: CODIGOS_MOTIVO_TEMPORAL.CRUCE_DE_ANO_NO_SOPORTADO,
      datosFaltantes: Object.freeze([]),
      fechas: null,
    });
  }

  const fechasMetadatos = Object.freeze({
    ciclo1: Object.freeze({
      inicioMin: inicio1Min,
      inicioMax: inicio1Max,
      finMin,
      finMax,
    }),
    ciclo2: Object.freeze({
      inicioMin: inicio2Min,
      inicioMax: inicio2Max,
    }),
    bufferDias,
  });

  // Paso 5: Fórmulas matemáticas D18
  // Condición de compatibilidad: incluso en el peor caso de retraso del ciclo 1,
  // el ciclo 1 termina antes del primer día posible de siembra del ciclo 2.
  if (finMax + bufferDias < inicio2Min) {
    return Object.freeze({
      estado: ESTADOS_COMPATIBILIDAD.COMPATIBLE,
      viable: true,
      motivo: null,
      codigoMotivo: CODIGOS_MOTIVO_TEMPORAL.TRANSICION_COMPATIBLE,
      datosFaltantes: Object.freeze([]),
      fechas: fechasMetadatos,
    });
  }

  // Condición de incompatibilidad: incluso en el escenario más temprano de cosecha del ciclo 1,
  // la fecha supera o iguala el último día de la ventana del ciclo 2.
  if (finMin + bufferDias >= inicio2Max) {
    return Object.freeze({
      estado: ESTADOS_COMPATIBILIDAD.INCOMPATIBLE,
      viable: false,
      motivo: `Solapamiento temporal confirmado: el primer ciclo termina (finMin=${finMin} con buffer=${bufferDias}) en o después del cierre de la ventana de siembra del segundo ciclo (inicio2Max=${inicio2Max}).`,
      codigoMotivo: CODIGOS_MOTIVO_TEMPORAL.SOLAPAMIENTO_TEMPORAL,
      datosFaltantes: Object.freeze([]),
      fechas: fechasMetadatos,
    });
  }

  // Si no se cumple ninguna de las dos condiciones cerradas, existe incertidumbre
  return Object.freeze({
    estado: ESTADOS_COMPATIBILIDAD.INDETERMINADA,
    viable: false,
    motivo: `Incertidumbre temporal: el intervalo de finalización del primer ciclo [${finMin}, ${finMax}] se solapa parcialmente con la ventana de siembra del segundo ciclo [${inicio2Min}, ${inicio2Max}].`,
    codigoMotivo: CODIGOS_MOTIVO_TEMPORAL.INCERTIDUMBRE_TEMPORAL,
    datosFaltantes: Object.freeze([]),
    fechas: fechasMetadatos,
  });
}

