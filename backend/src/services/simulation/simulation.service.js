import { calcularMinimaxRegret, ErrorEntradaDominio, CODIGOS_ERROR } from '../../domain/simulation/minimax-regret.js';
import { getNasaHistoricalClimateSeries, HISTORY_PERIOD } from '../nasa/nasa.service.js';
import catalogoService from '../catalog/catalog.js';
import { generarExplicacionIA } from '../ai/openai.service.js';

const ESCENARIOS = ['habitual', 'seco', 'humedo'];
const VARIABLES_CLIMA_REQUERIDAS = ['precipitacion', 'temperaturaMedia', 'temperaturaMaxima'];

const MATRIZ_DEMO = {
  E1: { habitual: 90, seco: 35, humedo: 55 },
  E2: { habitual: 75, seco: 80, humedo: 50 },
  E3: { habitual: 80, seco: 70, humedo: 75 },
};

function esNumero(x) { return typeof x === 'number' && Number.isFinite(x); }

function validarClima(clima) {
  if (!clima || typeof clima !== 'object') return ['clima: sin datos'];
  const faltantes = [];
  const variables = clima.variables ?? {};
  for (const clave of VARIABLES_CLIMA_REQUERIDAS) {
    const v = variables[clave];
    if (!v) { faltantes.push(`clima.variables.${clave}: ausente`); continue; }
    if (!v.unidad) faltantes.push(`clima.variables.${clave}.unidad: ausente`);
    if (!['live', 'backup'].includes(v.procedencia)) faltantes.push(`clima.variables.${clave}.procedencia: ausente o inválida`);
    if (!v.fechaConsulta) faltantes.push(`clima.variables.${clave}.fechaConsulta: ausente`);
    if (!v.cobertura || !Number.isFinite(v.cobertura.porcentaje)) faltantes.push(`clima.variables.${clave}.cobertura: ausente o sin porcentaje`);
    if (!Array.isArray(v.serie)) faltantes.push(`clima.variables.${clave}.serie: ausente`);
  }
  return faltantes;
}

function validarFinca(finca, catalogo) {
  if (!finca || typeof finca !== 'object') {
    throw new ErrorEntradaDominio(CODIGOS_ERROR.ENTRADA_INVALIDA, 'La finca es obligatoria.');
  }
  const errores = [];
  if (!esNumero(finca.latitude) || finca.latitude < -90 || finca.latitude > 90) {
    errores.push('"latitude" debe ser un número entre -90 y 90.');
  }
  if (!esNumero(finca.longitude) || finca.longitude < -180 || finca.longitude > 180) {
    errores.push('"longitude" debe ser un número entre -180 y 180.');
  }
  if (!esNumero(finca.mesInicio) || !Number.isInteger(finca.mesInicio) || finca.mesInicio < 1 || finca.mesInicio > 12) {
    errores.push('"mesInicio" debe ser un entero entre 1 y 12.');
  }
  const opciones = catalogo.opcionesFinca ?? {};
  for (const campo of ['suelo', 'drenaje', 'riego', 'prioridad']) {
    const valores = (opciones[campo] ?? []).map((o) => o.valor);
    if (!valores.includes(finca[campo])) {
      errores.push(`"${campo}" debe ser uno de: ${valores.join(', ')}.`);
    }
  }
  const cultivosValidos = new Set((catalogo.cultivos ?? []).map((c) => c.id));
  const anteriores = Array.isArray(finca.cultivosAnteriores) ? finca.cultivosAnteriores : [];
  for (const id of anteriores) {
    if (!cultivosValidos.has(id)) errores.push(`"cultivosAnteriores" contiene el cultivo desconocido "${id}".`);
  }
  if (errores.length > 0) {
    throw new ErrorEntradaDominio(CODIGOS_ERROR.ENTRADA_INVALIDA, errores.join(' '));
  }
}

function armarEstrategiasParaMotor(catalogo, modo) {
  return (catalogo.estrategias ?? []).map((e) => {
    if (modo === 'demo') {
      return { id: e.id, elegible: true, puntuaciones: MATRIZ_DEMO[e.id] ?? null };
    }
    return {
      id: e.id,
      elegible: true,
      puntuaciones: { habitual: null, seco: null, humedo: null },
    };
  });
}

function mapearResultados(resultados) {
  return resultados.map((r) => ({
    estrategiaId: r.estrategiaId,
    elegible: r.elegible,
    elegibilidadEstado: r.elegible === true ? 'elegible' : r.elegible === false ? 'descartada' : 'no_evaluable',
    puntajes: r.puntuaciones,
    peorArrepentimiento: r.peorArrepentimiento,
    motivoPeorArrepentimiento: r.motivoPeorArrepentimiento,
    motivosNoCalculable: r.motivosNoCalculable,
    motivosDescarte: r.motivosDescarte,
  }));
}

