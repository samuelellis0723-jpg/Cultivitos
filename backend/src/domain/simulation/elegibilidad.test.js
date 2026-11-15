import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluarElegibilidad,
  evaluarElegibilidadEstrategia,
  resolverNivelEvidenciaCompuesto,
  NIVELES_EVIDENCIA,
  CODIGOS_ERROR_ELEGIBILIDAD,
  ErrorEntradaDominio,
} from './elegibilidad.js';
import { ESTADOS_COMPATIBILIDAD } from './compatibilidad-temporal.js';

// Helpers para construcción de datos sintéticos
function crearCicloSintetico({
  id = 'c-1',
  ventanaSiembra = { inicioMes: 5, finMes: 6 },
  duracionDias = { min: 60, max: 70 },
  alcanceGeografico = 'local',
  localidad = 'Liberia',
  nivelEvidencia = 'directa_local',
  fuenteId = 'f-test-1',
} = {}) {
  return {
    id,
    ventanaSiembra,
    duracionDias,
    alcanceGeografico,
    localidad,
    nivelEvidencia,
    fuenteId,
  };
}

function crearCatalogoSintetico({
  ciclo1 = crearCicloSintetico({ id: 'primera', ventanaSiembra: { inicioMes: 5, finMes: 6 }, duracionDias: { min: 60, max: 70 } }),
  ciclo2 = crearCicloSintetico({ id: 'postrera', ventanaSiembra: { inicioMes: 9, finMes: 10 }, duracionDias: { min: 70, max: 80 } }),
  estrategiaId = 'rotacion-a',
} = {}) {
  return {
    version: '1.0.0-test',
    fuentes: [{ id: 'f-test-1', titulo: 'Fuente Test' }],
    cultivos: [
      {
        id: 'cultivo-1',
        nombre: 'Cultivo Uno',
        fuenteId: 'f-test-1',
        ciclos: [ciclo1],
      },
      {
        id: 'cultivo-2',
        nombre: 'Cultivo Dos',
        fuenteId: 'f-test-1',
        ciclos: [ciclo2],
      },
    ],
    estrategias: [
      {
        id: estrategiaId,
        nombre: 'Estrategia Test A',
        pasos: [
          { orden: 1, cultivoId: 'cultivo-1', cicloId: ciclo1.id },
          { orden: 2, cultivoId: 'cultivo-2', cicloId: ciclo2.id },
        ],
      },
    ],
    opcionesFinca: {
      suelo: [{ valor: 'desconocido', etiqueta: 'Desconocido' }],
      drenaje: [{ valor: 'desconocido', etiqueta: 'Desconocido' }],
      riego: [{ valor: 'desconocido', etiqueta: 'Desconocido' }],
      prioridad: [{ valor: 'equilibrio', etiqueta: 'Equilibrio' }],
      mesInicio: [{ valor: 5, etiqueta: 'Mayo' }],
    },
  };
}

test('1. Estrategia temporalmente compatible con evidencia suficiente (directa_local)', () => {
  const catalogo = crearCatalogoSintetico();
  const finca = { mesInicio: 5 };

  const resultado = evaluarElegibilidad({ catalogo, finca });

  assert.equal(resultado.resumen.total, 1);
  assert.equal(resultado.resumen.elegibles, 1);
  assert.equal(resultado.resumen.descartadas, 0);
  assert.equal(resultado.resumen.noCalculables, 0);

  const est = resultado.estrategias[0];
  assert.equal(est.elegible, true);
  assert.equal(est.motivosDescarte.length, 0);
  assert.equal(est.motivosNoCalculable.length, 0);
  assert.equal(est.advertencias.length, 0);
  assert.equal(est.nivelEvidencia, NIVELES_EVIDENCIA.DIRECTA_LOCAL);
  assert.equal(est.compatibilidadTemporal.estado, ESTADOS_COMPATIBILIDAD.COMPATIBLE);
  assert.equal(resultado.descartes.length, 0);
});

