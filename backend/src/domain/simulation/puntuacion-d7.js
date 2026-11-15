export const MODOS_PUNTUACION_D7 = Object.freeze({
  PRUEBA_SINTETICA: 'prueba_sintetica',
  REAL: 'real',
});

export const PRIORIDADES_D7 = Object.freeze([
  'equilibrio',
  'agua',
  'suelo',
]);

export const ESCENARIOS_D7 = Object.freeze([
  'habitual',
  'seco',
  'humedo',
]);

export const DIRECCIONES_D7 = Object.freeze({
  MAYOR_MEJOR: 'mayor_mejor',
  MENOR_MEJOR: 'menor_mejor',
});

export const CODIGOS_ERROR_D7 = Object.freeze({
  ENTRADA_INVALIDA: 'ENTRADA_INVALIDA_D7',
  MODO_NO_HABILITADO: 'MODO_NO_HABILITADO_D7',
  CONFIGURACION_INVALIDA: 'CONFIGURACION_INVALIDA_D7',
  FUENTE_NO_ENCONTRADA: 'FUENTE_NO_ENCONTRADA_D7',
  VALOR_INVALIDO: 'VALOR_INVALIDO_D7',
  RESULTADO_FUERA_DE_RANGO: 'RESULTADO_FUERA_DE_RANGO_D7',
});

// Tolerancia únicamente numérica para representar sumas decimales de coma flotante.
export const TOLERANCIA_SUMA_PESOS_D7 = 1e-12;

// Solo corrige desviaciones de coma flotante en la frontera matemática [0, 100].
export const TOLERANCIA_REDONDEO_D7 = 2e-10;

const ESCENARIOS_PERMITIDOS = new Set(ESCENARIOS_D7);
const PRIORIDADES_PERMITIDAS = new Set(PRIORIDADES_D7);
const DIRECCIONES_PERMITIDAS = new Set(Object.values(DIRECCIONES_D7));

export class ErrorPuntuacionD7 extends Error {
  constructor(codigo, campo, mensaje) {
    super(mensaje);
    this.name = 'ErrorPuntuacionD7';
    this.codigo = codigo;
    this.campo = campo;
  }
}

/**
 * Calcula puntuaciones experimentales a partir de indicadores ya construidos.
 * El modo real permanece deshabilitado hasta ratificar las reglas D6/D7.
 */
export function calcularPuntuacionesD7(entrada) {
  if (esObjetoPlano(entrada) && entrada.modo === MODOS_PUNTUACION_D7.REAL) {
    throw new ErrorPuntuacionD7(
      CODIGOS_ERROR_D7.MODO_NO_HABILITADO,
      'modo',
      'El modo real está deshabilitado hasta que se ratifiquen las reglas D6/D7.'
    );
  }

  if (!esObjetoPlano(entrada)) {
    throw error(
      CODIGOS_ERROR_D7.ENTRADA_INVALIDA,
      'entrada',
      'La entrada debe ser un objeto plano.'
    );
  }

  if (entrada.modo !== MODOS_PUNTUACION_D7.PRUEBA_SINTETICA) {
    throw error(
      CODIGOS_ERROR_D7.MODO_NO_HABILITADO,
      'modo',
      `El modo debe ser "${MODOS_PUNTUACION_D7.PRUEBA_SINTETICA}"; demo y otros modos no se procesan aquí.`
    );
  }

  validarPrioridad(entrada.prioridad);
  const escenarios = validarEscenarios(entrada.escenarios);
  const fuentes = validarEvidencia(entrada.evidencia);
  const reglas = validarReglas(entrada.reglas, fuentes, entrada.prioridad);
  const estrategias = validarEstrategias(entrada.estrategias, escenarios, reglas, fuentes);
  const fuenteIdsUsadas = new Set(reglas.fuenteIds);

  for (const estrategia of estrategias) {
    for (const fuenteId of estrategia.fuenteIds) {
      fuenteIdsUsadas.add(fuenteId);
    }
  }

  return {
    modo: entrada.modo,
    prioridad: entrada.prioridad,
    reglas: {
      id: reglas.id,
      version: reglas.version,
    },
    escenarios: [...escenarios],
    resultados: estrategias.map((estrategia) => estrategia.resultado),
    evidencia: {
      catalogoVersion: entrada.evidencia.catalogoVersion,
      fuenteIds: [...fuenteIdsUsadas],
    },
  };
}

function validarPrioridad(prioridad) {
  if (!PRIORIDADES_PERMITIDAS.has(prioridad)) {
    throw error(
      CODIGOS_ERROR_D7.ENTRADA_INVALIDA,
      'prioridad',
      'La prioridad debe ser equilibrio, agua o suelo.'
    );
  }
}

