
export const CODIGOS_ERROR_CATALOGO = Object.freeze({
  ESTRUCTURA_INVALIDA: 'ESTRUCTURA_INVALIDA',
  CAMPO_REQUERIDO: 'CAMPO_REQUERIDO',
  TIPO_INVALIDO: 'TIPO_INVALIDO',
  VERSION_INVALIDA: 'VERSION_INVALIDA',
  IDENTIFICADOR_DUPLICADO: 'IDENTIFICADOR_DUPLICADO',
  FUENTE_NO_ENCONTRADA: 'FUENTE_NO_ENCONTRADA',
  CULTIVO_NO_ENCONTRADO: 'CULTIVO_NO_ENCONTRADO',
  CICLO_NO_ENCONTRADO: 'CICLO_NO_ENCONTRADO',
  CICLO_NO_PERTENECE_AL_CULTIVO: 'CICLO_NO_PERTENECE_AL_CULTIVO',
  PASOS_INVALIDOS: 'PASOS_INVALIDOS',
  ORDEN_INVALIDO: 'ORDEN_INVALIDO',
  PARAMETRO_INCOMPLETO: 'PARAMETRO_INCOMPLETO',
  VALOR_NO_FINITO: 'VALOR_NO_FINITO',
  MES_FUERA_DE_RANGO: 'MES_FUERA_DE_RANGO',
  RANGO_INVALIDO: 'RANGO_INVALIDO',
  OPCION_INVALIDA: 'OPCION_INVALIDA',
  VALOR_DUPLICADO: 'VALOR_DUPLICADO',
});

const PRIORIDADES_APROBADAS = new Set([
  'equilibrio',
  'agua',
  'suelo',
]);

const CLAVES_OPCIONES_FINCA = [
  'suelo',
  'drenaje',
  'riego',
  'prioridad',
  'mesInicio',
];

export function validarCatalogo(catalogo) {
  const errores = [];

  if (!esObjetoPlano(catalogo)) {
    agregarError(
      errores,
      CODIGOS_ERROR_CATALOGO.ESTRUCTURA_INVALIDA,
      'catalogo',
      'El catálogo debe ser un objeto plano.'
    );

    return { valido: false, errores };
  }

  validarVersion(catalogo.version, errores);

  const fuentesPorId = validarFuentes(
    catalogo.fuentes,
    errores
  );

  const { cultivosPorId, ciclosPorId } = validarCultivos(
    catalogo.cultivos,
    fuentesPorId,
    errores
  );

  validarEstrategias(
    catalogo.estrategias,
    fuentesPorId,
    cultivosPorId,
    ciclosPorId,
    errores
  );

  validarOpcionesFinca(catalogo.opcionesFinca, errores);

  return {
    valido: errores.length === 0,
    errores,
  };
}

function validarVersion(version, errores) {
  if (version === undefined || version === null) {
    agregarError(
      errores,
      CODIGOS_ERROR_CATALOGO.CAMPO_REQUERIDO,
      'version',
      'La versión del catálogo es obligatoria.'
    );
    return;
  }

  if (!esCadenaNoVacia(version)) {
    agregarError(
      errores,
      CODIGOS_ERROR_CATALOGO.VERSION_INVALIDA,
      'version',
      'La versión del catálogo debe ser un string no vacío.'
    );
  }
}

