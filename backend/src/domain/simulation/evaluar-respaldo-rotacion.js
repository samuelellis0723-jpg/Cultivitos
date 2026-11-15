/**
 * FIELDVERSE / Cultivitos
 * Evaluación experimental del respaldo documental de una secuencia D20.
 *
 * La estructura se valida con validarCatalogo; la compatibilidad y evidencia
 * de ciclos se obtienen de evaluarElegibilidadEstrategia (D5/D18/D19).
 * Este módulo solo reconoce una declaración interna de evidencia específica
 * para la secuencia; no comprueba su calidad científica ni habilita recomendaciones.
 */
import { validarCatalogo } from '../catalog/validar-catalogo.js';
import { evaluarElegibilidadEstrategia } from './elegibilidad.js';

export const NIVELES_EVIDENCIA_ROTACION = Object.freeze([
  'directa_local',
  'extrapolada',
  'parcial',
  'pendiente',
]);

export const CODIGOS_ERROR_RESPALDO_ROTACION = Object.freeze({
  ENTRADA_INVALIDA: 'ENTRADA_INVALIDA',
  CATALOGO_INVALIDO: 'CATALOGO_INVALIDO',
  ESTRATEGIA_NO_ENCONTRADA: 'ESTRATEGIA_NO_ENCONTRADA',
  EVIDENCIA_ROTACION_INVALIDA: 'EVIDENCIA_ROTACION_INVALIDA',
  FUENTE_NO_ENCONTRADA: 'FUENTE_NO_ENCONTRADA',
});

export class ErrorRespaldoRotacion extends Error {
  constructor(codigo, mensaje) {
    super(mensaje);
    this.name = 'ErrorRespaldoRotacion';
    this.codigo = codigo;
  }
}

