export const VARIABLES_REQUERIDAS = Object.freeze([
  'precipitacion',
  'temperaturaMedia',
  'temperaturaMaxima',
]);

export const UNIDADES_REQUERIDAS = Object.freeze({
  precipitacion: 'mm',
  temperaturaMedia: '°C',
  temperaturaMaxima: '°C',
});

export const TOLERANCIA_PORCENTAJE = 0.01;

export const CODIGOS_ERROR_CLIMA = Object.freeze({
  ESTRUCTURA_INVALIDA: 'ESTRUCTURA_INVALIDA',
  CAMPO_REQUERIDO: 'CAMPO_REQUERIDO',
  TIPO_INVALIDO: 'TIPO_INVALIDO',
  COORDENADA_INVALIDA: 'COORDENADA_INVALIDA',
  RESOLUCION_INVALIDA: 'RESOLUCION_INVALIDA',
  FECHA_INVALIDA: 'FECHA_INVALIDA',
  PERIODO_INVALIDO: 'PERIODO_INVALIDO',
  PERIODO_INCONSISTENTE: 'PERIODO_INCONSISTENTE',
  UNIDAD_INVALIDA: 'UNIDAD_INVALIDA',
  PROCEDENCIA_INVALIDA: 'PROCEDENCIA_INVALIDA',
  PROCEDENCIA_INCONSISTENTE: 'PROCEDENCIA_INCONSISTENTE',
  FUENTE_NO_ENCONTRADA: 'FUENTE_NO_ENCONTRADA',
  FUENTE_DUPLICADA: 'FUENTE_DUPLICADA',
  ANTIGUEDAD_REQUERIDA: 'ANTIGUEDAD_REQUERIDA',
  URL_INVALIDA: 'URL_INVALIDA',
  FECHA_CONSULTA_INVALIDA: 'FECHA_CONSULTA_INVALIDA',
  SERIE_INVALIDA: 'SERIE_INVALIDA',
  SERIE_INCOMPLETA: 'SERIE_INCOMPLETA',
  SERIE_NO_CONTINUA: 'SERIE_NO_CONTINUA',
  SERIE_NO_CUBRE_PERIODO: 'SERIE_NO_CUBRE_PERIODO',
  SERIE_DESORDENADA: 'SERIE_DESORDENADA',
  FECHA_DUPLICADA: 'FECHA_DUPLICADA',
  VALOR_INVALIDO: 'VALOR_INVALIDO',
  VALOR_CENTINELA: 'VALOR_CENTINELA',
  COBERTURA_INVALIDA: 'COBERTURA_INVALIDA',
  COBERTURA_INCONSISTENTE: 'COBERTURA_INCONSISTENTE',
  FALTANTES_INCONSISTENTES: 'FALTANTES_INCONSISTENTES',
});

export function validarClima(clima) {
  const errores = [];

  if (!esObjetoPlano(clima)) {
    agregarError(
      errores,
      CODIGOS_ERROR_CLIMA.ESTRUCTURA_INVALIDA,
      'clima',
      'La entrada debe ser un objeto climático.'
    );

    return { valido: false, errores };
  }

  validarCoordenadas(clima.coordenadas, 'coordenadas', errores);
  const periodo = validarPeriodo(clima.periodo, 'periodo', errores);
  validarResolucion(clima.resolucion, errores);
  const fuentesPorId = validarFuentes(clima.fuentes, errores);
  validarVariables(clima.variables, periodo, fuentesPorId, errores);

  return { valido: errores.length === 0, errores };
}

function validarResolucion(resolucion, errores) {
  if (resolucion === undefined || resolucion === null) {
    agregarError(
      errores,
      CODIGOS_ERROR_CLIMA.CAMPO_REQUERIDO,
      'resolucion',
      'La resolución es obligatoria.'
    );
    return;
  }

  if (resolucion !== 'diaria') {
    agregarError(
      errores,
      CODIGOS_ERROR_CLIMA.RESOLUCION_INVALIDA,
      'resolucion',
      'La resolución debe ser "diaria".'
    );
  }
}

