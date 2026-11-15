/**
 * FIELDVERSE / Cultivitos
 * Resolución experimental de trazabilidad de evidencia por atributo (D22).
 *
 * Las declaraciones se reciben por separado del catálogo para no cambiar el
 * contrato público de Fuente/Ciclo. Resolver un identificador o una declaración
 * no verifica el contenido ni la calidad científica de una fuente.
 */
import { validarCatalogo } from './validar-catalogo.js';
import { NIVELES_EVIDENCIA } from '../simulation/elegibilidad.js';
import { MODOS_PUNTUACION_D7 } from '../simulation/puntuacion-d7.js';

const ALCANCES_GEOGRAFICOS = new Set(['local', 'cantonal', 'regional', 'nacional', null]);
const CONTEXTOS_FUENTE = Object.freeze({
  SINTETICA_PRUEBA: 'sintetica_prueba',
  REFERENCIA_CATALOGO: 'referencia_catalogo',
});

export const ESTADOS_EVIDENCIA_ATRIBUTO = Object.freeze({
  ATRIBUTO_SIN_FUENTE: 'atributo_sin_fuente',
  FUENTE_NO_RESUELTA: 'fuente_no_resuelta',
  FUENTE_NO_DECLARA_ATRIBUTO: 'fuente_no_declara_respaldo_del_atributo',
  CONTEXTO_FUENTE_INCOMPATIBLE: 'contexto_fuente_incompatible_con_modo',
  ALCANCE_NO_COINCIDENTE: 'alcance_no_coincidente',
  ALCANCE_INDETERMINADO: 'alcance_indeterminado',
  EVIDENCIA_DECLARADA: 'evidencia_declarada',
  EVIDENCIA_PARCIAL: 'evidencia_parcial',
  EVIDENCIA_PENDIENTE: 'evidencia_pendiente',
});

export const CODIGOS_ERROR_EVIDENCIA_ATRIBUTO = Object.freeze({
  ENTRADA_INVALIDA: 'ENTRADA_INVALIDA_EVIDENCIA_ATRIBUTO',
  CATALOGO_INVALIDO: 'CATALOGO_INVALIDO_EVIDENCIA_ATRIBUTO',
  ATRIBUTO_INVALIDO: 'ATRIBUTO_INVALIDO_EVIDENCIA_ATRIBUTO',
  DECLARACION_INVALIDA: 'DECLARACION_INVALIDA_EVIDENCIA_ATRIBUTO',
  ALCANCE_INVALIDO: 'ALCANCE_INVALIDO_EVIDENCIA_ATRIBUTO',
  NIVEL_EVIDENCIA_INVALIDO: 'NIVEL_EVIDENCIA_INVALIDO_EVIDENCIA_ATRIBUTO',
});

export class ErrorEvidenciaAtributo extends Error {
  constructor(codigo, mensaje) {
    super(mensaje);
    this.name = 'ErrorEvidenciaAtributo';
    this.codigo = codigo;
  }
}

function esObjetoPlano(valor) {
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) return false;
  const prototipo = Object.getPrototypeOf(valor);
  return prototipo === Object.prototype || prototipo === null;
}

function textoNoVacio(valor) {
  return typeof valor === 'string' && valor.trim() !== '';
}

function validarAlcance(alcanceGeografico, localidad, ruta) {
  if (!ALCANCES_GEOGRAFICOS.has(alcanceGeografico)) {
    throw new ErrorEvidenciaAtributo(
      CODIGOS_ERROR_EVIDENCIA_ATRIBUTO.ALCANCE_INVALIDO,
      `${ruta}.alcanceGeografico no usa un valor definido por D19.`
    );
  }
  const localidadDebeSerNula = alcanceGeografico === null || alcanceGeografico === 'nacional';
  if (localidadDebeSerNula ? localidad !== null : !textoNoVacio(localidad)) {
    throw new ErrorEvidenciaAtributo(
      CODIGOS_ERROR_EVIDENCIA_ATRIBUTO.ALCANCE_INVALIDO,
      `${ruta}.localidad no es coherente con alcanceGeografico según D19.`
    );
  }
}

