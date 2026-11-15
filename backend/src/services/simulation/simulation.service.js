import {calcularMinimaxRegret, ErrorEntradaDominio, CODIGOS_ERROR, } from '../../domain/simulation/minimax-regret.js';
import { getNasaHistoricalClimateSeries } from '../nasa/nasa.service.js';
import catalogoService from '../catalog/catalog.js';

const ESCENARIOS = ['habitual', 'seco', 'humedo'];

// Matriz ficticia del docs/contrato-api.md — SOLO para modo demo
const MATRIZ_DEMO = {
  E1: { habitual: 90, seco: 35, humedo: 55 },  // Maíz → Frijol (antes A)
  E2: { habitual: 75, seco: 80, humedo: 50 },  // Maíz → Sorgo (antes B)
  E3: { habitual: 80, seco: 70, humedo: 75 },  // Sorgo → Frijol (antes C)
};
function esNumero(x) { return typeof x === 'number' && Number.isFinite(x); }

function validarFinca(finca, catalogo) {
  if (!finca || typeof finca !== 'object') {
    throw new Error('La finca es obligatoria.');
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
    // Reglas de puntuación pendientes (D7): null = no calculable, jamás 0.
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
    puntajes: r.puntuaciones,                       // puntuaciones -> puntajes (contrato público)
    peorArrepentimiento: r.peorArrepentimiento,
    motivoPeorArrepentimiento: r.motivoPeorArrepentimiento,
    motivosNoCalculable: r.motivosNoCalculable,
    motivosDescarte: r.motivosDescarte,
  }));
}

export async function simular({ finca, modo } = {}) {
  const catalogo = await catalogoService.getCatalog();
  validarFinca(finca, catalogo);

  const esDemo = modo === 'demo';
  const clima = esDemo
    ? null
    : await getNasaHistoricalClimateSeries({ lat: finca.latitude, lon: finca.longitude });

  const entrada = {
    escenarios: ESCENARIOS,
    estrategias: armarEstrategiasParaMotor(catalogo, modo),
  };
  const motor = calcularMinimaxRegret(entrada);

  const estado = esDemo ? 'demo' : motor.estado;

  return {
    estado,
    escenarios: motor.escenarios,
    resultados: mapearResultados(motor.resultados),
    descartes: motor.descartes,
    ganadoras: motor.ganadoras,
    peorArrepentimientoMinimo: motor.peorArrepentimientoMinimo,
    mejoresPorEscenario: motor.mejoresPorEscenario,
    explicacion:
      esDemo
        ? 'Demostración con matriz ficticia del contrato. Los valores no provienen de NASA ni de datos reales.'
        : estado === 'incompleto'
          ? 'Simulación incompleta: faltan las reglas de puntuación agronómica o datos climáticos esenciales. No se declara ganadora.'
          : 'Simulación calculada con el motor minimax regret.',
    evidencia: {
      origen: esDemo ? 'demo' : 'live',
      supuestos: esDemo
        ? ['Matriz ficticia del docs/contrato-api.md para verificar el algoritmo.']
        : ['Reglas de puntuación agronómica pendientes (D7). Las puntuaciones se reportan como no calculables.'],
      datosFaltantes: esDemo ? [] : ['Reglas de puntuación agronómica (pendiente Hellen).'],
      catalogoVersion: catalogo.version,
      motorVersion: 'minimax-regret v1',
      reglasVersion: 'no-implementado',
    },
  };
}