test('2. Estrategia temporalmente incompatible (solapamiento o mesInicio fuera de ventana)', () => {
  // Ciclo 1 en Junio (mes 6) con mesInicio en 5 (fuera de ventana [6, 6])
  const ciclo1 = crearCicloSintetico({
    id: 'c1-incompatible',
    ventanaSiembra: { inicioMes: 6, finMes: 6 },
    duracionDias: { min: 60, max: 70 },
  });
  const ciclo2 = crearCicloSintetico({
    id: 'c2-incompatible',
    ventanaSiembra: { inicioMes: 9, finMes: 10 },
  });

  const catalogo = crearCatalogoSintetico({ ciclo1, ciclo2 });
  const finca = { mesInicio: 5 }; // Fuera de ventana del ciclo 1

  const resultado = evaluarElegibilidad({ catalogo, finca });

  assert.equal(resultado.resumen.elegibles, 0);
  assert.equal(resultado.resumen.descartadas, 1);

  const est = resultado.estrategias[0];
  assert.equal(est.elegible, false);
  assert.equal(est.compatibilidadTemporal.estado, ESTADOS_COMPATIBILIDAD.INCOMPATIBLE);
  assert.ok(est.motivosDescarte.length >= 1);
  assert.ok(est.motivosDescarte[0].includes('mes de inicio'));

  assert.equal(resultado.descartes.length, 1);
  assert.equal(resultado.descartes[0].estrategiaId, 'rotacion-a');
  assert.deepEqual(resultado.descartes[0].motivos, est.motivosDescarte);
});

test('3. Estrategia temporalmente indeterminada (incertidumbre de solapamiento)', () => {
  // Solapamiento parcial: finMin = 266, finMax = 315 contra ventana [244, 304]
  const ciclo1 = crearCicloSintetico({
    id: 'c1-indeterminada',
    ventanaSiembra: { inicioMes: 6, finMes: 6 },
    duracionDias: { min: 115, max: 135 },
  });
  const ciclo2 = crearCicloSintetico({
    id: 'c2-indeterminada',
    ventanaSiembra: { inicioMes: 9, finMes: 10 },
  });

  const catalogo = crearCatalogoSintetico({ ciclo1, ciclo2 });
  const finca = { mesInicio: 6 };

  const resultado = evaluarElegibilidad({ catalogo, finca });

  const est = resultado.estrategias[0];
  assert.equal(est.elegible, false);
  assert.equal(est.compatibilidadTemporal.estado, ESTADOS_COMPATIBILIDAD.INDETERMINADA);
  assert.ok(est.motivosDescarte.length >= 1);
  assert.ok(est.motivosDescarte.some((m) => m.includes('Incertidumbre temporal')));
  assert.equal(resultado.resumen.descartadas, 1);
});

test('4. Estrategia temporalmente no evaluable (cruce de año en v0.2)', () => {
  const ciclo1 = crearCicloSintetico({
    id: 'c1-cruce',
    ventanaSiembra: { inicioMes: 11, finMes: 11 },
    duracionDias: { min: 60, max: 70 },
  });
  const ciclo2 = crearCicloSintetico({
    id: 'c2-cruce',
    ventanaSiembra: { inicioMes: 1, finMes: 2 },
  });

  const catalogo = crearCatalogoSintetico({ ciclo1, ciclo2 });
  const finca = { mesInicio: 11 };

  const resultado = evaluarElegibilidad({ catalogo, finca });

  const est = resultado.estrategias[0];
  assert.equal(est.elegible, false);
  assert.equal(est.compatibilidadTemporal.estado, ESTADOS_COMPATIBILIDAD.NO_EVALUABLE);
  assert.ok(est.motivosNoCalculable.some((m) => m.includes('límite del año calendario')));
  assert.ok(est.motivosDescarte.some((m) => m.includes('cruza el límite anual')));
});