function validarCoordenadas(coordenadas, ruta, errores) {
  if (!validarObjetoRequerido(coordenadas, ruta, errores)) {
    return;
  }

  validarPuntoCoordenadas(coordenadas.solicitadas, `${ruta}.solicitadas`, errores);
  validarPuntoCoordenadas(coordenadas.devueltas, `${ruta}.devueltas`, errores);
}

function validarPuntoCoordenadas(punto, ruta, errores) {
  if (!validarObjetoRequerido(punto, ruta, errores)) {
    return;
  }

  validarNumeroEnRango(
    punto.latitude,
    `${ruta}.latitude`,
    -90,
    90,
    CODIGOS_ERROR_CLIMA.COORDENADA_INVALIDA,
    errores
  );
  validarNumeroEnRango(
    punto.longitude,
    `${ruta}.longitude`,
    -180,
    180,
    CODIGOS_ERROR_CLIMA.COORDENADA_INVALIDA,
    errores
  );
}

function validarPeriodo(periodo, ruta, errores, variable = null) {
  if (!validarObjetoRequerido(periodo, ruta, errores, variable)) {
    return null;
  }

  const inicio = validarFechaYyyymmdd(periodo.inicio, `${ruta}.inicio`, errores, variable);
  const fin = validarFechaYyyymmdd(periodo.fin, `${ruta}.fin`, errores, variable);

  if (inicio === null || fin === null) {
    return null;
  }

  if (inicio.dia > fin.dia) {
    agregarError(
      errores,
      CODIGOS_ERROR_CLIMA.PERIODO_INVALIDO,
      ruta,
      'La fecha de inicio debe ser anterior o igual a la fecha de fin.',
      variable
    );
    return null;
  }

  return {
    inicio: periodo.inicio,
    fin: periodo.fin,
    diaInicio: inicio.dia,
    diaFin: fin.dia,
    dias: fin.dia - inicio.dia + 1,
  };
}

function validarFuentes(fuentes, errores) {
  if (fuentes === undefined || fuentes === null) {
    agregarError(
      errores,
      CODIGOS_ERROR_CLIMA.CAMPO_REQUERIDO,
      'fuentes',
      'Las fuentes son obligatorias.'
    );
    return null;
  }

  if (!Array.isArray(fuentes)) {
    agregarError(
      errores,
      CODIGOS_ERROR_CLIMA.TIPO_INVALIDO,
      'fuentes',
      'Las fuentes deben ser un array.'
    );
    return null;
  }

  if (fuentes.length === 0) {
    agregarError(
      errores,
      CODIGOS_ERROR_CLIMA.CAMPO_REQUERIDO,
      'fuentes',
      'Debe existir al menos una fuente.'
    );
    return new Map();
  }

  const fuentesPorId = new Map();

  fuentes.forEach((fuente, indice) => {
    validarFuente(fuente, `fuentes[${indice}]`, fuentesPorId, errores);
  });

  return fuentesPorId;
}

function validarFuente(fuente, ruta, fuentesPorId, errores) {
  if (!esObjetoPlano(fuente)) {
    agregarError(
      errores,
      CODIGOS_ERROR_CLIMA.TIPO_INVALIDO,
      ruta,
      'Cada fuente debe ser un objeto.'
    );
    return;
  }

  if (validarTextoRequerido(fuente.id, `${ruta}.id`, errores)) {
    if (fuentesPorId.has(fuente.id)) {
      agregarError(
        errores,
        CODIGOS_ERROR_CLIMA.FUENTE_DUPLICADA,
        `${ruta}.id`,
        `El identificador de fuente "${fuente.id}" está duplicado.`
      );
    } else {
      fuentesPorId.set(fuente.id, fuente);
    }
  }

  validarTextoRequerido(fuente.proveedor, `${ruta}.proveedor`, errores);
  validarUrl(fuente.urlConsulta, `${ruta}.urlConsulta`, errores);
  validarPuntoCoordenadas(fuente.coordenadasSolicitadas, `${ruta}.coordenadasSolicitadas`, errores);
  validarPuntoCoordenadas(fuente.coordenadasDevueltas, `${ruta}.coordenadasDevueltas`, errores);
  validarPeriodo(fuente.periodo, `${ruta}.periodo`, errores);
  validarUnidadesFuente(fuente.unidades, `${ruta}.unidades`, errores);
  validarIso8601(fuente.fechaConsulta, `${ruta}.fechaConsulta`, errores);
  validarCoberturaFuente(fuente.cobertura, `${ruta}.cobertura`, errores);
  validarOrigenFuente(fuente, ruta, errores);
}

