# Cierre de dominio para Samuel

Base verificada por fetch: `origin/codex/integrar-hellen-9915150`,
`fbb33b8ee9558832b137800daea9bafa2c8dbfab`.
Rama de entrega: `feat/cierre-dominio-hellen`. Propuesta interna experimental;
no modifica HTTP ni ratifica metodología agrícola. Conserva D20/D22 y D7 anteriores.

## Entrada única

```js
import { evaluarPreparacionSimulacion } from './domain/simulation/evaluar-preparacion-simulacion.js';
const preparacion = evaluarPreparacionSimulacion({ finca, catalogo, clima });
```

Export nombrado y síncrono:
`evaluarPreparacionSimulacion({ finca, catalogo, clima = null, evidenciaAtributos } = {})`.
`finca` es el perfil recibido por el servicio, `catalogo` es el objeto completo actual,
`clima` es clima normalizado (no la envoltura HTTP `{ clima, fuente }`).
No consulta archivos, NASA, IA, reloj ni variables de entorno.

Opcional interno `evidenciaAtributos: { modo: 'real', declaraciones: [...] }`:
declaraciones según D22, con IDs exactos
`cultivoId/cicloId/ventanaSiembra` y `cultivoId/cicloId/duracionDias`.
Los alcances objetivo se toman del ciclo. La ausencia del objeto equivale a ninguna
declaración, nunca a inferir respaldo desde `fuenteId`, una URL o texto genérico.
Los fixtures pueden indicar `modo: 'prueba_sintetica'` en este objeto interno;
Samuel no debe exponerlo como entrada HTTP. Esto no ejecuta D7.
No sustituir las declaraciones por fuentes climáticas: NASA no respalda rotaciones.

## Retorno exacto y consumo

```text
{
  estadoPreparacion: 'incompleto',
  estrategias: [{
    estrategiaId,
    elegibilidadEstado: 'no_evaluable' | 'no_elegible',
    motivosDescarte: string[], motivosNoCalculable: string[], advertencias: string[],
    puntajes: { habitual: null, seco: null, humedo: null },
    evidencia: { d20, errorD20, d20Intentado, d5Ejecutado, d18Ejecutado }
  }],
  escenarios: [{ id, calculable: false, motivos: string[] }],
  ganadoras: [], datosFaltantes: string[], metodologiaRealHabilitada: false,
  trazabilidad: {
    catalogoVersion, validacionCatalogo: { valido, errores },
    validacionClima: { valido, errores }, clima, finca,
    d22, errorD22,
    modulos: { d22, d5d18d20, d6, d7, minimax }
  }
}
```

Cada registro de `modulos` tiene `ejecutado` y `motivo`. Los errores atrapados
exponen `{ codigo, motivo }`. D20 conserva su salida íntegra, incluido el detalle
original D5/D18 y respaldo de secuencia. D22 conserva sus resultados por atributo.
Si D20 lanza, `d20Intentado` es true y los indicadores internos de ejecución son null:
la excepción impide certificar qué subevaluación llegó a completarse. El error se
registra, sin transformarlo en aprobación ni en una restricción agrícola.

El campo autoritativo para Samuel es `elegibilidadEstado`. **No consumir el booleano
anidado `evidencia.d20.elegibilidadDeCultivosYCiclos.elegible` como aprobación global**:
es el resultado técnico original de D5 y no incluye ratificación científica.
Esta entrega no emite `elegible`, `listo` ni `sin_opciones`: mientras D6/D7 real estén
bloqueadas, prevalece `incompleto`, incluso si se encontraron descartes.

`no_elegible` exige D18 incompatible y declaraciones D22 concordantes para todos
los atributos de ambos pasos. Sin ese respaldo, un calendario legado no acredita
un descarte comprobado. Los estados D18 `indeterminada` y `no_evaluable`, la evidencia
pendiente, el cruce de año no soportado y las precondiciones inválidas se mantienen
como `no_evaluable`, con `motivosDescarte: []` y razones de no calculabilidad.
Los atributos de finca desconocidos producen advertencias, nunca descartes automáticos.

Mapeo del servicio real: usar `estadoPreparacion` para `estado`, `estrategias` para
armar `resultados`, preservar motivos y puntajes null; `ganadoras` permanece vacío.
No alimentar Minimax con `elegible:true` para representar desconocimiento ni convertir
`no_evaluable` en `false` para forzar `sin_opciones`. La representación HTTP de la
elegibilidad desconocida debe acordarse en el adaptador de Samuel, sin falsear su significado.
El demo conserva su circuito independiente y matriz ficticia E1/E2/E3.

