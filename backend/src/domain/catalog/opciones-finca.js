export const ESTADOS_OPCIONES_FINCA = Object.freeze({
  DISPONIBLE: 'disponible',
  VALIDO: 'valido',
  NO_PERTENECE: 'no_pertenece',
  OPCIONES_NO_DISPONIBLES: 'opciones_no_disponibles',
  CLAVE_NO_DECLARADA: 'clave_no_declarada',
  ESTRUCTURA_INVALIDA: 'estructura_invalida',
  ENTRADA_INVALIDA: 'entrada_invalida',
});

export function obtenerOpcionesFinca(catalogo, clave) {
  const resultadoBase = {
    disponible: false,
    clave: esCadenaNoVacia(clave) ? clave : null,
    opciones: [],
    estado: ESTADOS_OPCIONES_FINCA.ENTRADA_INVALIDA,
    motivo: null,
  };

  if (!esObjetoPlano(catalogo)) {
    return {
      ...resultadoBase,
      motivo: 'El catálogo debe ser un objeto plano.',
    };
  }

  if (!esCadenaNoVacia(clave)) {
    return {
      ...resultadoBase,
      motivo: 'La clave de opciones de finca debe ser un string no vacío.',
    };
  }

  if (catalogo.opcionesFinca === undefined || catalogo.opcionesFinca === null) {
    return {
      ...resultadoBase,
      estado: ESTADOS_OPCIONES_FINCA.OPCIONES_NO_DISPONIBLES,
      motivo: 'El catálogo no declara opcionesFinca.',
    };
  }

  if (!esObjetoPlano(catalogo.opcionesFinca)) {
    return {
      ...resultadoBase,
      estado: ESTADOS_OPCIONES_FINCA.ESTRUCTURA_INVALIDA,
      motivo: 'opcionesFinca debe ser un objeto plano.',
    };
  }

  if (!Object.hasOwn(catalogo.opcionesFinca, clave)) {
    return {
      ...resultadoBase,
      estado: ESTADOS_OPCIONES_FINCA.CLAVE_NO_DECLARADA,
      motivo: `El catálogo no declara opciones para "${clave}".`,
    };
  }

  const lista = catalogo.opcionesFinca[clave];

  if (!Array.isArray(lista)) {
    return {
      ...resultadoBase,
      estado: ESTADOS_OPCIONES_FINCA.ESTRUCTURA_INVALIDA,
      motivo: `opcionesFinca.${clave} debe ser un array.`,
    };
  }

  const opciones = [];

  for (let indice = 0; indice < lista.length; indice += 1) {
    const opcion = lista[indice];

    if (!esOpcionEstructuralmenteValida(opcion)) {
      return {
        ...resultadoBase,
        estado: ESTADOS_OPCIONES_FINCA.ESTRUCTURA_INVALIDA,
        motivo: `opcionesFinca.${clave}[${indice}] debe contener { valor, etiqueta } con valor no nulo y etiqueta no vacía.`,
      };
    }

    opciones.push({
      valor: opcion.valor,
      etiqueta: opcion.etiqueta,
    });
  }

  return {
    disponible: true,
    clave,
    opciones,
    estado: ESTADOS_OPCIONES_FINCA.DISPONIBLE,
    motivo: null,
  };
}

export function validarValorFinca(catalogo, clave, valor) {
  const consulta = obtenerOpcionesFinca(catalogo, clave);

  if (!consulta.disponible) {
    return {
      valido: false,
      clave: consulta.clave,
      valor: valor === undefined ? null : valor,
      opcion: null,
      estado: consulta.estado,
      motivo: consulta.motivo,
    };
  }

  if (valor === undefined || valor === null) {
    return {
      valido: false,
      clave: consulta.clave,
      valor: null,
      opcion: null,
      estado: ESTADOS_OPCIONES_FINCA.ENTRADA_INVALIDA,
      motivo: 'El valor de finca es obligatorio.',
    };
  }

  const opcion = consulta.opciones.find((candidata) => candidata.valor === valor);

  if (opcion === undefined) {
    return {
      valido: false,
      clave: consulta.clave,
      valor,
      opcion: null,
      estado: ESTADOS_OPCIONES_FINCA.NO_PERTENECE,
      motivo: `El valor ${describirValor(valor)} no pertenece a las opciones declaradas para "${consulta.clave}".`,
    };
  }

  return {
    valido: true,
    clave: consulta.clave,
    valor,
    opcion: {
      valor: opcion.valor,
      etiqueta: opcion.etiqueta,
    },
    estado: ESTADOS_OPCIONES_FINCA.VALIDO,
    motivo: null,
  };
}

function esOpcionEstructuralmenteValida(opcion) {
  if (!esObjetoPlano(opcion)) {
    return false;
  }

  if (!Object.hasOwn(opcion, 'valor')) {
    return false;
  }

  if (opcion.valor === undefined || opcion.valor === null) {
    return false;
  }

  if (typeof opcion.valor === 'string' && opcion.valor.trim() === '') {
    return false;
  }

  if (typeof opcion.valor !== 'string' && typeof opcion.valor !== 'number') {
    return false;
  }

  if (typeof opcion.valor === 'number' && !Number.isFinite(opcion.valor)) {
    return false;
  }

  return esCadenaNoVacia(opcion.etiqueta);
}

function describirValor(valor) {
  if (typeof valor === 'string') {
    return `"${valor}"`;
  }

  if (
    typeof valor === 'number' ||
    typeof valor === 'boolean' ||
    typeof valor === 'bigint' ||
    typeof valor === 'symbol'
  ) {
    return String(valor);
  }

  return Object.prototype.toString.call(valor);
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