function validarUnidadesFuente(unidades, ruta, errores) {
  if (!validarObjetoRequerido(unidades, ruta, errores)) {
    return;
  }

  for (const variable of VARIABLES_REQUERIDAS) {
    if (unidades[variable] !== UNIDADES_REQUERIDAS[variable]) {
      agregarError(
        errores,
        CODIGOS_ERROR_CLIMA.UNIDAD_INVALIDA,
        `${ruta}.${variable}`,
        `La unidad debe ser "${UNIDADES_REQUERIDAS[variable]}".`,
        variable
      );
    }
  }
}

function validarCoberturaFuente(cobertura, ruta, errores) {
  if (!validarObjetoRequerido(cobertura, ruta, errores)) {
    return;
  }

  validarNumeroEnRango(
    cobertura.porcentaje,
    `${ruta}.porcentaje`,
    0,
    100,
    CODIGOS_ERROR_CLIMA.COBERTURA_INVALIDA,
    errores
  );
}

function validarOrigenFuente(fuente, ruta, errores) {
  const origenValido = fuente.origen === 'live' || fuente.origen === 'backup';

  if (!origenValido) {
    agregarError(
      errores,
      CODIGOS_ERROR_CLIMA.PROCEDENCIA_INVALIDA,
      `${ruta}.origen`,
      'El origen debe ser "live" o "backup".'
    );
  }

  if (fuente.origen === 'backup' && !esCadenaNoVacia(fuente.antiguedad)) {
    agregarError(
      errores,
      CODIGOS_ERROR_CLIMA.ANTIGUEDAD_REQUERIDA,
      `${ruta}.antiguedad`,
      'Una fuente de respaldo debe indicar su antigüedad.'
    );
  } else if (
    fuente.antiguedad !== undefined &&
    fuente.antiguedad !== null &&
    !esCadenaNoVacia(fuente.antiguedad)
  ) {
    agregarError(
      errores,
      CODIGOS_ERROR_CLIMA.TIPO_INVALIDO,
      `${ruta}.antiguedad`,
      'La antigüedad debe ser un string no vacío o null.'
    );
  }
}

function validarVariables(variables, periodoGlobal, fuentesPorId, errores) {
  if (!validarObjetoRequerido(variables, 'variables', errores)) {
    return;
  }

  for (const variable of VARIABLES_REQUERIDAS) {
    if (!Object.hasOwn(variables, variable)) {
      agregarError(
        errores,
        CODIGOS_ERROR_CLIMA.CAMPO_REQUERIDO,
        `variables.${variable}`,
        'La variable es obligatoria.',
        variable
      );
      continue;
    }

    validarVariable(variable, variables[variable], periodoGlobal, fuentesPorId, errores);
  }
}