function validarEscenarios(escenarios) {
  if (!Array.isArray(escenarios) || escenarios.length !== ESCENARIOS_D7.length) {
    throw error(
      CODIGOS_ERROR_D7.ENTRADA_INVALIDA,
      'escenarios',
      'Se requieren exactamente habitual, seco y humedo, sin repeticiones.'
    );
  }

  const vistos = new Set();

  escenarios.forEach((escenario, indice) => {
    if (typeof escenario !== 'string' || !ESCENARIOS_PERMITIDOS.has(escenario)) {
      throw error(
        CODIGOS_ERROR_D7.ENTRADA_INVALIDA,
        `escenarios[${indice}]`,
        `Escenario desconocido: ${String(escenario)}.`
      );
    }

    if (vistos.has(escenario)) {
      throw error(
        CODIGOS_ERROR_D7.ENTRADA_INVALIDA,
        `escenarios[${indice}]`,
        `El escenario "${escenario}" está repetido.`
      );
    }

    vistos.add(escenario);
  });

  if (ESCENARIOS_D7.some((escenario) => !vistos.has(escenario))) {
    throw error(
      CODIGOS_ERROR_D7.ENTRADA_INVALIDA,
      'escenarios',
      'Deben incluirse habitual, seco y humedo.'
    );
  }

  return [...escenarios];
}

function validarEvidencia(evidencia) {
  if (!esObjetoPlano(evidencia)) {
    throw error(
      CODIGOS_ERROR_D7.CONFIGURACION_INVALIDA,
      'evidencia',
      'evidencia debe ser un objeto plano.'
    );
  }

  validarTexto(evidencia.catalogoVersion, 'evidencia.catalogoVersion');

  if (!Array.isArray(evidencia.fuentes)) {
    throw error(
      CODIGOS_ERROR_D7.CONFIGURACION_INVALIDA,
      'evidencia.fuentes',
      'evidencia.fuentes debe ser un array de fuentes sintéticas.'
    );
  }

  const fuentes = new Map();

  evidencia.fuentes.forEach((fuente, indice) => {
    const ruta = `evidencia.fuentes[${indice}]`;

    if (!esObjetoPlano(fuente)) {
      throw error(CODIGOS_ERROR_D7.CONFIGURACION_INVALIDA, ruta, 'La fuente debe ser un objeto plano.');
    }

    validarTexto(fuente.id, `${ruta}.id`);

    if (fuentes.has(fuente.id)) {
      throw error(CODIGOS_ERROR_D7.CONFIGURACION_INVALIDA, `${ruta}.id`, `Fuente duplicada: "${fuente.id}".`);
    }

    if (fuente.tipo !== 'sintetica') {
      throw error(
        CODIGOS_ERROR_D7.CONFIGURACION_INVALIDA,
        `${ruta}.tipo`,
        'El modo prueba_sintetica solo admite fuentes marcadas tipo "sintetica".'
      );
    }

    fuentes.set(fuente.id, fuente);
  });

  return fuentes;
}