function validarFuentes(fuentes, errores) {
  const fuentesPorId = new Set();

  if (fuentes === undefined || fuentes === null) {
    agregarError(
      errores,
      CODIGOS_ERROR_CATALOGO.CAMPO_REQUERIDO,
      'fuentes',
      'La lista de fuentes es obligatoria.'
    );
    return fuentesPorId;
  }

  if (!Array.isArray(fuentes)) {
    agregarError(
      errores,
      CODIGOS_ERROR_CATALOGO.TIPO_INVALIDO,
      'fuentes',
      'La lista de fuentes debe ser un array.'
    );
    return fuentesPorId;
  }

  fuentes.forEach((fuente, indice) => {
    const ruta = `fuentes[${indice}]`;

    if (!esObjetoPlano(fuente)) {
      agregarError(
        errores,
        CODIGOS_ERROR_CATALOGO.TIPO_INVALIDO,
        ruta,
        'Cada fuente debe ser un objeto plano.'
      );
      return;
    }

    if (validarTextoRequerido(
      fuente.id,
      `${ruta}.id`,
      errores
    )) {
      if (fuentesPorId.has(fuente.id)) {
        agregarError(
          errores,
          CODIGOS_ERROR_CATALOGO.IDENTIFICADOR_DUPLICADO,
          `${ruta}.id`,
          `El identificador de fuente "${fuente.id}" está duplicado.`
        );
      } else {
        fuentesPorId.add(fuente.id);
      }
    }

    validarTextoRequerido(
      fuente.titulo,
      `${ruta}.titulo`,
      errores
    );

    validarTextoOpcional(
      fuente.url,
      `${ruta}.url`,
      errores
    );

    validarTextoOpcional(
      fuente.fecha,
      `${ruta}.fecha`,
      errores
    );

    validarTextoOpcional(
      fuente.notas,
      `${ruta}.notas`,
      errores
    );
  });

  return fuentesPorId;
}

function validarCultivos(cultivos, fuentesPorId, errores) {
  const cultivosPorId = new Map();
  const ciclosPorId = new Map();

  if (cultivos === undefined || cultivos === null) {
    agregarError(
      errores,
      CODIGOS_ERROR_CATALOGO.CAMPO_REQUERIDO,
      'cultivos',
      'La lista de cultivos es obligatoria.'
    );

    return { cultivosPorId, ciclosPorId };
  }

  if (!Array.isArray(cultivos)) {
    agregarError(
      errores,
      CODIGOS_ERROR_CATALOGO.TIPO_INVALIDO,
      'cultivos',
      'La lista de cultivos debe ser un array.'
    );

    return { cultivosPorId, ciclosPorId };
  }

  cultivos.forEach((cultivo, indice) => {
    const ruta = `cultivos[${indice}]`;

    if (!esObjetoPlano(cultivo)) {
      agregarError(
        errores,
        CODIGOS_ERROR_CATALOGO.TIPO_INVALIDO,
        ruta,
        'Cada cultivo debe ser un objeto plano.'
      );
      return;
    }

    const idValido = validarTextoRequerido(
      cultivo.id,
      `${ruta}.id`,
      errores
    );

    if (idValido) {
      if (cultivosPorId.has(cultivo.id)) {
        agregarError(
          errores,
          CODIGOS_ERROR_CATALOGO.IDENTIFICADOR_DUPLICADO,
          `${ruta}.id`,
          `El identificador de cultivo "${cultivo.id}" está duplicado.`
        );
      } else {
        cultivosPorId.set(cultivo.id, cultivo);
      }
    }

    validarTextoRequerido(
      cultivo.nombre,
      `${ruta}.nombre`,
      errores
    );

    validarReferenciaFuente(
      cultivo.fuenteId,
      `${ruta}.fuenteId`,
      fuentesPorId,
      errores
    );

    validarCiclos(
      cultivo.ciclos,
      idValido ? cultivo.id : null,
      `${ruta}.ciclos`,
      fuentesPorId,
      ciclosPorId,
      errores
    );
  });

  return { cultivosPorId, ciclosPorId };
}