function validarVariable(nombre, variable, periodoGlobal, fuentesPorId, errores) {
  const ruta = `variables.${nombre}`;

  if (!esObjetoPlano(variable)) {
    agregarError(
      errores,
      CODIGOS_ERROR_CLIMA.TIPO_INVALIDO,
      ruta,
      'La variable debe ser un objeto.',
      nombre
    );
    return;
  }

  if (variable.unidad !== UNIDADES_REQUERIDAS[nombre]) {
    agregarError(
      errores,
      CODIGOS_ERROR_CLIMA.UNIDAD_INVALIDA,
      `${ruta}.unidad`,
      `La unidad debe ser "${UNIDADES_REQUERIDAS[nombre]}".`,
      nombre
    );
  }

  const periodoVariable = validarPeriodo(variable.fechas, `${ruta}.fechas`, errores, nombre);

  if (
    periodoVariable !== null &&
    periodoGlobal !== null &&
    (periodoVariable.inicio !== periodoGlobal.inicio || periodoVariable.fin !== periodoGlobal.fin)
  ) {
    agregarError(
      errores,
      CODIGOS_ERROR_CLIMA.PERIODO_INCONSISTENTE,
      `${ruta}.fechas`,
      'Las fechas de la variable deben coincidir con el periodo global.',
      nombre
    );
  }

  const procedenciaValida = validarProcedencia(variable.procedencia, `${ruta}.procedencia`, errores, nombre);
  validarIso8601(variable.fechaConsulta, `${ruta}.fechaConsulta`, errores, nombre);

  if (validarTextoRequerido(variable.fuenteId, `${ruta}.fuenteId`, errores, nombre) && fuentesPorId !== null) {
    const fuente = fuentesPorId.get(variable.fuenteId);

    if (fuente === undefined) {
      agregarError(
        errores,
        CODIGOS_ERROR_CLIMA.FUENTE_NO_ENCONTRADA,
        `${ruta}.fuenteId`,
        `No existe una fuente con id "${variable.fuenteId}".`,
        nombre
      );
    } else if (
      procedenciaValida &&
      (fuente.origen === 'live' || fuente.origen === 'backup') &&
      variable.procedencia !== fuente.origen
    ) {
      agregarError(
        errores,
        CODIGOS_ERROR_CLIMA.PROCEDENCIA_INCONSISTENTE,
        `${ruta}.procedencia`,
        `La procedencia "${variable.procedencia}" no coincide con el origen "${fuente.origen}" de la fuente.`,
        nombre
      );
    }
  }

  const resultadoSerie = validarSerie(variable.serie, `${ruta}.serie`, periodoVariable, errores, nombre);
  validarCobertura(variable.cobertura, `${ruta}.cobertura`, periodoVariable, resultadoSerie, errores, nombre);
}

function validarProcedencia(procedencia, ruta, errores, variable) {
  if (procedencia === 'live' || procedencia === 'backup') {
    return true;
  }

  agregarError(
    errores,
    CODIGOS_ERROR_CLIMA.PROCEDENCIA_INVALIDA,
    ruta,
    'La procedencia debe ser "live" o "backup".',
    variable
  );
  return false;
}