function validarReglas(reglas, fuentes, prioridad) {
  if (!esObjetoPlano(reglas)) {
    throw error(CODIGOS_ERROR_D7.CONFIGURACION_INVALIDA, 'reglas', 'reglas debe ser un objeto plano.');
  }

  validarTexto(reglas.id, 'reglas.id');
  validarTexto(reglas.version, 'reglas.version');

  if (!Array.isArray(reglas.indicadores) || reglas.indicadores.length === 0) {
    throw error(
      CODIGOS_ERROR_D7.CONFIGURACION_INVALIDA,
      'reglas.indicadores',
      'Se requiere al menos un indicador explícito.'
    );
  }

  const ids = new Set();
  const indicadores = reglas.indicadores.map((indicador, indice) => {
    const ruta = `reglas.indicadores[${indice}]`;

    if (!esObjetoPlano(indicador)) {
      throw error(CODIGOS_ERROR_D7.CONFIGURACION_INVALIDA, ruta, 'El indicador debe ser un objeto plano.');
    }

    validarTexto(indicador.id, `${ruta}.id`);
    validarTexto(indicador.unidad, `${ruta}.unidad`);

    if (ids.has(indicador.id)) {
      throw error(CODIGOS_ERROR_D7.CONFIGURACION_INVALIDA, `${ruta}.id`, `Indicador duplicado: "${indicador.id}".`);
    }
    ids.add(indicador.id);

    if (!DIRECCIONES_PERMITIDAS.has(indicador.direccion)) {
      throw error(
        CODIGOS_ERROR_D7.CONFIGURACION_INVALIDA,
        `${ruta}.direccion`,
        'La dirección debe ser mayor_mejor o menor_mejor.'
      );
    }

    if (!esObjetoPlano(indicador.normalizacion)) {
      throw error(
        CODIGOS_ERROR_D7.CONFIGURACION_INVALIDA,
        `${ruta}.normalizacion`,
        'normalizacion debe declarar min y max.'
      );
    }

    const { min, max } = indicador.normalizacion;
    if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) {
      throw error(
        CODIGOS_ERROR_D7.CONFIGURACION_INVALIDA,
        `${ruta}.normalizacion`,
        'min y max deben ser finitos y cumplir min < max.'
      );
    }

    const pesos = validarPesos(indicador.pesosPorPrioridad, `${ruta}.pesosPorPrioridad`);
    const fuenteIds = validarFuentesReferenciadas(indicador.fuenteIds, `${ruta}.fuenteIds`, fuentes);

    return {
      id: indicador.id,
      unidad: indicador.unidad,
      direccion: indicador.direccion,
      min,
      max,
      pesos,
      fuenteIds,
    };
  });

  for (const prioridad of PRIORIDADES_D7) {
    const suma = indicadores.reduce((total, indicador) => total + indicador.pesos[prioridad], 0);

    if (Math.abs(suma - 1) > TOLERANCIA_SUMA_PESOS_D7) {
      throw error(
        CODIGOS_ERROR_D7.CONFIGURACION_INVALIDA,
        'reglas.indicadores.pesosPorPrioridad',
        `Los pesos de "${prioridad}" deben sumar 1 (tolerancia numérica ${TOLERANCIA_SUMA_PESOS_D7}).`
      );
    }
  }

  return {
    id: reglas.id,
    version: reglas.version,
    prioridad,
    indicadores,
    fuenteIds: indicadores.flatMap((indicador) => indicador.fuenteIds),
  };
}

function validarPesos(pesosPorPrioridad, ruta) {
  if (!esObjetoPlano(pesosPorPrioridad)) {
    throw error(CODIGOS_ERROR_D7.CONFIGURACION_INVALIDA, ruta, 'Se requieren pesos explícitos para las tres prioridades.');
  }

  const pesos = {};

  const clavesNoReconocidas = Object.keys(pesosPorPrioridad).filter(
    (prioridad) => !PRIORIDADES_PERMITIDAS.has(prioridad)
  );
  if (clavesNoReconocidas.length > 0) {
    throw error(
      CODIGOS_ERROR_D7.CONFIGURACION_INVALIDA,
      ruta,
      `Prioridad no reconocida en pesos: "${clavesNoReconocidas[0]}".`
    );
  }

  for (const prioridad of PRIORIDADES_D7) {
    if (!Object.hasOwn(pesosPorPrioridad, prioridad)) {
      throw error(
        CODIGOS_ERROR_D7.CONFIGURACION_INVALIDA,
        `${ruta}.${prioridad}`,
        'El peso para esta prioridad debe declararse explícitamente.'
      );
    }

    const peso = pesosPorPrioridad[prioridad];

    if (typeof peso !== 'number' || !Number.isFinite(peso) || peso < 0) {
      throw error(
        CODIGOS_ERROR_D7.CONFIGURACION_INVALIDA,
        `${ruta}.${prioridad}`,
        'El peso debe ser un número finito no negativo.'
      );
    }

    pesos[prioridad] = peso;
  }

  return pesos;
}

function validarEstrategias(estrategias, escenarios, reglas, fuentes) {
  if (!Array.isArray(estrategias)) {
    throw error(CODIGOS_ERROR_D7.ENTRADA_INVALIDA, 'estrategias', 'estrategias debe ser un array.');
  }

  const ids = new Set();
  return estrategias.map((estrategia, indice) => {
    const ruta = `estrategias[${indice}]`;

    if (!esObjetoPlano(estrategia)) {
      throw error(CODIGOS_ERROR_D7.ENTRADA_INVALIDA, ruta, 'La estrategia debe ser un objeto plano.');
    }

    validarTexto(estrategia.id, `${ruta}.id`);
    if (ids.has(estrategia.id)) {
      throw error(CODIGOS_ERROR_D7.ENTRADA_INVALIDA, `${ruta}.id`, `Estrategia duplicada: "${estrategia.id}".`);
    }
    ids.add(estrategia.id);

    if (typeof estrategia.elegible !== 'boolean') {
      throw error(CODIGOS_ERROR_D7.ENTRADA_INVALIDA, `${ruta}.elegible`, 'elegible debe ser boolean.');
    }

    const motivosDescarte = validarMotivosDescarte(estrategia, ruta);
    if (!estrategia.elegible) {
      return {
        fuenteIds: [],
        resultado: {
          estrategiaId: estrategia.id,
          elegible: false,
          puntuaciones: null,
          motivosNoCalculable: {},
          motivosDescarte,
        },
      };
    }

    const datos = validarValoresPorEscenario(estrategia.valoresPorEscenario, ruta, escenarios, reglas, fuentes);

    return {
      fuenteIds: datos.fuenteIds,
      resultado: {
        estrategiaId: estrategia.id,
        elegible: true,
        puntuaciones: datos.puntuaciones,
        motivosNoCalculable: datos.motivosNoCalculable,
        motivosDescarte: [],
      },
    };
  });
}