function construirResultadosRealesIncompletos(catalogo) {
  const motivoReglas = 'Metodología agrícola real (D7) no habilitada.';
  const motivoArrepentimiento =
    'No calculable: la elegibilidad y las puntuaciones agronómicas reales aún no son evaluables (reglas D5/D7 pendientes).';
  return (catalogo.estrategias ?? []).map((e) => ({
    estrategiaId: e.id,
    elegible: null,
    elegibilidadEstado: 'no_evaluable',
    puntajes: { habitual: null, seco: null, humedo: null },
    peorArrepentimiento: null,
    motivoPeorArrepentimiento: motivoArrepentimiento,
    motivosNoCalculable: {
      habitual: motivoReglas,
      seco: motivoReglas,
      humedo: motivoReglas,
    },
    motivosDescarte: [],
  }));
}

export async function simular({ finca, modo } = {}, { getClimate = getNasaHistoricalClimateSeries, explain = generarExplicacionIA } = {}) {
  if (modo !== undefined && !['real', 'demo'].includes(modo)) {
    throw new ErrorEntradaDominio(CODIGOS_ERROR.ENTRADA_INVALIDA, 'Modalidad no disponible.');
  }
  const catalogo = await catalogoService.getCatalog();
  validarFinca(finca, catalogo);

  const esDemo = modo === 'demo';
  let clima = null;
  let faltantesClima = [];
  if (!esDemo) {
    try {
      clima = await getClimate({ latitude: finca.latitude, longitude: finca.longitude, ...HISTORY_PERIOD });
      faltantesClima = validarClima(clima);
    } catch (error) {
      faltantesClima = ['Clima no disponible: no se pudo consultar el historial ni recuperar un respaldo válido.'];
    }
  }

  let estado;
  let escenarios = [...ESCENARIOS];
  let resultadosMapeados;
  let descartes;
  let ganadoras;
  let peorArrepentimientoMinimo;
  let mejoresPorEscenario;

  if (esDemo) {
    const entrada = {
      escenarios: ESCENARIOS,
      estrategias: armarEstrategiasParaMotor(catalogo, modo),
    };
    const motor = calcularMinimaxRegret(entrada);
    estado = 'demo';
    escenarios = motor.escenarios;
    resultadosMapeados = mapearResultados(motor.resultados);
    descartes = motor.descartes;
    ganadoras = motor.ganadoras;
    peorArrepentimientoMinimo = motor.peorArrepentimientoMinimo;
    mejoresPorEscenario = motor.mejoresPorEscenario;
  } else {
    estado = 'incompleto';
    resultadosMapeados = construirResultadosRealesIncompletos(catalogo);
    descartes = [];
    ganadoras = [];
    peorArrepentimientoMinimo = null;
    mejoresPorEscenario = { habitual: null, seco: null, humedo: null };
  }

  const origenDatos = clima?.fuentes?.[0]?.origen ?? null;
  const datosFaltantes = esDemo
    ? []
    : [...faltantesClima, 'Metodología agrícola no habilitada: D7 solo admite pruebas sintéticas internas; faltan reglas ratificadas e integración real.'];

  const explicacionBase = esDemo
    ? 'Demostración con matriz ficticia del contrato. Los valores no provienen de NASA ni de datos reales.'
    : estado === 'incompleto'
      ? 'Evaluación incompleta: la metodología agrícola real aún no está habilitada. Disponer de historial climático no habilita D7 ni permite declarar ganadoras.'
      : 'Simulación calculada con el motor minimax regret.';

  // La IA opcional solo redacta texto; los resultados y evidencia se construyen aquí.
  const iaRespuesta = await explain({
    estado,
    prioridadFinca: finca.prioridad,
    resultados: resultadosMapeados,
    ganadoras,
    peorArrepentimientoMinimo,
    datosFaltantes,
    explicacionBase
  });

  return {
    estado,
    escenarios,
    clima,
    resultados: resultadosMapeados,
    descartes,
    ganadoras,
    peorArrepentimientoMinimo,
    mejoresPorEscenario,
    explicacion: iaRespuesta.explicacionIA,
    evidencia: {
      origen: esDemo ? 'demo' : origenDatos,
      fuentes: esDemo ? [] : (clima?.fuentes ?? []),
      iaOrigen: iaRespuesta.origen,
      supuestos: esDemo
        ? ['Matriz ficticia del docs/contrato-api.md para verificar el algoritmo.']
        : ['Reglas de puntuación agronómica pendientes (D7). Las puntuaciones se reportan como no calculables.'],
      datosFaltantes,
      catalogoVersion: catalogo.version,
      motorVersion: 'minimax-regret v1',
      reglasVersion: 'no-implementado',
    },
  };
}