function validarSerie(serie, ruta, periodo, errores, variable) {
  if (serie === undefined || serie === null) {
    agregarError(
      errores,
      CODIGOS_ERROR_CLIMA.CAMPO_REQUERIDO,
      ruta,
      'La serie diaria es obligatoria.',
      variable
    );
    return null;
  }

  if (!Array.isArray(serie)) {
    agregarError(
      errores,
      CODIGOS_ERROR_CLIMA.TIPO_INVALIDO,
      ruta,
      'La serie debe ser un array.',
      variable
    );
    return null;
  }

  if (serie.length === 0) {
    agregarError(
      errores,
      CODIGOS_ERROR_CLIMA.SERIE_INVALIDA,
      ruta,
      'La serie no puede estar vacía.',
      variable
    );
    return null;
  }

  let estructuraValida = true;
  let fechasValidas = true;
  let valoresValidos = true;
  let secuenciaValida = true;
  let cubrePeriodo = true;
  let diaAnterior = null;
  let primerDia = null;
  let ultimoDia = null;
  let presentes = 0;

  const fechasVistas = new Set();
  const fechasNulas = [];

  serie.forEach((item, indice) => {
    const rutaItem = `${ruta}[${indice}]`;

    if (!esObjetoPlano(item)) {
      agregarError(
        errores,
        CODIGOS_ERROR_CLIMA.SERIE_INVALIDA,
        rutaItem,
        'Cada elemento debe ser un objeto { fecha, valor }.',
        variable
      );
      estructuraValida = false;
      fechasValidas = false;
      valoresValidos = false;
      return;
    }

    const fecha = validarFechaYyyymmdd(item.fecha, `${rutaItem}.fecha`, errores, variable);

    if (fecha === null) {
      fechasValidas = false;
    } else if (fechasVistas.has(fecha.texto)) {
      agregarError(
        errores,
        CODIGOS_ERROR_CLIMA.FECHA_DUPLICADA,
        `${rutaItem}.fecha`,
        `La fecha "${fecha.texto}" está duplicada.`,
        variable
      );
      secuenciaValida = false;
    } else {
      fechasVistas.add(fecha.texto);

      if (diaAnterior !== null) {
        if (fecha.dia <= diaAnterior) {
          agregarError(
            errores,
            CODIGOS_ERROR_CLIMA.SERIE_DESORDENADA,
            `${rutaItem}.fecha`,
            'Las fechas de la serie deben estar en orden cronológico ascendente.',
            variable
          );
          secuenciaValida = false;
        } else if (fecha.dia !== diaAnterior + 1) {
          agregarError(
            errores,
            CODIGOS_ERROR_CLIMA.SERIE_NO_CONTINUA,
            `${rutaItem}.fecha`,
            'La serie debe contener todos los días consecutivos del periodo.',
            variable
          );
          secuenciaValida = false;
        }
      }

      diaAnterior = fecha.dia;

      if (primerDia === null) {
        primerDia = fecha.dia;
      }

      ultimoDia = fecha.dia;
    }

    if (!Object.hasOwn(item, 'valor')) {
      agregarError(
        errores,
        CODIGOS_ERROR_CLIMA.CAMPO_REQUERIDO,
        `${rutaItem}.valor`,
        'El valor es obligatorio; use null cuando falte el dato.',
        variable
      );
      valoresValidos = false;
      return;
    }

    const valor = item.valor;

    if (valor === null) {
      if (fecha !== null) {
        fechasNulas.push(fecha.texto);
      }
      return;
    }

    if (typeof valor !== 'number' || !Number.isFinite(valor)) {
      agregarError(
        errores,
        CODIGOS_ERROR_CLIMA.VALOR_INVALIDO,
        `${rutaItem}.valor`,
        'El valor debe ser un número finito o null.',
        variable
      );
      valoresValidos = false;
      return;
    }

    if (valor === -999) {
      agregarError(
        errores,
        CODIGOS_ERROR_CLIMA.VALOR_CENTINELA,
        `${rutaItem}.valor`,
        'El valor -999 es un marcador de ausencia; use null.',
        variable
      );
      valoresValidos = false;
      return;
    }

    presentes += 1;
  });

  if (fechasValidas && periodo !== null) {
    if (primerDia !== periodo.diaInicio) {
      agregarError(
        errores,
        CODIGOS_ERROR_CLIMA.SERIE_NO_CUBRE_PERIODO,
        `${ruta}[0].fecha`,
        `La serie debe iniciar en "${periodo.inicio}".`,
        variable
      );
      cubrePeriodo = false;
    }

    if (ultimoDia !== periodo.diaFin) {
      agregarError(
        errores,
        CODIGOS_ERROR_CLIMA.SERIE_NO_CUBRE_PERIODO,
        `${ruta}[${serie.length - 1}].fecha`,
        `La serie debe terminar en "${periodo.fin}".`,
        variable
      );
      cubrePeriodo = false;
    }

    if (serie.length !== periodo.dias) {
      agregarError(
        errores,
        CODIGOS_ERROR_CLIMA.SERIE_INCOMPLETA,
        ruta,
        `La serie debe contener ${periodo.dias} días y contiene ${serie.length}.`,
        variable
      );
      cubrePeriodo = false;
    }
  }

  return {
    evaluable:
      estructuraValida &&
      fechasValidas &&
      valoresValidos &&
      secuenciaValida &&
      cubrePeriodo &&
      periodo !== null,
    presentes,
    fechasNulas,
  };
}

