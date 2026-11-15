export const ESTADOS = Object.freeze({
  COMPLETO: 'completo',
  INCOMPLETO: 'incompleto',
  SIN_OPCIONES: 'sin_opciones',
});

export const CODIGOS_ERROR = Object.freeze({
  ENTRADA_INVALIDA: 'ENTRADA_INVALIDA',
  PUNTUACION_FUERA_DE_RANGO: 'PUNTUACION_FUERA_DE_RANGO',
});

export const MOTIVOS_NO_CALCULABLE = Object.freeze({
  PUNTUACION_AUSENTE: 'PUNTUACION_AUSENTE: falta la puntuación del escenario (propiedad ausente o null)',
});

export const MOTIVO_MATRIZ_INCOMPLETA =
  'MATRIZ_INCOMPLETA: no se calcula el peor arrepentimiento sin todas las puntuaciones de las estrategias elegibles';

export class ErrorEntradaDominio extends Error {
  constructor(codigo, mensaje) {
    super(mensaje);
    this.name = 'ErrorEntradaDominio';
    this.codigo = codigo;
  }
}

export function calcularMinimaxRegret(entrada) {
  const { escenarios, estrategias } = validarEntrada(entrada);
  const resultados = estrategias.map((estrategia) => normalizarEstrategia(estrategia, escenarios));
  const elegibles = resultados.filter((resultado) => resultado.elegible);
  const descartes = resultados
    .filter((resultado) => !resultado.elegible)
    .map((resultado) => ({
      estrategiaId: resultado.estrategiaId,
      motivos: [...resultado.motivosDescarte],
    }));

  if (elegibles.length === 0) {
    return {
      estado: ESTADOS.SIN_OPCIONES,
      matrizCompleta: false,
      escenarios: [...escenarios],
      mejoresPorEscenario: Object.fromEntries(escenarios.map((escenario) => [escenario, null])),
      resultados,
      descartes,
      ganadoras: [],
      peorArrepentimientoMinimo: null,
    };
  }

  const mejoresPorEscenario = {};

  for (const escenario of escenarios) {
    let mejor = null;

    for (const resultado of elegibles) {
      const puntuacion = resultado.puntuaciones[escenario];

      if (puntuacion !== null && (mejor === null || puntuacion > mejor)) {
        mejor = puntuacion;
      }
    }

    mejoresPorEscenario[escenario] = mejor;
  }

  const hayPuntuacionesFaltantes = elegibles.some((resultado) =>
    escenarios.some((escenario) => resultado.puntuaciones[escenario] === null)
  );

  if (hayPuntuacionesFaltantes) {
    for (const resultado of elegibles) {
      resultado.evaluada = true;
      resultado.arrepentimientos = Object.fromEntries(escenarios.map((escenario) => [escenario, null]));
      resultado.peorArrepentimiento = null;
      resultado.motivoPeorArrepentimiento = MOTIVO_MATRIZ_INCOMPLETA;
    }

    return {
      estado: ESTADOS.INCOMPLETO,
      matrizCompleta: false,
      escenarios: [...escenarios],
      mejoresPorEscenario,
      resultados,
      descartes,
      ganadoras: [],
      peorArrepentimientoMinimo: null,
    };
  }

  for (const resultado of elegibles) {
    const arrepentimientos = {};
    let peor = 0;

    for (const escenario of escenarios) {
      const arrepentimiento = mejoresPorEscenario[escenario] - resultado.puntuaciones[escenario];
      arrepentimientos[escenario] = arrepentimiento;

      if (arrepentimiento > peor) {
        peor = arrepentimiento;
      }
    }

    resultado.evaluada = true;
    resultado.arrepentimientos = arrepentimientos;
    resultado.peorArrepentimiento = peor;
    resultado.motivoPeorArrepentimiento = null;
  }

  let peorArrepentimientoMinimo = Infinity;

  for (const resultado of elegibles) {
    if (resultado.peorArrepentimiento < peorArrepentimientoMinimo) {
      peorArrepentimientoMinimo = resultado.peorArrepentimiento;
    }
  }

  const ganadoras = elegibles
    .filter((resultado) => resultado.peorArrepentimiento === peorArrepentimientoMinimo)
    .map((resultado) => resultado.estrategiaId);

  return {
    estado: ESTADOS.COMPLETO,
    matrizCompleta: true,
    escenarios: [...escenarios],
    mejoresPorEscenario,
    resultados,
    descartes,
    ganadoras,
    peorArrepentimientoMinimo,
  };
}

function validarEntrada(entrada) {
  if (!esObjetoPlano(entrada)) {
    throw errorEntrada('La entrada debe ser un objeto con { escenarios, estrategias }.');
  }

  const { escenarios, estrategias } = entrada;

  if (!Array.isArray(escenarios) || escenarios.length === 0) {
    throw errorEntrada('"escenarios" debe ser un array no vacío.');
  }

  const escenariosVistos = new Set();

  escenarios.forEach((escenario, indice) => {
    if (typeof escenario !== 'string' || escenario.trim() === '') {
      throw errorEntrada(`"escenarios[${indice}]" debe ser un string no vacío.`);
    }

    if (escenariosVistos.has(escenario)) {
      throw errorEntrada(`"escenarios" contiene el escenario duplicado "${escenario}".`);
    }

    escenariosVistos.add(escenario);
  });

  if (!Array.isArray(estrategias)) {
    throw errorEntrada('"estrategias" debe ser un array.');
  }

  const identificadoresVistos = new Set();

  estrategias.forEach((estrategia, indice) => {
    validarEstrategia(estrategia, indice, escenarios, identificadoresVistos);
  });

  return { escenarios, estrategias };
}

