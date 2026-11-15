import { adaptarCatalogoDominio } from '../catalog/adaptar-catalogo-dominio.js';
import { validarCatalogo } from '../catalog/validar-catalogo.js';
import { resolverEvidenciaAtributos } from '../catalog/resolver-evidencia-atributos.js';
import { evaluarRespaldoRotacion } from './evaluar-respaldo-rotacion.js';
import { validarClima } from './validar-clima.js';
import { ESCENARIOS_D7 } from './puntuacion-d7.js';

const METODOLOGIA = 'METODOLOGIA_REAL_NO_HABILITADA: faltan ratificación D6/D7, escenarios, indicadores, rangos y pesos por prioridad.';
const nulos = () => Object.fromEntries(ESCENARIOS_D7.map((id) => [id, null]));
const errorRegistrado = (error) => ({ codigo: error.codigo ?? error.name, motivo: error.message });

/**
 * Fachada interna pura para preparación REAL. No puntúa, no consulta proveedores.
 * evidenciaAtributos opcional contiene declaraciones D22; sus IDs son
 * `${cultivoId}/${cicloId}/ventanaSiembra` y `${cultivoId}/${cicloId}/duracionDias`.
 * Solo los tests internos pueden señalar modo prueba_sintetica en ese objeto.
 */
export function evaluarPreparacionSimulacion({ finca, catalogo, clima = null, evidenciaAtributos } = {}) {
  const adaptacion = adaptarCatalogoDominio(catalogo);
  const interno = adaptacion.catalogo;
  const validacionCatalogo = validarCatalogo(interno);
  const validacionClima = validarClima(clima);
  const datosFaltantes = [...adaptacion.datosFaltantes, 'metodologia.D6', 'metodologia.D7'];
  if (!validacionCatalogo.valido) datosFaltantes.push('catalogo.estructura');
  if (!validacionClima.valido) datosFaltantes.push('clima');
  const fincaValida = finca && Number.isInteger(finca.mesInicio) && finca.mesInicio >= 1 && finca.mesInicio <= 12;
  if (!fincaValida) datosFaltantes.push('finca.mesInicio');

  const atributos = [];
  if (validacionCatalogo.valido) {
    for (const cultivo of interno.cultivos) {
      for (const ciclo of cultivo.ciclos) {
        for (const atributo of ['ventanaSiembra', 'duracionDias']) {
          atributos.push({
            id: `${cultivo.id}/${ciclo.id}/${atributo}`,
            alcanceGeografico: ciclo.alcanceGeografico,
            localidad: ciclo.localidad,
          });
        }
      }
    }
  }
  let d22 = null;
  let errorD22 = null;
  if (validacionCatalogo.valido) {
    try {
      d22 = resolverEvidenciaAtributos({
        catalogo: interno, atributos,
        declaraciones: evidenciaAtributos?.declaraciones ?? [],
        modo: evidenciaAtributos?.modo ?? 'real',
      });
    } catch (error) { errorD22 = errorRegistrado(error); }
  }

  // Ausencia de declaración específica nunca hereda aprobación de Ciclo.fuenteId.
  const respaldos = new Map();
  for (const cultivo of validacionCatalogo.valido ? interno.cultivos : []) {
    for (const ciclo of cultivo.ciclos) {
      const ids = ['ventanaSiembra', 'duracionDias'].map((nombre) => `${cultivo.id}/${ciclo.id}/${nombre}`);
      const respaldo = ids.every((id) => {
        const item = d22?.resultados.find((resultado) => resultado.atributoId === id);
        // No escoger silenciosamente una fuente favorable entre declaraciones contradictorias.
        return item?.evidencias.length > 0 && item.evidencias.every((evidencia) =>
          evidencia.estado === 'evidencia_declarada' && evidencia.nivelEvidencia === ciclo.nivelEvidencia);
      });
      respaldos.set(`${cultivo.id}/${ciclo.id}`, respaldo);
      if (!respaldo || ciclo.duracionDias === null) {
        ciclo.nivelEvidencia = 'pendiente';
        datosFaltantes.push(...ids.filter((id) => !respaldo || id.endsWith('/duracionDias')));
      }
    }
  }

  // Incluso con esquema inválido, conservar IDs legibles para no ocultar candidatos.
  const candidatas = Array.isArray(interno?.estrategias)
    ? interno.estrategias.filter((e) => e && typeof e.id === 'string') : [];
  const estrategias = candidatas.map((estrategia) => {
    let d20 = null;
    let errorD20 = null;
    if (validacionCatalogo.valido && fincaValida) {
      try { d20 = evaluarRespaldoRotacion({ catalogo: interno, estrategiaId: estrategia.id, finca }); }
      catch (error) { errorD20 = errorRegistrado(error); }
    }
    const d5 = d20?.elegibilidadDeCultivosYCiclos;
    const temporal = d20?.compatibilidadTemporal;
    const pasosRespaldados = validacionCatalogo.valido && estrategia.pasos.every((paso) => respaldos.get(`${paso.cultivoId}/${paso.cicloId}`));
    const incompatibilidadComprobada = temporal?.estado === 'incompatible' && pasosRespaldados;
    const motivosNoCalculable = [METODOLOGIA];
    if (!d20) motivosNoCalculable.push('EVALUACION_NO_EJECUTADA: D20/D5/D18 por precondiciones o entrada inválida.');
    if (!pasosRespaldados) motivosNoCalculable.push('EVIDENCIA_ATRIBUTOS_INSUFICIENTE: falta respaldo específico por atributo (D22).');
    motivosNoCalculable.push(...(d5?.motivosNoCalculable ?? []), ...(d20?.evidenciaRotacion.motivosNoCalculable ?? []));
    if (temporal && temporal.estado !== 'compatible' && !incompatibilidadComprobada) {
      motivosNoCalculable.push(`COMPATIBILIDAD_NO_CONFIRMADA: ${temporal.estado}; ${temporal.motivo}`);
    }
    // La propuesta experimental no proporciona ratificación científica para aprobar estrategias.
    return {
      estrategiaId: estrategia.id,
      elegibilidadEstado: incompatibilidadComprobada ? 'no_elegible' : 'no_evaluable',
      motivosDescarte: incompatibilidadComprobada ? [temporal.motivo] : [],
      motivosNoCalculable: [...new Set(motivosNoCalculable)],
      advertencias: [
        ...(d5?.advertencias ?? []),
        ...['suelo', 'drenaje', 'riego'].filter((campo) => !finca?.[campo] || finca[campo] === 'desconocido')
          .map((campo) => `FINCA_DESCONOCIDA: ${campo}; no constituye restricción comprobada.`),
        'D20/D22 experimentales; las declaraciones no verifican calidad científica.',
      ],
      puntajes: nulos(),
      evidencia: {
        d20, errorD20, d20Intentado: validacionCatalogo.valido && Boolean(fincaValida),
        // null si hubo excepción: no afirmar que una invocación interna no ocurrió.
        d5Ejecutado: d5 !== undefined ? true : errorD20 ? null : false,
        d18Ejecutado: temporal !== undefined ? true : errorD20 ? null : false,
      },
    };
  });

  return structuredClone({
    // Mientras D6/D7 no estén habilitadas, incompleto prevalece incluso ante descartes.
    estadoPreparacion: 'incompleto',
    estrategias,
    escenarios: ESCENARIOS_D7.map((id) => ({ id, calculable: false, motivos: [METODOLOGIA] })),
    ganadoras: [],
    datosFaltantes: [...new Set(datosFaltantes)],
    metodologiaRealHabilitada: false,
    trazabilidad: {
      catalogoVersion: interno?.version ?? null,
      validacionCatalogo, validacionClima,
      clima: clima === null ? null : clima,
      finca: finca ?? null,
      d22, errorD22,
      modulos: {
        d22: { ejecutado: d22 !== null || errorD22 !== null, motivo: validacionCatalogo.valido ? null : 'CATALOGO_INVALIDO' },
        d5d18d20: {
          ejecutado: estrategias.some((e) => e.evidencia.d5Ejecutado === true) ? true
            : estrategias.some((e) => e.evidencia.errorD20) ? null : false,
          motivo: !validacionCatalogo.valido ? 'CATALOGO_INVALIDO' : !fincaValida ? 'MES_INICIO_INVALIDO_O_AUSENTE'
            : estrategias.some((e) => e.evidencia.errorD20) ? 'ERROR_EVALUACION: ver errorD20 por estrategia'
              : estrategias.length === 0 ? 'SIN_ESTRATEGIAS' : null,
        },
        d6: { ejecutado: false, motivo: 'METODOLOGIA_ESCENARIOS_NO_RATIFICADA' },
        d7: { ejecutado: false, motivo: 'MODO_REAL_NO_HABILITADO_D7' },
        minimax: { ejecutado: false, motivo: 'SIN_PUNTUACIONES_REALES; no convertir elegibilidad desconocida en true.' },
      },
    },
  });
}