function validarCobertura(cobertura, ruta, periodo, resultadoSerie, errores, variable) {
  if (!validarObjetoRequerido(cobertura, ruta, errores, variable)) {
    return;
  }

  const diasEsperadosValido = validarEnteroNoNegativo(
    cobertura.diasEsperados,
    `${ruta}.diasEsperados`,
    1,
    errores,
    variable
  );
  const diasPresentesValido = validarEnteroNoNegativo(
    cobertura.diasPresentes,
    `${ruta}.diasPresentes`,
    0,
    errores,
    variable
  );

  if (diasEsperadosValido && periodo !== null && cobertura.diasEsperados !== periodo.dias) {
    agregarError(
      errores,
      CODIGOS_ERROR_CLIMA.COBERTURA_INCONSISTENTE,
      `${ruta}.diasEsperados`,
      `Debe ser ${periodo.dias} según las fechas de la variable.`,
      variable
    );
  }

  if (
    diasEsperadosValido &&
    diasPresentesValido &&
    cobertura.diasPresentes > cobertura.diasEsperados
  ) {
    agregarError(
      errores,
      CODIGOS_ERROR_CLIMA.COBERTURA_INCONSISTENTE,
      `${ruta}.diasPresentes`,
      'No puede superar diasEsperados.',
      variable
    );
  }

  if (
    resultadoSerie !== null &&
    resultadoSerie.evaluable &&
    diasPresentesValido &&
    cobertura.diasPresentes !== resultadoSerie.presentes
  ) {
    agregarError(
      errores,
      CODIGOS_ERROR_CLIMA.COBERTURA_INCONSISTENTE,
      `${ruta}.diasPresentes`,
      `Debe ser ${resultadoSerie.presentes} según los valores no nulos de la serie.`,
      variable
    );
  }

  const porcentajeValido = validarNumeroEnRango(
    cobertura.porcentaje,
    `${ruta}.porcentaje`,
    0,
    100,
    CODIGOS_ERROR_CLIMA.COBERTURA_INVALIDA,
    errores,
    variable
  );

  if (
    porcentajeValido &&
    diasEsperadosValido &&
    diasPresentesValido &&
    cobertura.diasEsperados > 0
  ) {
    const esperado = (cobertura.diasPresentes / cobertura.diasEsperados) * 100;

    if (Math.abs(cobertura.porcentaje - esperado) > TOLERANCIA_PORCENTAJE) {
      agregarError(
        errores,
        CODIGOS_ERROR_CLIMA.COBERTURA_INCONSISTENTE,
        `${ruta}.porcentaje`,
        `Debe ser aproximadamente ${redondear(esperado)}% según los días declarados.`,
        variable
      );
    }
  }

  validarFaltantes(cobertura.faltantes, `${ruta}.faltantes`, periodo, resultadoSerie, errores, variable);
}

function validarFaltantes(faltantes, ruta, periodo, resultadoSerie, errores, variable) {
  if (faltantes === undefined || faltantes === null) {
    agregarError(
      errores,
      CODIGOS_ERROR_CLIMA.CAMPO_REQUERIDO,
      ruta,
      'Las fechas faltantes son obligatorias; use [] si no hay ninguna.',
      variable
    );
    return;
  }

  if (!Array.isArray(faltantes)) {
    agregarError(
      errores,
      CODIGOS_ERROR_CLIMA.COBERTURA_INVALIDA,
      ruta,
      'Las fechas faltantes deben ser un array de fechas YYYYMMDD.',
      variable
    );
    return;
  }

  const fechasVistas = new Set();
  let fechasValidas = true;

  faltantes.forEach((valor, indice) => {
    const fecha = validarFechaYyyymmdd(valor, `${ruta}[${indice}]`, errores, variable);

    if (fecha === null) {
      fechasValidas = false;
      return;
    }

    if (fechasVistas.has(fecha.texto)) {
      agregarError(
        errores,
        CODIGOS_ERROR_CLIMA.COBERTURA_INCONSISTENTE,
        `${ruta}[${indice}]`,
        `La fecha "${fecha.texto}" está duplicada.`,
        variable
      );
      fechasValidas = false;
      return;
    }

    fechasVistas.add(fecha.texto);

    if (periodo !== null && (fecha.dia < periodo.diaInicio || fecha.dia > periodo.diaFin)) {
      agregarError(
        errores,
        CODIGOS_ERROR_CLIMA.COBERTURA_INCONSISTENTE,
        `${ruta}[${indice}]`,
        'La fecha está fuera del periodo declarado.',
        variable
      );
      fechasValidas = false;
    }
  });

  if (!fechasValidas || resultadoSerie === null || !resultadoSerie.evaluable) {
    return;
  }

  const fechasNulas = new Set(resultadoSerie.fechasNulas);
  const conjuntosCoinciden =
    fechasVistas.size === fechasNulas.size &&
    [...fechasVistas].every((fecha) => fechasNulas.has(fecha));

  if (!conjuntosCoinciden) {
    agregarError(
      errores,
      CODIGOS_ERROR_CLIMA.FALTANTES_INCONSISTENTES,
      ruta,
      'Debe coincidir exactamente con las fechas de valor null de la serie.',
      variable
    );
  }
}

