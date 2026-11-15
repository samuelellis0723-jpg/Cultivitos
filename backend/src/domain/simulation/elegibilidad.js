/**
 * FIELDVERSE / Cultivitos
 * Módulo de dominio: Elegibilidad de estrategias agrícolas (D5).
 *
 * Función pura y determinista que evalúa la elegibilidad agronómica y procedimental
 * de las estrategias del catálogo según las condiciones de la finca, conforme a los
 * contratos del proyecto (D5, D10, D17–D21).
 *
 * Principios:
 * 1. Uso estricto de D18 para la compatibilidad temporal de la secuencia.
 * 2. Un resultado `compatible` en D18 no implica elegibilidad automática:
 *    deben satisfacerse la completitud del segundo ciclo y los requisitos de evidencia D19/D20.
 * 3. Respeto al nivel de evidencia (D19):
 *    - directa_local: elegible plenamente.
 *    - extrapolada: elegible para cálculo pero genera advertencia geográfica.
 *    - parcial: datos provisionales; no es elegible para recomendación ni puntuación.
 *    - pendiente: datos faltantes o no comprobados; no es elegible para recomendación ni puntuación.
 * 4. Incertidumbre en opciones de finca:
 *    - 'desconocido' en suelo, drenaje o riego representa incertidumbre y NO descarta la estrategia.
 * 5. Separación estricta entre motivos:
 *    - motivosDescarte: restricciones agronómicas o de recomendación incumplidas.
 *    - motivosNoCalculable: datos faltantes o evidencia insuficiente para calcular puntuaciones.
 * 6. Pureza, inmutabilidad y determinismo.
 */

import {
  evaluarCompatibilidadTemporal,
  ESTADOS_COMPATIBILIDAD,
  CODIGOS_MOTIVO_TEMPORAL,
} from './compatibilidad-temporal.js';

export const NIVELES_EVIDENCIA = Object.freeze({
  DIRECTA_LOCAL: 'directa_local',
  EXTRAPOLADA: 'extrapolada',
  PARCIAL: 'parcial',
  PENDIENTE: 'pendiente',
});

const PESO_EVIDENCIA = Object.freeze({
  directa_local: 4,
  extrapolada: 3,
  parcial: 2,
  pendiente: 1,
});