function validarNivelYAlcance(declaracion, ruta) {
  const niveles = Object.values(NIVELES_EVIDENCIA);
  if (!niveles.includes(declaracion.nivelEvidencia)) {
    throw new ErrorEvidenciaAtributo(
      CODIGOS_ERROR_EVIDENCIA_ATRIBUTO.NIVEL_EVIDENCIA_INVALIDO,
      `${ruta}.nivelEvidencia debe usar uno de los niveles D19 existentes.`
    );
  }
  validarAlcance(declaracion.alcanceGeografico, declaracion.localidad, ruta);

  // Coherencia geográfica D19; la localidad piloto concreta se deja configurable.
  if (
    (declaracion.nivelEvidencia === NIVELES_EVIDENCIA.DIRECTA_LOCAL && declaracion.alcanceGeografico !== 'local') ||
    (declaracion.nivelEvidencia === NIVELES_EVIDENCIA.EXTRAPOLADA &&
      (declaracion.alcanceGeografico === 'local' || declaracion.alcanceGeografico === null))
  ) {
    throw new ErrorEvidenciaAtributo(
      CODIGOS_ERROR_EVIDENCIA_ATRIBUTO.ALCANCE_INVALIDO,
      `${ruta}.nivelEvidencia y alcanceGeografico no son coherentes según D19.`
    );
  }
}

function congelarResultadoAtributo(atributo, declaraciones, fuentesPorId, modo) {
  const evidencias = declaraciones.map((declaracion, indice) => {
    const ruta = `declaraciones[${indice}]`;
    const base = {
      fuenteId: declaracion.fuenteId ?? null,
      nivelEvidencia: declaracion.nivelEvidencia ?? null,
      alcanceGeografico: declaracion.alcanceGeografico ?? null,
      localidad: declaracion.localidad ?? null,
      calidadCientificaVerificada: false,
    };

    if (declaracion.fuenteId === undefined || declaracion.fuenteId === null || declaracion.fuenteId === '') {
      return Object.freeze({ ...base, estado: ESTADOS_EVIDENCIA_ATRIBUTO.ATRIBUTO_SIN_FUENTE });
    }
    if (!fuentesPorId.has(declaracion.fuenteId)) {
      return Object.freeze({ ...base, estado: ESTADOS_EVIDENCIA_ATRIBUTO.FUENTE_NO_RESUELTA });
    }
    if (declaracion.respaldaAtributo === false) {
      return Object.freeze({
        ...base,
        contextoFuente: declaracion.contextoFuente,
        estado: ESTADOS_EVIDENCIA_ATRIBUTO.FUENTE_NO_DECLARA_ATRIBUTO,
      });
    }

    const contextoEsperado = modo === MODOS_PUNTUACION_D7.PRUEBA_SINTETICA
      ? CONTEXTOS_FUENTE.SINTETICA_PRUEBA
      : CONTEXTOS_FUENTE.REFERENCIA_CATALOGO;
    if (declaracion.contextoFuente !== contextoEsperado) {
      return Object.freeze({
        ...base,
        contextoFuente: declaracion.contextoFuente,
        estado: ESTADOS_EVIDENCIA_ATRIBUTO.CONTEXTO_FUENTE_INCOMPATIBLE,
      });
    }

    validarNivelYAlcance(declaracion, ruta);
    const alcanceCoincide =
      declaracion.alcanceGeografico === atributo.alcanceGeografico &&
      declaracion.localidad === atributo.localidad;
    if (!alcanceCoincide) {
      return Object.freeze({
        ...base,
        contextoFuente: declaracion.contextoFuente,
        estado: ESTADOS_EVIDENCIA_ATRIBUTO.ALCANCE_NO_COINCIDENTE,
      });
    }
    if (declaracion.alcanceGeografico === null) {
      return Object.freeze({
        ...base,
        contextoFuente: declaracion.contextoFuente,
        naturalezaFuente: modo === MODOS_PUNTUACION_D7.PRUEBA_SINTETICA
          ? 'sintetica_prueba'
          : 'referencia_catalogo_no_verificada',
        estado: ESTADOS_EVIDENCIA_ATRIBUTO.ALCANCE_INDETERMINADO,
      });
    }

    const estado = declaracion.nivelEvidencia === NIVELES_EVIDENCIA.PARCIAL
      ? ESTADOS_EVIDENCIA_ATRIBUTO.EVIDENCIA_PARCIAL
      : declaracion.nivelEvidencia === NIVELES_EVIDENCIA.PENDIENTE
        ? ESTADOS_EVIDENCIA_ATRIBUTO.EVIDENCIA_PENDIENTE
        : ESTADOS_EVIDENCIA_ATRIBUTO.EVIDENCIA_DECLARADA;
    return Object.freeze({
      ...base,
      contextoFuente: declaracion.contextoFuente,
      naturalezaFuente: modo === MODOS_PUNTUACION_D7.PRUEBA_SINTETICA
        ? 'sintetica_prueba'
        : 'referencia_catalogo_no_verificada',
      estado,
    });
  });

  return Object.freeze({
    atributoId: atributo.id,
    alcanceGeografico: atributo.alcanceGeografico,
    localidad: atributo.localidad,
    estado: evidencias.length === 0
      ? ESTADOS_EVIDENCIA_ATRIBUTO.ATRIBUTO_SIN_FUENTE
      : 'declaraciones_por_fuente',
    evidencias: Object.freeze(evidencias),
  });
}