function esObjetoPlano(valor) {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

function congelarPasos(pasos) {
  return Object.freeze(pasos.map((paso) => Object.freeze({
    orden: paso.orden,
    cultivoId: paso.cultivoId,
    cicloId: paso.cicloId,
  })));
}

function validarEvidenciaRotacion(evidencia, estrategia, fuentesPorId) {
  if (!esObjetoPlano(evidencia)) {
    throw new ErrorRespaldoRotacion(
      CODIGOS_ERROR_RESPALDO_ROTACION.EVIDENCIA_ROTACION_INVALIDA,
      'evidenciaRotacion debe ser un objeto plano.'
    );
  }
  if (!Array.isArray(evidencia.pasos) || evidencia.pasos.length !== estrategia.pasos.length) {
    throw new ErrorRespaldoRotacion(
      CODIGOS_ERROR_RESPALDO_ROTACION.EVIDENCIA_ROTACION_INVALIDA,
      'evidenciaRotacion.pasos debe identificar los pasos completos de la secuencia.'
    );
  }

  const coincideConSecuencia = evidencia.pasos.every((paso, indice) => {
    const pasoEstrategia = estrategia.pasos[indice];
    return esObjetoPlano(paso) &&
      paso.orden === pasoEstrategia.orden &&
      paso.cultivoId === pasoEstrategia.cultivoId &&
      paso.cicloId === pasoEstrategia.cicloId;
  });
  if (!coincideConSecuencia) {
    throw new ErrorRespaldoRotacion(
      CODIGOS_ERROR_RESPALDO_ROTACION.EVIDENCIA_ROTACION_INVALIDA,
      'evidenciaRotacion.pasos debe coincidir exactamente con la secuencia y su orden.'
    );
  }

  if (!NIVELES_EVIDENCIA_ROTACION.includes(evidencia.nivelEvidencia)) {
    throw new ErrorRespaldoRotacion(
      CODIGOS_ERROR_RESPALDO_ROTACION.EVIDENCIA_ROTACION_INVALIDA,
      'evidenciaRotacion.nivelEvidencia debe usar un nivel D19 admitido.'
    );
  }
  if (!Array.isArray(evidencia.fuenteIds) ||
      evidencia.fuenteIds.some((id) => typeof id !== 'string' || id.trim() === '')) {
    throw new ErrorRespaldoRotacion(
      CODIGOS_ERROR_RESPALDO_ROTACION.EVIDENCIA_ROTACION_INVALIDA,
      'evidenciaRotacion.fuenteIds debe ser un array de identificadores no vacíos.'
    );
  }
  if (new Set(evidencia.fuenteIds).size !== evidencia.fuenteIds.length) {
    throw new ErrorRespaldoRotacion(
      CODIGOS_ERROR_RESPALDO_ROTACION.EVIDENCIA_ROTACION_INVALIDA,
      'evidenciaRotacion.fuenteIds no puede contener identificadores duplicados.'
    );
  }
  for (const fuenteId of evidencia.fuenteIds) {
    if (!fuentesPorId.has(fuenteId)) {
      throw new ErrorRespaldoRotacion(
        CODIGOS_ERROR_RESPALDO_ROTACION.FUENTE_NO_ENCONTRADA,
        `La fuente de secuencia "${fuenteId}" no existe en catalogo.fuentes.`
      );
    }
  }

  if (evidencia.nivelEvidencia !== 'pendiente' && evidencia.fuenteIds.length === 0) {
    throw new ErrorRespaldoRotacion(
      CODIGOS_ERROR_RESPALDO_ROTACION.EVIDENCIA_ROTACION_INVALIDA,
      'Los niveles distintos de pendiente requieren al menos una referencia de fuente.'
    );
  }

  return Object.freeze({
    estado: evidencia.nivelEvidencia === 'parcial' || evidencia.nivelEvidencia === 'pendiente'
      ? evidencia.nivelEvidencia
      : 'declarada',
    nivelEvidencia: evidencia.nivelEvidencia,
    pasos: congelarPasos(evidencia.pasos),
    fuenteIds: Object.freeze([...evidencia.fuenteIds]),
    fuenteReferenciasResueltas: true,
    calidadCientificaVerificada: false,
    motivosNoCalculable: Object.freeze(
      evidencia.nivelEvidencia === 'pendiente'
        ? ['La evidencia específica de la secuencia está pendiente.']
        : evidencia.nivelEvidencia === 'parcial'
          ? ['La evidencia específica de la secuencia es parcial.']
          : []
    ),
  });
}

/**
 * Evalúa estructura, temporalidad ya implementada y evidencia de secuencia por separado.
 * @param {{catalogo: object, estrategiaId: string, finca: object, bufferDias?: number}} entrada
 */
export function evaluarRespaldoRotacion(entrada = {}) {
  if (!esObjetoPlano(entrada)) {
    throw new ErrorRespaldoRotacion(
      CODIGOS_ERROR_RESPALDO_ROTACION.ENTRADA_INVALIDA,
      'La entrada debe ser un objeto plano.'
    );
  }
  const { catalogo, estrategiaId, finca, bufferDias = 0 } = entrada;
  if (!esObjetoPlano(catalogo) || typeof estrategiaId !== 'string' || estrategiaId.trim() === '') {
    throw new ErrorRespaldoRotacion(
      CODIGOS_ERROR_RESPALDO_ROTACION.ENTRADA_INVALIDA,
      'Se requiere catalogo plano y estrategiaId no vacío.'
    );
  }

  const validacion = validarCatalogo(catalogo);
  if (!validacion.valido) {
    throw new ErrorRespaldoRotacion(
      CODIGOS_ERROR_RESPALDO_ROTACION.CATALOGO_INVALIDO,
      `El catálogo no es estructuralmente válido: ${validacion.errores.map((error) => error.campo).join(', ')}`
    );
  }

  const estrategia = catalogo.estrategias.find((item) => item.id === estrategiaId);
  if (!estrategia) {
    throw new ErrorRespaldoRotacion(
      CODIGOS_ERROR_RESPALDO_ROTACION.ESTRATEGIA_NO_ENCONTRADA,
      `No existe la estrategia "${estrategiaId}".`
    );
  }

  const evaluacionCiclos = evaluarElegibilidadEstrategia({
    estrategia,
    catalogo,
    finca,
    bufferDias,
  });
  const evidenciaDeclarada = estrategia.evidenciaRotacion;
  const evidenciaRotacion = evidenciaDeclarada === undefined
    ? Object.freeze({
        estado: 'faltante',
        nivelEvidencia: 'pendiente',
        pasos: congelarPasos(estrategia.pasos),
        fuenteIds: Object.freeze([]),
        fuenteReferenciasResueltas: false,
        calidadCientificaVerificada: false,
        motivosNoCalculable: Object.freeze([
          'Falta evidencia documental específica de la secuencia de rotación; las fuentes de cultivos o ciclos no la sustituyen.',
        ]),
      })
    : validarEvidenciaRotacion(
        evidenciaDeclarada,
        estrategia,
        new Set(catalogo.fuentes.map((fuente) => fuente.id))
      );

  return Object.freeze({
    estrategiaId,
    estructura: Object.freeze({
      valida: true,
      pasos: congelarPasos(estrategia.pasos),
    }),
    compatibilidadTemporal: evaluacionCiclos.compatibilidadTemporal,
    elegibilidadDeCultivosYCiclos: evaluacionCiclos,
    evidenciaRotacion,
    recomendacionesHabilitadas: false,
  });
}