test('5. Ciclo con duración faltante en ciclo 2 (transición viable pero estrategia incompleta)', () => {
  // Transición D18 es compatible, pero ciclo2.duracionDias es null
  const ciclo1 = crearCicloSintetico({
    id: 'c1-completo',
    ventanaSiembra: { inicioMes: 5, finMes: 6 },
    duracionDias: { min: 60, max: 70 },
  });
  const ciclo2SinDuracion = crearCicloSintetico({
    id: 'c2-sin-duracion',
    ventanaSiembra: { inicioMes: 9, finMes: 10 },
    duracionDias: null,
  });

  const catalogo = crearCatalogoSintetico({ ciclo1, ciclo2: ciclo2SinDuracion });
  const finca = { mesInicio: 5 };

  const resultado = evaluarElegibilidad({ catalogo, finca });

  const est = resultado.estrategias[0];
  // Transición temporal fue evaluada como compatible
  assert.equal(est.compatibilidadTemporal.estado, ESTADOS_COMPATIBILIDAD.COMPATIBLE);
  // Pero la estrategia general NO es elegible por falta de duración del segundo ciclo
  assert.equal(est.elegible, false);
  assert.ok(est.datosFaltantes.includes('ciclo2.duracionDias'));
  assert.ok(est.motivosNoCalculable.some((m) => m.includes('carece de duracionDias')));
  assert.ok(est.motivosDescarte.some((m) => m.includes('datos de duración incompletos')));
  assert.ok(resultado.datosFaltantes.includes('ciclo2.duracionDias'));
});

test('6. Ciclo con ventana faltante (ventanaSiembra null)', () => {
  const ciclo1SinVentana = crearCicloSintetico({
    id: 'c1-sin-ventana',
    ventanaSiembra: null,
  });
  const ciclo2Valido = crearCicloSintetico({
    id: 'c2-valido',
  });

  const catalogo = crearCatalogoSintetico({ ciclo1: ciclo1SinVentana, ciclo2: ciclo2Valido });
  const finca = { mesInicio: 5 };

  const resultado = evaluarElegibilidad({ catalogo, finca });

  const est = resultado.estrategias[0];
  assert.equal(est.elegible, false);
  assert.equal(est.compatibilidadTemporal.estado, ESTADOS_COMPATIBILIDAD.NO_EVALUABLE);
  assert.ok(est.datosFaltantes.includes('ciclo1.ventanaSiembra'));
  assert.ok(est.motivosNoCalculable.length >= 1);
});

test('7. Evidencia directa_local (ambos ciclos directa_local)', () => {
  const catalogo = crearCatalogoSintetico({
    ciclo1: crearCicloSintetico({
      id: 'c1-directa',
      ventanaSiembra: { inicioMes: 5, finMes: 6 },
      duracionDias: { min: 60, max: 70 },
      nivelEvidencia: 'directa_local',
      localidad: 'Liberia',
      alcanceGeografico: 'local',
    }),
    ciclo2: crearCicloSintetico({
      id: 'c2-directa',
      ventanaSiembra: { inicioMes: 9, finMes: 10 },
      duracionDias: { min: 70, max: 80 },
      nivelEvidencia: 'directa_local',
      localidad: 'Liberia',
      alcanceGeografico: 'local',
    }),
  });
  const finca = { mesInicio: 5 };

  const resultado = evaluarElegibilidad({ catalogo, finca });

  const est = resultado.estrategias[0];
  assert.equal(est.elegible, true);
  assert.equal(est.nivelEvidencia, NIVELES_EVIDENCIA.DIRECTA_LOCAL);
  assert.equal(est.advertencias.length, 0);
});

test('8. Evidencia extrapolada (elegible para cálculo pero genera advertencia de alcance geográfico)', () => {
  const catalogo = crearCatalogoSintetico({
    ciclo1: crearCicloSintetico({
      id: 'c1-directa',
      ventanaSiembra: { inicioMes: 5, finMes: 6 },
      duracionDias: { min: 60, max: 70 },
      nivelEvidencia: 'directa_local',
      localidad: 'Liberia',
      alcanceGeografico: 'local',
    }),
    ciclo2: crearCicloSintetico({
      id: 'c2-extrapolada',
      ventanaSiembra: { inicioMes: 9, finMes: 10 },
      duracionDias: { min: 70, max: 80 },
      nivelEvidencia: 'extrapolada',
      localidad: 'Cañas',
      alcanceGeografico: 'cantonal',
    }),
  });
  const finca = { mesInicio: 5 };

  const resultado = evaluarElegibilidad({ catalogo, finca });

  const est = resultado.estrategias[0];
  assert.equal(est.elegible, true);
  assert.equal(est.nivelEvidencia, NIVELES_EVIDENCIA.EXTRAPOLADA);
  assert.equal(est.advertencias.length, 1);
  assert.ok(est.advertencias[0].includes('Evidencia extrapolada desde [Cañas]'));
  assert.ok(est.advertencias[0].includes('no validada para Liberia'));
  assert.equal(est.motivosDescarte.length, 0);
});