function validarCiclos(
  ciclos,
  cultivoId,
  ruta,
  fuentesPorId,
  ciclosPorId,
  errores
) {
  if (ciclos === undefined || ciclos === null) {
    agregarError(
      errores,
      CODIGOS_ERROR_CATALOGO.CAMPO_REQUERIDO,
      ruta,
      'La lista de ciclos es obligatoria.'
    );
    return;
  }

  if (!Array.isArray(ciclos)) {
    agregarError(
      errores,
      CODIGOS_ERROR_CATALOGO.TIPO_INVALIDO,
      ruta,
      'La lista de ciclos debe ser un array.'
    );
    return;
  }

  ciclos.forEach((ciclo, indice) => {
    const rutaCiclo = `${ruta}[${indice}]`;

    if (!esObjetoPlano(ciclo)) {
      agregarError(
        errores,
        CODIGOS_ERROR_CATALOGO.TIPO_INVALIDO,
        rutaCiclo,
        'Cada ciclo debe ser un objeto plano.'
      );
      return;
    }

    if (validarTextoRequerido(
      ciclo.id,
      `${rutaCiclo}.id`,
      errores
    )) {
      if (ciclosPorId.has(ciclo.id)) {
        agregarError(
          errores,
          CODIGOS_ERROR_CATALOGO.IDENTIFICADOR_DUPLICADO,
          `${rutaCiclo}.id`,
          `El identificador de ciclo "${ciclo.id}" está duplicado.`
        );
      } else {
        ciclosPorId.set(ciclo.id, ciclo);
      }
    }

    const cultivoIdValido = validarTextoRequerido(
      ciclo.cultivoId,
      `${rutaCiclo}.cultivoId`,
      errores
    );

    if (
      cultivoIdValido &&
      cultivoId !== null &&
      ciclo.cultivoId !== cultivoId
    ) {
      agregarError(
        errores,
        CODIGOS_ERROR_CATALOGO.CICLO_NO_PERTENECE_AL_CULTIVO,
        `${rutaCiclo}.cultivoId`,
        `El ciclo "${ciclo.id}" declara el cultivo "${ciclo.cultivoId}" pero está anidado en "${cultivoId}".`
      );
    }

    validarVentanaSiembra(
      ciclo.ventanaSiembra,
      `${rutaCiclo}.ventanaSiembra`,
      errores
    );

    validarDuracionMeses(
      ciclo.duracionMeses,
      `${rutaCiclo}.duracionMeses`,
      errores
    );

    // D17: Validación de duración en días.
    validarDuracionDias(
      ciclo.duracionDias,
      `${rutaCiclo}.duracionDias`,
      errores
    );

    validarReferenciaFuente(
      ciclo.fuenteId,
      `${rutaCiclo}.fuenteId`,
      fuentesPorId,
      errores
    );
  });
}

function validarVentanaSiembra(ventana, ruta, errores) {
  if (!validarObjetoRequerido(ventana, ruta, errores)) {
    return;
  }

  validarMes(
    ventana.inicioMes,
    `${ruta}.inicioMes`,
    errores
  );

  validarMes(
    ventana.finMes,
    `${ruta}.finMes`,
    errores
  );
}

function validarMes(valor, ruta, errores) {
  if (valor === undefined || valor === null) {
    agregarError(
      errores,
      CODIGOS_ERROR_CATALOGO.CAMPO_REQUERIDO,
      ruta,
      'El mes es obligatorio.'
    );
    return;
  }

  if (
    typeof valor !== 'number' ||
    !Number.isInteger(valor) ||
    valor < 1 ||
    valor > 12
  ) {
    agregarError(
      errores,
      CODIGOS_ERROR_CATALOGO.MES_FUERA_DE_RANGO,
      ruta,
      'El mes debe ser un entero entre 1 y 12.'
    );
  }
}

function validarDuracionMeses(valor, ruta, errores) {
  if (valor === undefined) {
    agregarError(
      errores,
      CODIGOS_ERROR_CATALOGO.CAMPO_REQUERIDO,
      ruta,
      'La duración en meses es obligatoria; use null si no se conoce.'
    );
    return;
  }

  if (valor === null) {
    return;
  }

  if (
    typeof valor !== 'number' ||
    !Number.isFinite(valor)
  ) {
    agregarError(
      errores,
      CODIGOS_ERROR_CATALOGO.TIPO_INVALIDO,
      ruta,
      'La duración en meses debe ser un número finito o null.'
    );
  }
}