function validarEnteroNoNegativo(valor, ruta, minimo, errores, variable) {
  if (!validarNumeroFinito(valor, ruta, errores, variable)) {
    return false;
  }

  if (!Number.isInteger(valor) || valor < minimo) {
    agregarError(
      errores,
      CODIGOS_ERROR_CLIMA.COBERTURA_INVALIDA,
      ruta,
      `Debe ser un entero mayor o igual a ${minimo}.`,
      variable
    );
    return false;
  }

  return true;
}

function validarNumeroEnRango(valor, ruta, minimo, maximo, codigo, errores, variable = null) {
  if (!validarNumeroFinito(valor, ruta, errores, variable)) {
    return false;
  }

  if (valor < minimo || valor > maximo) {
    agregarError(
      errores,
      codigo,
      ruta,
      `Debe estar entre ${minimo} y ${maximo}.`,
      variable
    );
    return false;
  }

  return true;
}

function validarNumeroFinito(valor, ruta, errores, variable = null) {
  if (valor === undefined || valor === null) {
    agregarError(
      errores,
      CODIGOS_ERROR_CLIMA.CAMPO_REQUERIDO,
      ruta,
      'El campo es obligatorio.',
      variable
    );
    return false;
  }

  if (typeof valor !== 'number' || !Number.isFinite(valor)) {
    agregarError(
      errores,
      CODIGOS_ERROR_CLIMA.TIPO_INVALIDO,
      ruta,
      'Debe ser un número finito.',
      variable
    );
    return false;
  }

  return true;
}

function validarTextoRequerido(valor, ruta, errores, variable = null) {
  if (valor === undefined || valor === null) {
    agregarError(
      errores,
      CODIGOS_ERROR_CLIMA.CAMPO_REQUERIDO,
      ruta,
      'El campo es obligatorio.',
      variable
    );
    return false;
  }

  if (!esCadenaNoVacia(valor)) {
    agregarError(
      errores,
      CODIGOS_ERROR_CLIMA.TIPO_INVALIDO,
      ruta,
      'Debe ser un string no vacío.',
      variable
    );
    return false;
  }

  return true;
}

function validarObjetoRequerido(valor, ruta, errores, variable = null) {
  if (valor === undefined || valor === null) {
    agregarError(
      errores,
      CODIGOS_ERROR_CLIMA.CAMPO_REQUERIDO,
      ruta,
      'El objeto es obligatorio.',
      variable
    );
    return false;
  }

  if (!esObjetoPlano(valor)) {
    agregarError(
      errores,
      CODIGOS_ERROR_CLIMA.TIPO_INVALIDO,
      ruta,
      'Debe ser un objeto.',
      variable
    );
    return false;
  }

  return true;
}