export const CODIGOS_ERROR_ELEGIBILIDAD = Object.freeze({
  ENTRADA_INVALIDA: 'ENTRADA_INVALIDA',
  CATALOGO_INVALIDO: 'CATALOGO_INVALIDO',
  FINCA_INVALIDA: 'FINCA_INVALIDA',
  ESTRATEGIA_NO_ENCONTRADA: 'ESTRATEGIA_NO_ENCONTRADA',
  CICLO_NO_ENCONTRADO: 'CICLO_NO_ENCONTRADO',
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

function esObjetoPlano(valor) {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

function validarEnteroRango(valor, min, max, nombre) {
  if (typeof valor !== 'number' || !Number.isInteger(valor) || valor < min || valor > max) {
    throw new ErrorEntradaDominio(
      CODIGOS_ERROR_ELEGIBILIDAD.RANGO_INVALIDO,
      `${nombre} debe ser un entero entre ${min} y ${max}. Valor recibido: ${valor}`
    );
  }
}

/**
 * Resuelve el nivel de evidencia compuesto aplicando la regla del eslabón más débil (D19).
 * directa_local > extrapolada > parcial > pendiente
 *
 * @param {string} nivel1
 * @param {string} nivel2
 * @returns {string}
 */
export function resolverNivelEvidenciaCompuesto(nivel1, nivel2) {
  const p1 = PESO_EVIDENCIA[nivel1] ?? 0;
  const p2 = PESO_EVIDENCIA[nivel2] ?? 0;
  return p1 <= p2 ? (nivel1 ?? NIVELES_EVIDENCIA.PENDIENTE) : (nivel2 ?? NIVELES_EVIDENCIA.PENDIENTE);
}

/**
 * Construye un mapa plano de ciclos a partir del catálogo para búsquedas rápidas.
 * Clave: `${cultivoId}:${cicloId}`
 */
function indexarCiclos(catalogo) {
  const indice = new Map();
  if (Array.isArray(catalogo.cultivos)) {
    for (const cultivo of catalogo.cultivos) {
      if (esObjetoPlano(cultivo) && Array.isArray(cultivo.ciclos)) {
        for (const ciclo of cultivo.ciclos) {
          if (esObjetoPlano(ciclo) && ciclo.id) {
            indice.set(`${cultivo.id}:${ciclo.id}`, { cultivo, ciclo });
          }
        }
      }
    }
  }
  return indice;
}

/**
 * Valida la estructura mínima de entrada de la finca.
 */
function validarFinca(finca) {
  if (!esObjetoPlano(finca)) {
    throw new ErrorEntradaDominio(
      CODIGOS_ERROR_ELEGIBILIDAD.FINCA_INVALIDA,
      'El objeto finca debe ser un objeto plano.'
    );
  }
  validarEnteroRango(finca.mesInicio, 1, 12, 'finca.mesInicio');
}

/**
 * Valida la estructura básica del catálogo.
 */
function validarCatalogo(catalogo) {
  if (!esObjetoPlano(catalogo)) {
    throw new ErrorEntradaDominio(
      CODIGOS_ERROR_ELEGIBILIDAD.CATALOGO_INVALIDO,
      'El catálogo debe ser un objeto plano.'
    );
  }
  if (!Array.isArray(catalogo.cultivos)) {
    throw new ErrorEntradaDominio(
      CODIGOS_ERROR_ELEGIBILIDAD.CATALOGO_INVALIDO,
      'catalogo.cultivos debe ser un array.'
    );
  }
  if (!Array.isArray(catalogo.estrategias)) {
    throw new ErrorEntradaDominio(
      CODIGOS_ERROR_ELEGIBILIDAD.CATALOGO_INVALIDO,
      'catalogo.estrategias debe ser un array.'
    );
  }
}

/**
 * Evalúa una estrategia específica contra la finca y el catálogo (D5).
 *
 * @param {Object} entrada
 * @param {Object} entrada.estrategia - Objeto de estrategia a evaluar.
 * @param {Object} entrada.catalogo - Catálogo agronómico completo.
 * @param {Object} entrada.finca - Objeto finca con mesInicio y opciones.
 * @param {number} [entrada.bufferDias=0] - Días de amortiguamiento agronómico (v0.2 fija 0).
 * @param {Map} [entrada.indiceCiclos] - Mapa preindexado opcional de ciclos.
 * @returns {Object} Resultado inmutable de evaluación de elegibilidad de la estrategia.
 */
export function evaluarElegibilidadEstrategia({
  estrategia,
  catalogo,
  finca,
  bufferDias = 0,
  indiceCiclos = null,
}) {
  if (!esObjetoPlano(estrategia)) {
    throw new ErrorEntradaDominio(
      CODIGOS_ERROR_ELEGIBILIDAD.ENTRADA_INVALIDA,
      'estrategia debe ser un objeto plano.'
    );
  }
  validarCatalogo(catalogo);
  validarFinca(finca);

  if (!Array.isArray(estrategia.pasos) || estrategia.pasos.length !== 2) {
    throw new ErrorEntradaDominio(
      CODIGOS_ERROR_ELEGIBILIDAD.ENTRADA_INVALIDA,
      `La estrategia "${estrategia.id ?? 'desconocida'}" debe contener exactamente dos pasos ordenados.`
    );
  }

  const indice = indiceCiclos ?? indexarCiclos(catalogo);

  const paso1 = estrategia.pasos[0];
  const paso2 = estrategia.pasos[1];

  const refCiclo1 = indice.get(`${paso1.cultivoId}:${paso1.cicloId}`);
  if (!refCiclo1) {
    throw new ErrorEntradaDominio(
      CODIGOS_ERROR_ELEGIBILIDAD.CICLO_NO_ENCONTRADO,
      `No se encontró el ciclo "${paso1.cicloId}" del cultivo "${paso1.cultivoId}" en el catálogo (paso 1).`
    );
  }

  const refCiclo2 = indice.get(`${paso2.cultivoId}:${paso2.cicloId}`);
  if (!refCiclo2) {
    throw new ErrorEntradaDominio(
      CODIGOS_ERROR_ELEGIBILIDAD.CICLO_NO_ENCONTRADO,
      `No se encontró el ciclo "${paso2.cicloId}" del cultivo "${paso2.cultivoId}" en el catálogo (paso 2).`
    );
  }

  const ciclo1 = refCiclo1.ciclo;
  const ciclo2 = refCiclo2.ciclo;

  const motivosDescarte = [];
  const motivosNoCalculable = [];
  const advertencias = [];
  const datosFaltantes = [];

  // Paso 1: Evaluación de compatibilidad temporal mediante D18
  const resTemporal = evaluarCompatibilidadTemporal({
    ciclo1,
    ciclo2,
    mesInicio: finca.mesInicio,
    bufferDias,
  });

  // Paso 2: Análisis de resultados temporales D18
  if (resTemporal.estado === ESTADOS_COMPATIBILIDAD.INCOMPATIBLE) {
    motivosDescarte.push(resTemporal.motivo);
  } else if (resTemporal.estado === ESTADOS_COMPATIBILIDAD.INDETERMINADA) {
    motivosDescarte.push(
      `Incertidumbre temporal: no se garantiza la viabilidad de la rotación entre ${paso1.cultivoId} y ${paso2.cultivoId} debido a la amplitud de los rangos o la granularidad mensual (D18).`
    );
  } else if (resTemporal.estado === ESTADOS_COMPATIBILIDAD.NO_EVALUABLE) {
    if (resTemporal.codigoMotivo === CODIGOS_MOTIVO_TEMPORAL.CRUCE_DE_ANO_NO_SOPORTADO) {
      motivosDescarte.push(
        'Estrategia no elegible: la secuencia temporal cruza el límite anual, lo cual excede las capacidades calendáricas en v0.2.'
      );
      motivosNoCalculable.push(resTemporal.motivo);
    } else {
      motivosDescarte.push(
        'Estrategia no elegible: faltan datos esenciales de ventana o duración para evaluar la transición temporal.'
      );
      motivosNoCalculable.push(resTemporal.motivo);
      resTemporal.datosFaltantes.forEach((campo) => datosFaltantes.push(campo));
    }
  }

  // Paso 3: Completitud de la estrategia agrícola (duración del ciclo 2)
  // D18 no exige ciclo2.duracionDias para evaluar la transición, pero la estrategia completa la requiere para ser calculable.
  if (ciclo2.duracionDias === null || ciclo2.duracionDias === undefined) {
    datosFaltantes.push('ciclo2.duracionDias');
    motivosNoCalculable.push(
      `El ciclo "${ciclo2.id}" carece de duracionDias, impidiendo evaluar la estrategia completa y calcular sus puntuaciones.`
    );
    if (!motivosDescarte.some((m) => m.includes('duración'))) {
      motivosDescarte.push(
        'Estrategia no elegible: datos de duración incompletos en el segundo cultivo para la estrategia completa.'
      );
    }
  }

  // Paso 4: Niveles de evidencia D19 / D20
  const nivelCiclo1 = ciclo1.nivelEvidencia ?? NIVELES_EVIDENCIA.PENDIENTE;
  const nivelCiclo2 = ciclo2.nivelEvidencia ?? NIVELES_EVIDENCIA.PENDIENTE;
  const nivelEstrategia = resolverNivelEvidenciaCompuesto(nivelCiclo1, nivelCiclo2);

  // Evidencia 'pendiente'
  if (nivelCiclo1 === NIVELES_EVIDENCIA.PENDIENTE || nivelCiclo2 === NIVELES_EVIDENCIA.PENDIENTE) {
    motivosNoCalculable.push(
      'La estrategia contiene ciclos con nivel de evidencia "pendiente" sin respaldo documental confirmado; no puede ser recomendada ni puntuada (D19).'
    );
    if (!motivosDescarte.some((m) => m.includes('pendiente'))) {
      motivosDescarte.push('Estrategia no elegible: evidencia agronómica pendiente de verificación.');
    }
  }

  // Evidencia 'parcial'
  if (nivelCiclo1 === NIVELES_EVIDENCIA.PARCIAL || nivelCiclo2 === NIVELES_EVIDENCIA.PARCIAL) {
    motivosNoCalculable.push(
      'La estrategia contiene ciclos con nivel de evidencia "parcial" (mención indirecta, snippet o índice); los datos provisionales no pueden producir recomendaciones definitivas (D19/D20).'
    );
    if (!motivosDescarte.some((m) => m.includes('parcial'))) {
      motivosDescarte.push('Estrategia no elegible: evidencia agronómica parcial no confirmada.');
    }
  }

  // Evidencia 'extrapolada'
  if (nivelEstrategia === NIVELES_EVIDENCIA.EXTRAPOLADA) {
    const lugaresExtrapolados = [];
    if (nivelCiclo1 === NIVELES_EVIDENCIA.EXTRAPOLADA) {
      lugaresExtrapolados.push(ciclo1.localidad || ciclo1.alcanceGeografico || 'otra región');
    }
    if (nivelCiclo2 === NIVELES_EVIDENCIA.EXTRAPOLADA) {
      lugaresExtrapolados.push(ciclo2.localidad || ciclo2.alcanceGeografico || 'otra región');
    }
    advertencias.push(
      `Evidencia extrapolada desde [${[...new Set(lugaresExtrapolados)].join(', ')}]; no validada para Liberia (D19).`
    );
  }

  // Paso 5: Manejo de características de finca
  // Las opciones 'desconocido' en suelo, drenaje y riego representan incertidumbre aprobada por contrato y NO descartan.
  // No se inventan reglas de textura o riego no aprobadas (D3 está pendiente).

  // Paso 6: Determinación final de elegibilidad
  // Una estrategia es elegible si y solo si:
  // - La compatibilidad temporal es compatible.
  // - No tiene motivos de descarte.
  // - No tiene motivos de no calculable (datos faltantes o evidencia parcial/pendiente).
  const elegible =
    resTemporal.estado === ESTADOS_COMPATIBILIDAD.COMPATIBLE &&
    motivosDescarte.length === 0 &&
    motivosNoCalculable.length === 0 &&
    datosFaltantes.length === 0;

  // Si no es elegible, asegurar que motivosDescarte contenga al menos un motivo descriptivo
  if (!elegible && motivosDescarte.length === 0) {
    motivosDescarte.push('Estrategia no elegible según los criterios del contrato de dominio D5.');
  }

  const detallesPasos = Object.freeze([
    Object.freeze({
      orden: 1,
      cultivoId: paso1.cultivoId,
      cicloId: paso1.cicloId,
      nivelEvidencia: nivelCiclo1,
      alcanceGeografico: ciclo1.alcanceGeografico ?? null,
      localidad: ciclo1.localidad ?? null,
    }),
    Object.freeze({
      orden: 2,
      cultivoId: paso2.cultivoId,
      cicloId: paso2.cicloId,
      nivelEvidencia: nivelCiclo2,
      alcanceGeografico: ciclo2.alcanceGeografico ?? null,
      localidad: ciclo2.localidad ?? null,
    }),
  ]);

  return Object.freeze({
    id: estrategia.id,
    estrategiaId: estrategia.id,
    nombre: estrategia.nombre ?? estrategia.id,
    elegible,
    motivosDescarte: Object.freeze(elegible ? [] : [...new Set(motivosDescarte)]),
    motivosNoCalculable: Object.freeze([...new Set(motivosNoCalculable)]),
    advertencias: Object.freeze([...new Set(advertencias)]),
    datosFaltantes: Object.freeze([...new Set(datosFaltantes)]),
    nivelEvidencia: nivelEstrategia,
    compatibilidadTemporal: resTemporal,
    pasos: detallesPasos,
  });
}

/**
 * Evalúa la elegibilidad de todas las estrategias del catálogo según las condiciones de finca (D5).
 *
 * @param {Object} entrada
 * @param {Object} entrada.catalogo - Catálogo agronómico completo.
 * @param {Object} entrada.finca - Objeto finca con mesInicio y opciones.
 * @param {Array} [entrada.estrategias] - Lista opcional de estrategias a evaluar (default: catalogo.estrategias).
 * @param {number} [entrada.bufferDias=0] - Días de buffer entre ciclos.
 * @returns {Object} Resultado estructurado e inmutable de la evaluación de elegibilidad.
 */
export function evaluarElegibilidad({
  catalogo,
  finca,
  estrategias = null,
  bufferDias = 0,
}) {
  validarCatalogo(catalogo);
  validarFinca(finca);

  const listaEstrategias = estrategias ?? catalogo.estrategias;
  if (!Array.isArray(listaEstrategias)) {
    throw new ErrorEntradaDominio(
      CODIGOS_ERROR_ELEGIBILIDAD.ENTRADA_INVALIDA,
      'estrategias debe ser un array.'
    );
  }

  const indiceCiclos = indexarCiclos(catalogo);
  const evaluadas = [];
  const descartes = [];
  const todosDatosFaltantes = new Set();

  for (const estrategia of listaEstrategias) {
    const evaluacion = evaluarElegibilidadEstrategia({
      estrategia,
      catalogo,
      finca,
      bufferDias,
      indiceCiclos,
    });

    evaluadas.push(evaluacion);

    if (!evaluacion.elegible) {
      descartes.push(
        Object.freeze({
          estrategiaId: evaluacion.estrategiaId,
          motivos: evaluacion.motivosDescarte,
        })
      );
    }

    evaluacion.datosFaltantes.forEach((d) => todosDatosFaltantes.add(d));
  }

  const elegibles = evaluadas.filter((e) => e.elegible);
  const descartadas = evaluadas.filter((e) => !e.elegible);
  const noCalculables = evaluadas.filter((e) => e.motivosNoCalculable.length > 0);

  return Object.freeze({
    estrategias: Object.freeze(evaluadas),
    descartes: Object.freeze(descartes),
    datosFaltantes: Object.freeze([...todosDatosFaltantes]),
    resumen: Object.freeze({
      total: evaluadas.length,
      elegibles: elegibles.length,
      descartadas: descartadas.length,
      noCalculables: noCalculables.length,
    }),
  });
}