// D17: Duración en días.
// null significa duración pendiente de validación.
// El campo omitido se permite por compatibilidad heredada.
function validarDuracionDias(valor, ruta, errores) {
  if (valor === undefined || valor === null) {
    return;
  }

  if (!esObjetoPlano(valor)) {
    agregarError(
      errores,
      CODIGOS_ERROR_CATALOGO.TIPO_INVALIDO,
      ruta,
      'La duración en días debe ser null o un objeto { min, max }.'
    );
    return;
  }

  const { min, max } = valor;

  if (
    !Number.isInteger(min) ||
    !Number.isInteger(max)
  ) {
    agregarError(
      errores,
      CODIGOS_ERROR_CATALOGO.RANGO_INVALIDO,
      ruta,
      'Los límites min y max deben ser números enteros.'
    );
    return;
  }

  if (min < 1) {
    agregarError(
      errores,
      CODIGOS_ERROR_CATALOGO.RANGO_INVALIDO,
      ruta,
      'La duración mínima debe ser mayor o igual a 1 día.'
    );
    return;
  }

  if (max < min) {
    agregarError(
      errores,
      CODIGOS_ERROR_CATALOGO.RANGO_INVALIDO,
      ruta,
      'La duración máxima no puede ser menor que la mínima.'
    );
  }
}

function validarEstrategias(
  estrategias,
  fuentesPorId,
  cultivosPorId,
  ciclosPorId,
  errores
) {
  if (estrategias === undefined || estrategias === null) {
    agregarError(
      errores,
      CODIGOS_ERROR_CATALOGO.CAMPO_REQUERIDO,
      'estrategias',
      'La lista de estrategias es obligatoria.'
    );
    return;
  }

  if (!Array.isArray(estrategias)) {
    agregarError(
      errores,
      CODIGOS_ERROR_CATALOGO.TIPO_INVALIDO,
      'estrategias',
      'La lista de estrategias debe ser un array.'
    );
    return;
  }

  const estrategiasPorId = new Set();

  estrategias.forEach((estrategia, indice) => {
    const ruta = `estrategias[${indice}]`;

    if (!esObjetoPlano(estrategia)) {
      agregarError(
        errores,
        CODIGOS_ERROR_CATALOGO.TIPO_INVALIDO,
        ruta,
        'Cada estrategia debe ser un objeto plano.'
      );
      return;
    }

    if (validarTextoRequerido(
      estrategia.id,
      `${ruta}.id`,
      errores
    )) {
      if (estrategiasPorId.has(estrategia.id)) {
        agregarError(
          errores,
          CODIGOS_ERROR_CATALOGO.IDENTIFICADOR_DUPLICADO,
          `${ruta}.id`,
          `El identificador de estrategia "${estrategia.id}" está duplicado.`
        );
      } else {
        estrategiasPorId.add(estrategia.id);
      }
    }

    validarTextoRequerido(
      estrategia.nombre,
      `${ruta}.nombre`,
      errores
    );

    validarTextoOpcional(
      estrategia.descripcion,
      `${ruta}.descripcion`,
      errores
    );

    validarReferenciaFuente(
      estrategia.fuenteId,
      `${ruta}.fuenteId`,
      fuentesPorId,
      errores
    );

    validarPasos(
      estrategia.pasos,
      ruta,
      cultivosPorId,
      ciclosPorId,
      errores
    );

    validarParametrosPuntuacion(
      estrategia.parametrosPuntuacion,
      ruta,
      fuentesPorId,
      errores
    );
  });
}