function validarUrl(valor, ruta, errores, variable = null) {
  if (valor === undefined || valor === null) {
    agregarError(
      errores,
      CODIGOS_ERROR_CLIMA.CAMPO_REQUERIDO,
      ruta,
      'La URL de consulta es obligatoria.',
      variable
    );
    return;
  }

  if (!esCadenaNoVacia(valor)) {
    agregarError(
      errores,
      CODIGOS_ERROR_CLIMA.URL_INVALIDA,
      ruta,
      'La URL de consulta debe ser un string no vacío.',
      variable
    );
    return;
  }

  let url;

  try {
    url = new URL(valor);
  } catch {
    agregarError(
      errores,
      CODIGOS_ERROR_CLIMA.URL_INVALIDA,
      ruta,
      'La URL de consulta no es válida.',
      variable
    );
    return;
  }

  if (
    (url.protocol !== 'http:' && url.protocol !== 'https:') ||
    url.username !== '' ||
    url.password !== ''
  ) {
    agregarError(
      errores,
      CODIGOS_ERROR_CLIMA.URL_INVALIDA,
      ruta,
      'La URL debe usar http o https y no incluir credenciales.',
      variable
    );
  }
}

function validarIso8601(valor, ruta, errores, variable = null) {
  if (valor === undefined || valor === null) {
    agregarError(
      errores,
      CODIGOS_ERROR_CLIMA.CAMPO_REQUERIDO,
      ruta,
      'La fecha de consulta es obligatoria.',
      variable
    );
    return;
  }

  if (!esIso8601(valor)) {
    agregarError(
      errores,
      CODIGOS_ERROR_CLIMA.FECHA_CONSULTA_INVALIDA,
      ruta,
      'Debe ser una fecha ISO-8601 válida.',
      variable
    );
  }
}

function validarFechaYyyymmdd(valor, ruta, errores, variable = null) {
  if (valor === undefined || valor === null) {
    agregarError(
      errores,
      CODIGOS_ERROR_CLIMA.CAMPO_REQUERIDO,
      ruta,
      'La fecha es obligatoria.',
      variable
    );
    return null;
  }

  if (typeof valor !== 'string') {
    agregarError(
      errores,
      CODIGOS_ERROR_CLIMA.FECHA_INVALIDA,
      ruta,
      'La fecha debe ser un string en formato YYYYMMDD.',
      variable
    );
    return null;
  }

  const fecha = parsearFechaYyyymmdd(valor);

  if (fecha === null) {
    agregarError(
      errores,
      CODIGOS_ERROR_CLIMA.FECHA_INVALIDA,
      ruta,
      'La fecha debe ser real y usar el formato YYYYMMDD.',
      variable
    );
    return null;
  }

  return fecha;
}

function parsearFechaYyyymmdd(texto) {
  if (typeof texto !== 'string' || !/^\d{8}$/.test(texto)) {
    return null;
  }

  const anio = Number(texto.slice(0, 4));
  const mes = Number(texto.slice(4, 6));
  const dia = Number(texto.slice(6, 8));

  if (anio < 1 || mes < 1 || mes > 12 || dia < 1 || dia > 31) {
    return null;
  }

  const fecha = new Date(0);
  fecha.setUTCHours(0, 0, 0, 0);
  fecha.setUTCFullYear(anio, mes - 1, dia);

  if (
    fecha.getUTCFullYear() !== anio ||
    fecha.getUTCMonth() !== mes - 1 ||
    fecha.getUTCDate() !== dia
  ) {
    return null;
  }

  return {
    texto,
    dia: Math.floor(fecha.getTime() / 86400000),
  };
}

function esIso8601(valor) {
  if (typeof valor !== 'string') {
    return false;
  }

  const coincidencia =
    /^(\d{4})-(\d{2})-(\d{2})(?:T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)?)?$/.exec(
      valor
    );

  if (coincidencia === null) {
    return false;
  }

  return parsearFechaYyyymmdd(`${coincidencia[1]}${coincidencia[2]}${coincidencia[3]}`) !== null;
}

function esObjetoPlano(valor) {
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) {
    return false;
  }

  const prototipo = Object.getPrototypeOf(valor);

  return prototipo === Object.prototype || prototipo === null;
}

function esCadenaNoVacia(valor) {
  return typeof valor === 'string' && valor.trim() !== '';
}

function redondear(valor) {
  return Math.round(valor * 100) / 100;
}

function agregarError(errores, codigo, campo, motivo, variable = null) {
  errores.push({ codigo, variable, campo, motivo });
}