function validarMotivosDescarte(estrategia, ruta) {
  const motivos = estrategia.motivosDescarte;

  if (!Array.isArray(motivos)) {
    throw error(CODIGOS_ERROR_D7.ENTRADA_INVALIDA, `${ruta}.motivosDescarte`, 'motivosDescarte debe ser un array.');
  }

  if (estrategia.elegible && motivos.length > 0) {
    throw error(CODIGOS_ERROR_D7.ENTRADA_INVALIDA, `${ruta}.motivosDescarte`, 'Una estrategia elegible no puede tener motivos de descarte.');
  }

  if (!estrategia.elegible && motivos.length === 0) {
    throw error(CODIGOS_ERROR_D7.ENTRADA_INVALIDA, `${ruta}.motivosDescarte`, 'Una estrategia descartada requiere al menos un motivo.');
  }

  motivos.forEach((motivo, indice) => validarTexto(motivo, `${ruta}.motivosDescarte[${indice}]`));
  return [...motivos];
}

function validarValoresPorEscenario(valoresPorEscenario, ruta, escenarios, reglas, fuentes) {
  if (valoresPorEscenario !== undefined && valoresPorEscenario !== null && !esObjetoPlano(valoresPorEscenario)) {
    throw error(
      CODIGOS_ERROR_D7.ENTRADA_INVALIDA,
      `${ruta}.valoresPorEscenario`,
      'valoresPorEscenario debe ser un objeto plano, null o estar ausente.'
    );
  }

  const escenariosEntrada = valoresPorEscenario ?? {};
  for (const escenario of Object.keys(escenariosEntrada)) {
    if (!escenarios.includes(escenario)) {
      throw error(
        CODIGOS_ERROR_D7.ENTRADA_INVALIDA,
        `${ruta}.valoresPorEscenario.${escenario}`,
        `Escenario no declarado: "${escenario}".`
      );
    }
  }

  const idsIndicador = new Set(reglas.indicadores.map((indicador) => indicador.id));
  const puntuaciones = {};
  const motivosNoCalculable = {};
  const fuenteIdsUsadas = new Set();

  for (const escenario of escenarios) {
    const valores = escenariosEntrada[escenario];
    if (valores !== undefined && valores !== null && !esObjetoPlano(valores)) {
      throw error(
        CODIGOS_ERROR_D7.ENTRADA_INVALIDA,
        `${ruta}.valoresPorEscenario.${escenario}`,
        'Los valores del escenario deben ser un objeto plano, null o estar ausentes.'
      );
    }

    const valoresIndicador = valores ?? {};
    for (const indicadorId of Object.keys(valoresIndicador)) {
      if (!idsIndicador.has(indicadorId)) {
        throw error(
          CODIGOS_ERROR_D7.ENTRADA_INVALIDA,
          `${ruta}.valoresPorEscenario.${escenario}.${indicadorId}`,
          `Indicador no declarado: "${indicadorId}".`
        );
      }
    }

    let puntuacion = 0;
    const faltantes = [];

    for (const indicador of reglas.indicadores) {
      const dato = Object.hasOwn(valoresIndicador, indicador.id) ? valoresIndicador[indicador.id] : undefined;
      if (dato === undefined || dato === null) {
        faltantes.push(indicador.id);
        continue;
      }

      if (!esObjetoPlano(dato)) {
        throw error(
          CODIGOS_ERROR_D7.ENTRADA_INVALIDA,
          `${ruta}.valoresPorEscenario.${escenario}.${indicador.id}`,
          'El indicador debe ser un objeto, null o estar ausente.'
        );
      }

      if (dato.unidad !== indicador.unidad) {
        throw error(
          CODIGOS_ERROR_D7.CONFIGURACION_INVALIDA,
          `${ruta}.valoresPorEscenario.${escenario}.${indicador.id}.unidad`,
          `La unidad debe coincidir con "${indicador.unidad}".`
        );
      }

      const fuenteIds = validarFuentesReferenciadas(
        dato.fuenteIds,
        `${ruta}.valoresPorEscenario.${escenario}.${indicador.id}.fuenteIds`,
        fuentes
      );
      fuenteIds.forEach((fuenteId) => fuenteIdsUsadas.add(fuenteId));

      if (!Object.hasOwn(dato, 'valor') || dato.valor === null) {
        faltantes.push(indicador.id);
        continue;
      }

      if (typeof dato.valor !== 'number' || !Number.isFinite(dato.valor)) {
        throw error(
          CODIGOS_ERROR_D7.VALOR_INVALIDO,
          `${ruta}.valoresPorEscenario.${escenario}.${indicador.id}.valor`,
          'El valor debe ser un número finito o null/ausente para indicar dato faltante.'
        );
      }

      if (dato.valor < indicador.min || dato.valor > indicador.max) {
        throw error(
          CODIGOS_ERROR_D7.VALOR_INVALIDO,
          `${ruta}.valoresPorEscenario.${escenario}.${indicador.id}.valor`,
          `El valor debe estar dentro del rango explícito [${indicador.min}, ${indicador.max}].`
        );
      }

      const normalizado = normalizar(dato.valor, indicador);
      puntuacion += indicador.pesos[reglas.prioridad] * normalizado;
    }

    if (faltantes.length > 0) {
      puntuaciones[escenario] = null;
      motivosNoCalculable[escenario] = faltantes.map((indicadorId) => `INDICADOR_AUSENTE: ${indicadorId}`);
    } else {
      puntuaciones[escenario] = limitarDesviacionDeComaFlotante(puntuacion, `${ruta}.${escenario}`);
    }
  }

  return { puntuaciones, motivosNoCalculable, fuenteIds: [...fuenteIdsUsadas] };
}