function validarPasos(
  pasos,
  rutaEstrategia,
  cultivosPorId,
  ciclosPorId,
  errores
) {
  const ruta = `${rutaEstrategia}.pasos`;

  if (pasos === undefined || pasos === null) {
    agregarError(
      errores,
      CODIGOS_ERROR_CATALOGO.CAMPO_REQUERIDO,
      ruta,
      'La lista de pasos es obligatoria.'
    );
    return;
  }

  if (!Array.isArray(pasos)) {
    agregarError(
      errores,
      CODIGOS_ERROR_CATALOGO.PASOS_INVALIDOS,
      ruta,
      'Los pasos deben ser un array.'
    );
    return;
  }

  if (pasos.length !== 2) {
    agregarError(
      errores,
      CODIGOS_ERROR_CATALOGO.PASOS_INVALIDOS,
      ruta,
      `La estrategia debe tener exactamente dos pasos y tiene ${pasos.length}.`
    );
  }

  pasos.forEach((paso, indice) => {
    const rutaPaso = `${ruta}[${indice}]`;

    if (!esObjetoPlano(paso)) {
      agregarError(
        errores,
        CODIGOS_ERROR_CATALOGO.TIPO_INVALIDO,
        rutaPaso,
        'Cada paso debe ser un objeto plano.'
      );
      return;
    }

    if (
      !Number.isInteger(paso.orden) ||
      paso.orden !== indice + 1
    ) {
      agregarError(
        errores,
        CODIGOS_ERROR_CATALOGO.ORDEN_INVALIDO,
        `${rutaPaso}.orden`,
        `El paso en la posición ${indice + 1} debe tener orden ${indice + 1}.`
      );
    }

    const cultivoIdValido = validarTextoRequerido(
      paso.cultivoId,
      `${rutaPaso}.cultivoId`,
      errores
    );

    const cultivoExiste =
      cultivoIdValido &&
      cultivosPorId.has(paso.cultivoId);

    if (cultivoIdValido && !cultivoExiste) {
      agregarError(
        errores,
        CODIGOS_ERROR_CATALOGO.CULTIVO_NO_ENCONTRADO,
        `${rutaPaso}.cultivoId`,
        `No existe un cultivo con id "${paso.cultivoId}".`
      );
    }

    const cicloIdValido = validarTextoRequerido(
      paso.cicloId,
      `${rutaPaso}.cicloId`,
      errores
    );

    if (!cicloIdValido) {
      return;
    }

    const ciclo = ciclosPorId.get(paso.cicloId);

    if (ciclo === undefined) {
      agregarError(
        errores,
        CODIGOS_ERROR_CATALOGO.CICLO_NO_ENCONTRADO,
        `${rutaPaso}.cicloId`,
        `No existe un ciclo con id "${paso.cicloId}".`
      );
      return;
    }

    if (
      cultivoExiste &&
      ciclo.cultivoId !== paso.cultivoId
    ) {
      agregarError(
        errores,
        CODIGOS_ERROR_CATALOGO.CICLO_NO_PERTENECE_AL_CULTIVO,
        `${rutaPaso}.cicloId`,
        `El ciclo "${paso.cicloId}" pertenece a "${ciclo.cultivoId}" y no a "${paso.cultivoId}".`
      );
    }
  });
}