test('9. Evidencia parcial (no elegible para recomendación/puntuación, motivo en motivosNoCalculable)', () => {
  const catalogo = crearCatalogoSintetico({
    ciclo1: crearCicloSintetico({ nivelEvidencia: 'directa_local', localidad: 'Liberia', alcanceGeografico: 'local' }),
    ciclo2: crearCicloSintetico({ nivelEvidencia: 'parcial', localidad: 'Chorotega', alcanceGeografico: 'regional' }),
  });
  const finca = { mesInicio: 5 };

  const resultado = evaluarElegibilidad({ catalogo, finca });

  const est = resultado.estrategias[0];
  assert.equal(est.elegible, false);
  assert.equal(est.nivelEvidencia, NIVELES_EVIDENCIA.PARCIAL);
  assert.ok(est.motivosNoCalculable.some((m) => m.includes('parcial')));
  assert.ok(est.motivosDescarte.some((m) => m.includes('parcial')));
});

test('10. Evidencia pendiente (no elegible para recomendación/puntuación, motivo en motivosNoCalculable)', () => {
  const catalogo = crearCatalogoSintetico({
    ciclo1: crearCicloSintetico({ nivelEvidencia: 'pendiente', localidad: null, alcanceGeografico: null, fuenteId: null }),
    ciclo2: crearCicloSintetico({ nivelEvidencia: 'directa_local' }),
  });
  const finca = { mesInicio: 5 };

  const resultado = evaluarElegibilidad({ catalogo, finca });

  const est = resultado.estrategias[0];
  assert.equal(est.elegible, false);
  assert.equal(est.nivelEvidencia, NIVELES_EVIDENCIA.PENDIENTE);
  assert.ok(est.motivosNoCalculable.some((m) => m.includes('pendiente')));
  assert.ok(est.motivosDescarte.some((m) => m.includes('pendiente')));
});

test('11. Opciones de finca desconocidas (suelo, drenaje y riego con desconocido no descartan la estrategia)', () => {
  const catalogo = crearCatalogoSintetico();
  const fincaConDesconocidos = {
    mesInicio: 5,
    suelo: 'desconocido',
    drenaje: 'desconocido',
    riego: 'desconocido',
    prioridad: 'equilibrio',
  };

  const resultado = evaluarElegibilidad({ catalogo, finca: fincaConDesconocidos });

  const est = resultado.estrategias[0];
  // 'desconocido' representa incertidumbre y no descarta la estrategia
  assert.equal(est.elegible, true);
  assert.equal(est.motivosDescarte.length, 0);
});