## Adaptación y limitaciones

`adaptarCatalogoDominio(catalogo)` en `domain/catalog/adaptar-catalogo-dominio.js`
devuelve `{ catalogo: copia, datosFaltantes }`. Conserva IDs, ventanas y meses originales;
duración en días ausente pasa a null. El futuro catálogo con días explícitos se conserva;
meses omitidos pasan a null solo para cumplir la estructura heredada del validador.
La evidencia ausente permanece pendiente. No se promueven FAO/MAG, enlaces o notas
genéricas a evidencia por atributo. Todas las transformaciones ocurren en una copia.

D20 invoca D5/D18 una sola vez por estrategia; la fachada no repite su algoritmo.
D22 se resuelve una vez, conservando declaraciones independientes sin seleccionar
silenciosamente una fuente favorable entre declaraciones contradictorias. Si D22
no respalda cada atributo o falta duración, el ciclo de la copia se trata como pendiente.
El catálogo público y la entrada permanecen intactos.

Si el validador existente rechaza el catálogo (p. ej. ventana o fuente null), se
conservan los IDs legibles como no evaluables y se registran los módulos omitidos.
No se relaja el validador. D6 no tiene constructor aprobado: se valida el clima usando
`validarClima`, conservando íntegros origen, coordenadas, fechas, unidades, cobertura,
fuentes y nulls. No se calculan agregados, percentiles ni escenarios agrícolas.
D7 y Minimax no se ejecutan en esta fachada real. D7 sintético conserva sus pruebas.

## Ejemplo incompleto

Con catálogo legado, `finca: { mesInicio: 5, suelo: 'desconocido' }` y `clima: null`,
esta proyección de la respuesta muestra los campos de consumo inmediato; el retorno
también incluye todos los detalles de `trazabilidad` descritos arriba:

```json
{
  "estadoPreparacion": "incompleto",
  "metodologiaRealHabilitada": false,
  "ganadoras": [],
  "estrategias": [
    {
      "estrategiaId": "E1",
      "elegibilidadEstado": "no_evaluable",
      "motivosDescarte": [],
      "puntajes": { "habitual": null, "seco": null, "humedo": null }
    },
    {
      "estrategiaId": "E2",
      "elegibilidadEstado": "no_evaluable",
      "motivosDescarte": [],
      "puntajes": { "habitual": null, "seco": null, "humedo": null }
    },
    {
      "estrategiaId": "E3",
      "elegibilidadEstado": "no_evaluable",
      "motivosDescarte": [],
      "puntajes": { "habitual": null, "seco": null, "humedo": null }
    }
  ]
}
```

Las razones incluyen `METODOLOGIA_REAL_NO_HABILITADA`,
`EVIDENCIA_ATRIBUTOS_INSUFICIENTE`, motivos D5 de duración faltante y el respaldo
de secuencia D20 faltante. `datosFaltantes` identifica días/evidencia por ciclo,
`metodologia.D6`, `metodologia.D7` y `clima`.

## Verificación y decisiones pendientes

Pruebas nuevas en `simulation/evaluar-preparacion-simulacion.test.js`: legado con
captura NASA backup (sin red), clima ausente, datos de finca desconocidos, catálogo
futuro, fixtures sintéticos completos, incompatibilidad, indeterminación, cruce de
año, catálogo inválido, D22 inválido, inmutabilidad/determinismo y rechazo D7 real.
Pruebas previas D7 conservan sus aserciones numéricas.

Se instaló el lockfile backend con `npm ci --prefix backend --ignore-scripts --no-audit --no-fund`
porque faltaba Express. No se modificaron dependencias ni lockfile. El primer
`npm test --prefix backend` tuvo tres fallos de carga por esa ausencia; tras instalar,
la suite se ejecuta completa. Los conteos finales y el SHA probado se entregan con
el commit, no se reutilizan conteos históricos.

Pendientes científicos: ratificación de D6/D7, definición de escenarios y agregación
temporal, suficiencia de cobertura, indicadores/unidades/direcciones/rangos, pesos
por prioridad y fuentes específicas; autenticidad y calidad de evidencia D20/D22.
Nada de ello se resuelve con un test sintético o una referencia existente.