function validarParametrosPuntuacion(
  parametros,
  rutaEstrategia,
  fuentesPorId,
  errores
) {
  const ruta = `${rutaEstrategia}.parametrosPuntuacion`;

  if (parametros === undefined || parametros === null) {
    agregarError(
      errores,
      CODIGOS_ERROR_CATALOGO.CAMPO_REQUERIDO,
      ruta,
      'La lista de parámetros de puntuación es obligatoria.'
    );
    return;
  }

  if (!Array.isArray(parametros)) {
    agregarError(
      errores,
      CODIGOS_ERROR_CATALOGO.TIPO_INVALIDO,
      ruta,
      'Los parámetros de puntuación deben ser un array.'
    );
    return;
  }

  const parametrosPorId = new Set();

  parametros.forEach((parametro, indice) => {
    const rutaParametro = `${ruta}[${indice}]`;

    if (!esObjetoPlano(parametro)) {
      agregarError(
        errores,
        CODIGOS_ERROR_CATALOGO.TIPO_INVALIDO,
        rutaParametro,
        'Cada parámetro de puntuación debe ser un objeto plano.'
      );
      return;
    }

    if (validarTextoRequerido(
      parametro.id,
      `${rutaParametro}.id`,
      errores
    )) {
      if (parametrosPorId.has(parametro.id)) {
        agregarError(
          errores,
          CODIGOS_ERROR_CATALOGO.IDENTIFICADOR_DUPLICADO,
          `${rutaParametro}.id`,
          `El identificador de parámetro "${parametro.id}" está duplicado dentro de la estrategia.`
        );
      } else {
        parametrosPorId.add(parametro.id);
      }
    }

    if (!Object.hasOwn(parametro, 'valor')) {
      agregarError(
        errores,
        CODIGOS_ERROR_CATALOGO.PARAMETRO_INCOMPLETO,
        `${rutaParametro}.valor`,
        'El valor del parámetro es obligatorio.'
      );
    } else if (
      typeof parametro.valor !== 'number' ||
      !Number.isFinite(parametro.valor)
    ) {
      agregarError(
        errores,
        CODIGOS_ERROR_CATALOGO.VALOR_NO_FINITO,
        `${rutaParametro}.valor`,
        'El valor del parámetro debe ser un número finito.'
      );
    }

    if (!esCadenaNoVacia(parametro.unidad)) {
      agregarError(
        errores,
        CODIGOS_ERROR_CATALOGO.PARAMETRO_INCOMPLETO,
        `${rutaParametro}.unidad`,
        'La unidad del parámetro es obligatoria y debe ser un string no vacío.'
      );
    }

    if (!esCadenaNoVacia(parametro.fuenteId)) {
      agregarError(
        errores,
        CODIGOS_ERROR_CATALOGO.PARAMETRO_INCOMPLETO,
        `${rutaParametro}.fuenteId`,
        'La fuente del parámetro es obligatoria y debe ser un string no vacío.'
      );
    } else if (!fuentesPorId.has(parametro.fuenteId)) {
      agregarError(
        errores,
        CODIGOS_ERROR_CATALOGO.FUENTE_NO_ENCONTRADA,
        `${rutaParametro}.fuenteId`,
        `No existe una fuente con id "${parametro.fuenteId}".`
      );
    }

    if (
      parametro.notas !== undefined &&
      parametro.notas !== null &&
      typeof parametro.notas !== 'string'
    ) {
      agregarError(
        errores,
        CODIGOS_ERROR_CATALOGO.TIPO_INVALIDO,
        `${rutaParametro}.notas`,
        'Las notas del parámetro deben ser un string o null.'
      );
    }
  });
}

function validarOpcionesFinca(opcionesFinca, errores) {
  if (opcionesFinca === undefined || opcionesFinca === null) {
    return;
  }

  if (!esObjetoPlano(opcionesFinca)) {
    agregarError(
      errores,
      CODIGOS_ERROR_CATALOGO.TIPO_INVALIDO,
      'opcionesFinca',
      'Las opciones de finca deben ser un objeto plano.'
    );
    return;
  }

  for (const clave of CLAVES_OPCIONES_FINCA) {
    if (!Object.hasOwn(opcionesFinca, clave)) {
      continue;
    }

    validarListaOpciones(
      opcionesFinca[clave],
      `opcionesFinca.${clave}`,
      clave,
      errores
    );
  }
}