function normalizar(valor, indicador) {
  const proporcion = (valor - indicador.min) / (indicador.max - indicador.min);
  const puntuacion = indicador.direccion === DIRECCIONES_D7.MAYOR_MEJOR
    ? proporcion * 100
    : (1 - proporcion) * 100;

  return limitarDesviacionDeComaFlotante(puntuacion, `indicador.${indicador.id}`);
}

function limitarDesviacionDeComaFlotante(valor, campo) {
  if (valor >= 0 && valor <= 100) {
    return valor;
  }

  if (valor < 0 && valor >= -TOLERANCIA_REDONDEO_D7) {
    return 0;
  }

  if (valor > 100 && valor <= 100 + TOLERANCIA_REDONDEO_D7) {
    return 100;
  }

  throw error(
    CODIGOS_ERROR_D7.RESULTADO_FUERA_DE_RANGO,
    campo,
    'El resultado excedió [0, 100] por más que la tolerancia numérica de coma flotante.'
  );
}

function validarFuentesReferenciadas(fuenteIds, ruta, fuentes) {
  if (!Array.isArray(fuenteIds) || fuenteIds.length === 0) {
    throw error(CODIGOS_ERROR_D7.CONFIGURACION_INVALIDA, ruta, 'Se requiere al menos un identificador de fuente.');
  }

  const vistos = new Set();
  fuenteIds.forEach((fuenteId, indice) => {
    validarTexto(fuenteId, `${ruta}[${indice}]`);

    if (vistos.has(fuenteId)) {
      throw error(CODIGOS_ERROR_D7.CONFIGURACION_INVALIDA, `${ruta}[${indice}]`, `Referencia de fuente duplicada: "${fuenteId}".`);
    }
    vistos.add(fuenteId);

    if (!fuentes.has(fuenteId)) {
      throw error(
        CODIGOS_ERROR_D7.FUENTE_NO_ENCONTRADA,
        `${ruta}[${indice}]`,
        `No existe la fuente "${fuenteId}" en evidencia.fuentes.`
      );
    }
  });

  return [...fuenteIds];
}

function validarTexto(valor, campo) {
  if (typeof valor !== 'string' || valor.trim() === '') {
    throw error(CODIGOS_ERROR_D7.ENTRADA_INVALIDA, campo, 'Debe ser un string no vacío.');
  }
}

function esObjetoPlano(valor) {
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) {
    return false;
  }

  const prototipo = Object.getPrototypeOf(valor);
  return prototipo === Object.prototype || prototipo === null;
}

function error(codigo, campo, mensaje) {
  return new ErrorPuntuacionD7(codigo, campo, mensaje);
}