function validarEstrategia(estrategia, indice, escenarios, identificadoresVistos) {
  const ruta = `estrategias[${indice}]`;

  if (!esObjetoPlano(estrategia)) {
    throw errorEntrada(`"${ruta}" debe ser un objeto.`);
  }

  if (typeof estrategia.id !== 'string' || estrategia.id.trim() === '') {
    throw errorEntrada(`"${ruta}.id" debe ser un string no vacío.`);
  }

  if (identificadoresVistos.has(estrategia.id)) {
    throw errorEntrada(`El identificador de estrategia "${estrategia.id}" está duplicado.`);
  }

  identificadoresVistos.add(estrategia.id);

  if (typeof estrategia.elegible !== 'boolean') {
    throw errorEntrada(`"${ruta}.elegible" debe ser boolean.`);
  }

  if (estrategia.elegible) {
    if (estrategia.motivosDescarte !== undefined) {
      if (!Array.isArray(estrategia.motivosDescarte) || estrategia.motivosDescarte.length > 0) {
        throw errorEntrada(
          `"${ruta}.motivosDescarte" debe estar ausente o vacío cuando la estrategia es elegible.`
        );
      }
    }
  } else {
    if (!Array.isArray(estrategia.motivosDescarte) || estrategia.motivosDescarte.length === 0) {
      throw errorEntrada(
        `"${ruta}.motivosDescarte" debe ser un array no vacío cuando la estrategia no es elegible.`
      );
    }

    estrategia.motivosDescarte.forEach((motivo, indiceMotivo) => {
      if (typeof motivo !== 'string' || motivo.trim() === '') {
        throw errorEntrada(`"${ruta}.motivosDescarte[${indiceMotivo}]" debe ser un string no vacío.`);
      }
    });
  }

  validarPuntuaciones(estrategia.puntuaciones, ruta, escenarios);
}

function validarPuntuaciones(puntuaciones, ruta, escenarios) {
  if (puntuaciones === undefined || puntuaciones === null) {
    return;
  }

  if (!esObjetoPlano(puntuaciones)) {
    throw errorEntrada(`"${ruta}.puntuaciones" debe ser un objeto plano o null.`);
  }

  const escenariosValidos = new Set(escenarios);

  for (const clave of Object.keys(puntuaciones)) {
    if (!escenariosValidos.has(clave)) {
      throw errorEntrada(`"${ruta}.puntuaciones" contiene el escenario desconocido "${clave}".`);
    }
  }

  for (const escenario of escenarios) {
    if (!Object.hasOwn(puntuaciones, escenario)) {
      continue;
    }

    const valor = puntuaciones[escenario];

    if (valor === null || valor === undefined) {
      continue;
    }

    if (typeof valor !== 'number' || !Number.isFinite(valor)) {
      throw errorEntrada(`"${ruta}.puntuaciones.${escenario}" debe ser un número finito o null.`);
    }

    if (valor < 0 || valor > 100) {
      throw new ErrorEntradaDominio(
        CODIGOS_ERROR.PUNTUACION_FUERA_DE_RANGO,
        `"${ruta}.puntuaciones.${escenario}" = ${valor} está fuera del rango [0, 100].`
      );
    }
  }
}

function normalizarEstrategia(estrategia, escenarios) {
  const puntuaciones = {};
  const motivosNoCalculable = {};
  const puntuacionesEntrada = esObjetoPlano(estrategia.puntuaciones) ? estrategia.puntuaciones : null;

  for (const escenario of escenarios) {
    let valor = null;

    if (puntuacionesEntrada !== null && Object.hasOwn(puntuacionesEntrada, escenario)) {
      const bruto = puntuacionesEntrada[escenario];

      if (bruto !== null && bruto !== undefined) {
        valor = bruto;
      }
    }

    puntuaciones[escenario] = valor;

    if (valor === null && estrategia.elegible) {
      motivosNoCalculable[escenario] = MOTIVOS_NO_CALCULABLE.PUNTUACION_AUSENTE;
    }
  }

  return {
    estrategiaId: estrategia.id,
    elegible: estrategia.elegible,
    evaluada: false,
    puntuaciones,
    arrepentimientos: null,
    peorArrepentimiento: null,
    motivoPeorArrepentimiento: null,
    motivosNoCalculable,
    motivosDescarte: estrategia.elegible ? [] : [...estrategia.motivosDescarte],
  };
}

function esObjetoPlano(valor) {
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) {
    return false;
  }

  const prototipo = Object.getPrototypeOf(valor);

  return prototipo === Object.prototype || prototipo === null;
}

function errorEntrada(mensaje) {
  return new ErrorEntradaDominio(CODIGOS_ERROR.ENTRADA_INVALIDA, mensaje);
}