test('12. Datos de entrada inválidos (rechazo con ErrorEntradaDominio)', () => {
  const catalogo = crearCatalogoSintetico();

  // Finca inválida: mesInicio fuera de 1..12
  assert.throws(
    () => evaluarElegibilidad({ catalogo, finca: { mesInicio: 13 } }),
    (err) => err instanceof ErrorEntradaDominio && err.codigo === CODIGOS_ERROR_ELEGIBILIDAD.RANGO_INVALIDO
  );
  assert.throws(
    () => evaluarElegibilidad({ catalogo, finca: { mesInicio: 0 } }),
    (err) => err instanceof ErrorEntradaDominio && err.codigo === CODIGOS_ERROR_ELEGIBILIDAD.RANGO_INVALIDO
  );
  assert.throws(
    () => evaluarElegibilidad({ catalogo, finca: null }),
    (err) => err instanceof ErrorEntradaDominio && err.codigo === CODIGOS_ERROR_ELEGIBILIDAD.FINCA_INVALIDA
  );

  // Catálogo inválido
  assert.throws(
    () => evaluarElegibilidad({ catalogo: null, finca: { mesInicio: 5 } }),
    (err) => err instanceof ErrorEntradaDominio && err.codigo === CODIGOS_ERROR_ELEGIBILIDAD.CATALOGO_INVALIDO
  );

  // Estrategia con ciclo inexistente
  const catalogoConReferenciaInvalida = {
    ...catalogo,
    estrategias: [
      {
        id: 'est-invalida',
        pasos: [
          { orden: 1, cultivoId: 'cultivo-fantasma', cicloId: 'ciclo-fantasma' },
          { orden: 2, cultivoId: 'cultivo-2', cicloId: 'postrera' },
        ],
      },
    ],
  };
  assert.throws(
    () => evaluarElegibilidad({ catalogo: catalogoConReferenciaInvalida, finca: { mesInicio: 5 } }),
    (err) => err instanceof ErrorEntradaDominio && err.codigo === CODIGOS_ERROR_ELEGIBILIDAD.CICLO_NO_ENCONTRADO
  );

  // Estrategia con pasos incompletos (distinto de 2 pasos)
  const catalogoUnPaso = {
    ...catalogo,
    estrategias: [
      {
        id: 'est-un-paso',
        pasos: [{ orden: 1, cultivoId: 'cultivo-1', cicloId: 'primera' }],
      },
    ],
  };
  assert.throws(
    () => evaluarElegibilidad({ catalogo: catalogoUnPaso, finca: { mesInicio: 5 } }),
    (err) => err instanceof ErrorEntradaDominio && err.codigo === CODIGOS_ERROR_ELEGIBILIDAD.ENTRADA_INVALIDA
  );
});

test('13. Inmutabilidad y determinismo', () => {
  const catalogo = Object.freeze(crearCatalogoSintetico());
  const finca = Object.freeze({
    mesInicio: 5,
    suelo: 'desconocido',
    drenaje: 'desconocido',
    riego: 'desconocido',
  });

  const res1 = evaluarElegibilidad({ catalogo, finca });
  const res2 = evaluarElegibilidad({ catalogo, finca });

  // Inmutabilidad
  assert.ok(Object.isFrozen(res1));
  assert.ok(Object.isFrozen(res1.estrategias));
  assert.ok(Object.isFrozen(res1.descartes));
  assert.ok(Object.isFrozen(res1.datosFaltantes));
  assert.ok(Object.isFrozen(res1.resumen));
  assert.ok(Object.isFrozen(res1.estrategias[0]));
  assert.ok(Object.isFrozen(res1.estrategias[0].motivosDescarte));
  assert.ok(Object.isFrozen(res1.estrategias[0].motivosNoCalculable));
  assert.ok(Object.isFrozen(res1.estrategias[0].advertencias));
  assert.ok(Object.isFrozen(res1.estrategias[0].datosFaltantes));
  assert.ok(Object.isFrozen(res1.estrategias[0].pasos));

  // Determinismo
  assert.deepEqual(res1, res2);
});

test('Helper resolverNivelEvidenciaCompuesto respeta la regla del eslabón más débil (D19)', () => {
  // directa_local > extrapolada > parcial > pendiente
  assert.equal(resolverNivelEvidenciaCompuesto('directa_local', 'directa_local'), 'directa_local');
  assert.equal(resolverNivelEvidenciaCompuesto('directa_local', 'extrapolada'), 'extrapolada');
  assert.equal(resolverNivelEvidenciaCompuesto('extrapolada', 'directa_local'), 'extrapolada');
  assert.equal(resolverNivelEvidenciaCompuesto('directa_local', 'parcial'), 'parcial');
  assert.equal(resolverNivelEvidenciaCompuesto('extrapolada', 'parcial'), 'parcial');
  assert.equal(resolverNivelEvidenciaCompuesto('directa_local', 'pendiente'), 'pendiente');
  assert.equal(resolverNivelEvidenciaCompuesto('parcial', 'pendiente'), 'pendiente');
});