function validarListaOpciones(
  lista,
  ruta,
  clave,
  errores
) {
  if (!Array.isArray(lista)) {
    agregarError(
      errores,
      CODIGOS_ERROR_CATALOGO.TIPO_INVALIDO,
      ruta,
      'La lista de opciones debe ser un array.'
    );
    return;
  }

  const valores = new Set();

  lista.forEach((opcion, indice) => {
    const rutaOpcion = `${ruta}[${indice}]`;

    if (!esObjetoPlano(opcion)) {
      agregarError(
        errores,
        CODIGOS_ERROR_CATALOGO.OPCION_INVALIDA,
        rutaOpcion,
        'Cada opción debe ser un objeto plano.'
      );
      return;
    }

    if (clave === 'mesInicio') {
      validarMes(
        opcion.valor,
        `${rutaOpcion}.valor`,
        errores
      );

      if (
        Number.isInteger(opcion.valor) &&
        opcion.valor >= 1 &&
        opcion.valor <= 12
      ) {
        if (valores.has(opcion.valor)) {
          agregarError(
            errores,
            CODIGOS_ERROR_CATALOGO.VALOR_DUPLICADO,
            `${rutaOpcion}.valor`,
            `El valor de opción "${opcion.valor}" está duplicado.`
          );
        } else {
          valores.add(opcion.valor);
        }
      }
    } else if (!esCadenaNoVacia(opcion.valor)) {
      agregarError(
        errores,
        CODIGOS_ERROR_CATALOGO.OPCION_INVALIDA,
        `${rutaOpcion}.valor`,
        'El valor de la opción debe ser un string no vacío.'
      );
    } else {
      if (
        clave === 'prioridad' &&
        !PRIORIDADES_APROBADAS.has(opcion.valor)
      ) {
        agregarError(
          errores,
          CODIGOS_ERROR_CATALOGO.OPCION_INVALIDA,
          `${rutaOpcion}.valor`,
          `La prioridad "${opcion.valor}" no pertenece al vocabulario aprobado.`
        );
      }

      if (valores.has(opcion.valor)) {
        agregarError(
          errores,
          CODIGOS_ERROR_CATALOGO.VALOR_DUPLICADO,
          `${rutaOpcion}.valor`,
          `El valor de opción "${opcion.valor}" está duplicado.`
        );
      } else {
        valores.add(opcion.valor);
      }
    }

    if (!esCadenaNoVacia(opcion.etiqueta)) {
      agregarError(
        errores,
        CODIGOS_ERROR_CATALOGO.OPCION_INVALIDA,
        `${rutaOpcion}.etiqueta`,
        'La etiqueta de la opción debe ser un string no vacío.'
      );
    }
  });
}

function validarReferenciaFuente(
  fuenteId,
  ruta,
  fuentesPorId,
  errores
) {
  if (!validarTextoRequerido(fuenteId, ruta, errores)) {
    return;
  }

  if (!fuentesPorId.has(fuenteId)) {
    agregarError(
      errores,
      CODIGOS_ERROR_CATALOGO.FUENTE_NO_ENCONTRADA,
      ruta,
      `No existe una fuente con id "${fuenteId}".`
    );
  }
}

function validarTextoRequerido(valor, ruta, errores) {
  if (valor === undefined || valor === null) {
    agregarError(
      errores,
      CODIGOS_ERROR_CATALOGO.CAMPO_REQUERIDO,
      ruta,
      'El campo es obligatorio.'
    );
    return false;
  }

  if (!esCadenaNoVacia(valor)) {
    agregarError(
      errores,
      CODIGOS_ERROR_CATALOGO.TIPO_INVALIDO,
      ruta,
      'El campo debe ser un string no vacío.'
    );
    return false;
  }

  return true;
}

function validarTextoOpcional(valor, ruta, errores) {
  if (valor === undefined || valor === null) {
    return;
  }

  if (typeof valor !== 'string') {
    agregarError(
      errores,
      CODIGOS_ERROR_CATALOGO.TIPO_INVALIDO,
      ruta,
      'El campo debe ser un string o null.'
    );
  }
}

function validarObjetoRequerido(valor, ruta, errores) {
  if (valor === undefined || valor === null) {
    agregarError(
      errores,
      CODIGOS_ERROR_CATALOGO.CAMPO_REQUERIDO,
      ruta,
      'El objeto es obligatorio.'
    );
    return false;
  }

  if (!esObjetoPlano(valor)) {
    agregarError(
      errores,
      CODIGOS_ERROR_CATALOGO.TIPO_INVALIDO,
      ruta,
      'El campo debe ser un objeto plano.'
    );
    return false;
  }

  return true;
}

function esObjetoPlano(valor) {
  if (
    typeof valor !== 'object' ||
    valor === null ||
    Array.isArray(valor)
  ) {
    return false;
  }

  const prototipo = Object.getPrototypeOf(valor);

  return (
    prototipo === Object.prototype ||
    prototipo === null
  );
}

function esCadenaNoVacia(valor) {
  return (
    typeof valor === 'string' &&
    valor.trim() !== ''
  );
}

function agregarError(errores, codigo, campo, motivo) {
  errores.push({
    codigo,
    campo,
    motivo,
  });
}