/**
 * Resuelve las declaraciones de evidencia por atributo sin inferir respaldo desde
 * la mera existencia de una fuente. La salida no es una evaluación agronómica.
 *
 * @param {{catalogo: object, atributos: Array, declaraciones: Array, modo: string}} entrada
 */
export function resolverEvidenciaAtributos(entrada) {
  if (!esObjetoPlano(entrada)) {
    throw new ErrorEvidenciaAtributo(
      CODIGOS_ERROR_EVIDENCIA_ATRIBUTO.ENTRADA_INVALIDA,
      'La entrada debe ser un objeto plano.'
    );
  }
  const { catalogo, atributos, declaraciones, modo } = entrada;
  if (!esObjetoPlano(catalogo) || !Array.isArray(atributos) || !Array.isArray(declaraciones)) {
    throw new ErrorEvidenciaAtributo(
      CODIGOS_ERROR_EVIDENCIA_ATRIBUTO.ENTRADA_INVALIDA,
      'Se requieren catalogo, atributos y declaraciones.'
    );
  }
  if (![MODOS_PUNTUACION_D7.PRUEBA_SINTETICA, MODOS_PUNTUACION_D7.REAL].includes(modo)) {
    throw new ErrorEvidenciaAtributo(
      CODIGOS_ERROR_EVIDENCIA_ATRIBUTO.ENTRADA_INVALIDA,
      'modo debe ser prueba_sintetica o real, según el vocabulario D7 existente.'
    );
  }

  const resultadoValidacionCatalogo = validarCatalogo(catalogo);
  if (!resultadoValidacionCatalogo.valido) {
    throw new ErrorEvidenciaAtributo(
      CODIGOS_ERROR_EVIDENCIA_ATRIBUTO.CATALOGO_INVALIDO,
      `Catálogo inválido: ${resultadoValidacionCatalogo.errores.map((error) => error.campo).join(', ')}.`
    );
  }

  const atributosPorId = new Map();
  atributos.forEach((atributo, indice) => {
    const ruta = `atributos[${indice}]`;
    if (!esObjetoPlano(atributo) || !textoNoVacio(atributo.id)) {
      throw new ErrorEvidenciaAtributo(
        CODIGOS_ERROR_EVIDENCIA_ATRIBUTO.ATRIBUTO_INVALIDO,
        `${ruta} debe incluir un id no vacío.`
      );
    }
    if (atributosPorId.has(atributo.id)) {
      throw new ErrorEvidenciaAtributo(
        CODIGOS_ERROR_EVIDENCIA_ATRIBUTO.ATRIBUTO_INVALIDO,
        `El atributo "${atributo.id}" está repetido.`
      );
    }
    validarAlcance(atributo.alcanceGeografico, atributo.localidad, ruta);
    atributosPorId.set(atributo.id, atributo);
  });

  const declaracionesPorAtributo = new Map([...atributosPorId.keys()].map((id) => [id, []]));
  const paresVistos = new Set();
  declaraciones.forEach((declaracion, indice) => {
    const ruta = `declaraciones[${indice}]`;
    if (!esObjetoPlano(declaracion) || !textoNoVacio(declaracion.atributoId)) {
      throw new ErrorEvidenciaAtributo(
        CODIGOS_ERROR_EVIDENCIA_ATRIBUTO.DECLARACION_INVALIDA,
        `${ruta} debe identificar un atributo.`
      );
    }
    if (!atributosPorId.has(declaracion.atributoId)) {
      throw new ErrorEvidenciaAtributo(
        CODIGOS_ERROR_EVIDENCIA_ATRIBUTO.DECLARACION_INVALIDA,
        `${ruta}.atributoId no corresponde a un atributo solicitado.`
      );
    }
    if (declaracion.respaldaAtributo !== true && declaracion.respaldaAtributo !== false) {
      throw new ErrorEvidenciaAtributo(
        CODIGOS_ERROR_EVIDENCIA_ATRIBUTO.DECLARACION_INVALIDA,
        `${ruta}.respaldaAtributo debe ser booleano explícito.`
      );
    }
    if (declaracion.fuenteId !== undefined && declaracion.fuenteId !== null && !textoNoVacio(declaracion.fuenteId)) {
      throw new ErrorEvidenciaAtributo(
        CODIGOS_ERROR_EVIDENCIA_ATRIBUTO.DECLARACION_INVALIDA,
        `${ruta}.fuenteId debe ser un identificador no vacío o null.`
      );
    }
    if (declaracion.fuenteId !== undefined && declaracion.fuenteId !== null) {
      const par = `${declaracion.atributoId}\u0000${declaracion.fuenteId}`;
      if (paresVistos.has(par)) {
        throw new ErrorEvidenciaAtributo(
          CODIGOS_ERROR_EVIDENCIA_ATRIBUTO.DECLARACION_INVALIDA,
          `${ruta} repite la fuente para el mismo atributo.`
        );
      }
      paresVistos.add(par);
    }
    if (declaracion.fuenteId !== undefined && declaracion.fuenteId !== null &&
        ![CONTEXTOS_FUENTE.SINTETICA_PRUEBA, CONTEXTOS_FUENTE.REFERENCIA_CATALOGO].includes(declaracion.contextoFuente)) {
      throw new ErrorEvidenciaAtributo(
        CODIGOS_ERROR_EVIDENCIA_ATRIBUTO.DECLARACION_INVALIDA,
        `${ruta}.contextoFuente debe identificar fixture sintético o referencia del catálogo.`
      );
    }
    declaracionesPorAtributo.get(declaracion.atributoId).push(declaracion);
  });

  const fuentesPorId = new Set(catalogo.fuentes.map((fuente) => fuente.id));
  const resultados = atributos.map((atributo) => congelarResultadoAtributo(
    atributo,
    declaracionesPorAtributo.get(atributo.id),
    fuentesPorId,
    modo
  ));

  return Object.freeze({
    modo,
    resultados: Object.freeze(resultados),
    calidadCientificaVerificada: false,
    recomendacionesHabilitadas: false,
  });
}
