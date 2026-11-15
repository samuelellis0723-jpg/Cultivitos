# Auditoría D7: cálculo de puntuaciones

**Estado:** existe un mecanismo experimental en `backend/src/domain/simulation/puntuacion-d7.js`, habilitado solo para `prueba_sintetica`. D7 no está implementado ni aprobado como cálculo agronómico y el modo real está deshabilitado. Las pruebas nuevas se describen abajo; los conteos de ejecución se reportan fuera de esta auditoría.

## Qué existe hoy

### Motor Minimax regret

`backend/src/domain/simulation/minimax-regret.js`, función `calcularMinimaxRegret(entrada)`, recibe una lista explícita de escenarios y estrategias ya marcadas como elegibles/no elegibles, con puntuaciones ya calculadas. Valida la forma de entrada y que las puntuaciones numéricas estén en `[0, 100]`; para cada escenario halla la mejor puntuación, calcula arrepentimientos y peor arrepentimiento, conserva empates y devuelve ganadoras. Si una estrategia no es elegible, no participa; si falta una puntuación de una estrategia elegible, el resultado es `incompleto`, con `null` y sin ganadoras. Si ninguna estrategia es elegible, devuelve `sin_opciones`.

Minimax **no** construye escenarios, consulta ni interpreta clima, calcula una puntuación a partir de indicadores, decide pesos o normalización, valida fuentes agronómicas ni convierte prioridad de finca en una regla de puntuación. No prueba que una matriz de puntos sea científicamente válida. Su entrada ya contiene las puntuaciones.

`backend/src/domain/simulation/minimax-regret.test.js` contiene pruebas para la matriz ficticia del contrato, empates, descartes, puntuaciones ausentes, rango, forma, inmutabilidad y determinismo. La matriz es una prueba del algoritmo, no D7 ni evidencia agrícola. Estas pruebas fueron inspeccionadas, no ejecutadas para esta auditoría.

### Validaciones de dominio disponibles

- `backend/src/domain/catalog/validar-catalogo.js`, `validarCatalogo()`: valida estructura general de catálogo, fuentes y referencias, ciclos, ventanas/duraciones, pasos de estrategias y campos de cada parámetro (`id`, `valor`, `unidad`, `fuenteId`). No define la semántica agronómica de los parámetros, no decide cuáles son esenciales, ni contiene fórmula, pesos o normalización D7.
- `backend/src/domain/simulation/validar-clima.js`, `validarClima()`: valida el contrato climático, series, procedencias y coherencia de cobertura. No construye escenarios ni fija cobertura mínima.
- `backend/src/domain/simulation/elegibilidad.js`, `evaluarElegibilidad()` y `evaluarElegibilidadEstrategia()`: valida datos de finca/catálogo y determina elegibilidad/motivos bajo las reglas codificadas. No calcula puntos climáticos.
- `backend/src/domain/simulation/compatibilidad-temporal.js`, `evaluarCompatibilidadTemporal()`: calcula estados de compatibilidad temporal a partir de ventanas y duraciones. No calcula impacto de clima ni D7.

`backend/src/domain/simulation/puntuacion-d7.js`, `calcularPuntuacionesD7()`, añade validación y puntuación configurable para fixtures sintéticos: exige explícitamente los tres escenarios, indicador/rango/unidad/fuente, pesos para las tres prioridades y suma de pesos por prioridad; deja `null` con motivo si falta cualquier indicador requerido; y no exige observaciones de estrategias descartadas. La resolución de `fuenteIds` comprueba únicamente que el identificador esté declarado en la evidencia sintética. **No comprueba calidad, pertinencia o validez científica de la fuente.** Rechaza `modo: "real"` con `MODO_NO_HABILITADO_D7`; no ofrece una ruta de demo.

Las pruebas correspondientes (`validar-catalogo.test.js`, `validar-clima.test.js`, `elegibilidad.test.js`, `compatibilidad-temporal.test.js` y `puntuacion-d7.test.js`) cubren módulos por separado. Su existencia no demuestra que haya un flujo integrado que los ejecute juntos.

## Lo que falta integrar

El mecanismo experimental calcula a partir de indicadores por estrategia/escenario ya suministrados, pero no construye esos indicadores a partir de `{finca, clima, catalogo}` ni deriva escenarios D6. Tampoco hay un orquestador documentado que valide esas dependencias, seleccione datos reales y lleve un resultado a `POST /api/simulations`. El README y `docs/contrato-api.md` siguen clasificando catálogo, clima y simulación como pendientes o contratos propuestos; el único endpoint declarado implementado es health.

La integración futura debe ordenar explícitamente: validar entrada; validar clima/catálogo; resolver elegibilidad y compatibilidad; construir o recibir escenarios según D6; producir los indicadores con reglas aprobadas; puntuar solo estrategias elegibles con datos completos; y pasar esas puntuaciones a Minimax. El módulo actual recibe solo modo sintético. La forma pública y los campos nuevos requieren acuerdo de integración conforme a `docs/contrato-api.md` y D10 de `contratos-dominio.md`.

## Insumos pendientes de D7

Antes de asignar puntuaciones reales se necesitan, como mínimo:

1. Indicadores que intervienen y su definición operacional, unidad, escala, dirección favorable y procedencia.
2. Parámetros explícitos para convertir cada indicador en `[0, 100]` (por ejemplo, límites y función de transformación), junto con fuente y versión. La elección matemática también requiere decisión documentada; no equivale por sí sola a validez agronómica.
3. Lista de parámetros necesarios por estrategia/indicador, procedencia verificable de sus valores y regla para declarar un valor no disponible.
4. Reglas explícitas para `equilibrio`, `agua` y `suelo`: qué indicadores afectan cada prioridad y con qué pesos. Los pesos deben justificarse, aprobarse y sumar según una regla explícita; no hay pesos actuales que se puedan reutilizar.
5. Vínculo aprobado entre cada indicador y los escenarios D6 (`habitual`, `seco`, `humedo`), sin tratarlos como probabilidades ni usar pronósticos como historia de temporada.
6. Reglas para valores fuera de escala, fechas/ventanas, datos faltantes, evidencias parciales y fuentes no válidas. No se deben renormalizar silenciosamente los pesos cuando falta un dato.
7. Versiones identificables de reglas y catálogo, y evidencia suficiente para reproducir una puntuación.

`docs/metodologia/contratos-dominio.md` §2.6, §5, §6, §7 y §10 deja pendientes la semántica y combinación de parámetros, D6/D7 y decisiones relacionadas. La escala `0–100` y dirección «mayor es mejor» aparecen acordadas en §0.3; eso no define cómo llegar a una puntuación.

## Implementable como mecanismo frente a lo bloqueado

El mecanismo de entrada/salida, validaciones de tipos/rangos/completitud, normalización configurable, combinación explícita, motivos de `null`, trazabilidad referencial, inmutabilidad y composición con Minimax están implementados para datos sintéticos. La normalización lineal y la media ponderada son una **PROPUESTA DE INGENIERÍA PENDIENTE**, no reglas ratificadas. Los fixtures se etiquetan **SOLO PARA PRUEBAS; SIN VALIDEZ AGRONÓMICA**. La puntuación real sigue bloqueada hasta contar con las decisiones agronómicas y de integración enumeradas arriba; el código no infiere ni valida científicamente esos elementos.

La puntuación real queda bloqueada hasta contar con indicadores, parámetros y fuentes justificadas, pesos por prioridad aprobados, escenarios D6 definidos, reglas para faltantes y decisiones de integración ratificadas. No sustituir esos datos con valores predeterminados, ejemplos del contrato ni fixtures del validador.

## Criterios verificables para aceptar una futura implementación D7

1. Para aceptación del mecanismo experimental: puntuaciones exactas de fixture para tres prioridades/escenarios; otro rango; dirección menor_mejor y extremos; faltantes; descartes; validaciones; inmutabilidad y determinismo; rechazo de modo real.
2. Para composición: prioridad agua entrega a Minimax arrepentimientos A=30, B=10 y ganadora B; matriz incompleta produce `incompleto` y ninguna ganadora.
3. Para integración real futura: definir/citar indicadores y parámetros, ratificar normalización y pesos, escenario D6, completitud y manejo de fuentes; habilitar el modo real solo tras esas decisiones.
4. Acordar la orquestación HTTP y mapear `puntuaciones` internas a `puntajes` de la API sin cambiar el contrato unilateralmente.

## Referencias

- `backend/src/domain/simulation/minimax-regret.js`: `calcularMinimaxRegret()` y validación de la matriz recibida.
- `backend/src/domain/simulation/puntuacion-d7.js`: `calcularPuntuacionesD7()` experimental, con modo real deshabilitado.
- `backend/src/domain/simulation/puntuacion-d7.test.js`: fixtures de puntuación y composición con Minimax.
- `backend/src/domain/catalog/validar-catalogo.js`: `validarCatalogo()` y `validarParametrosPuntuacion()`.
- `backend/src/domain/simulation/validar-clima.js`: `validarClima()` y validación de cobertura.
- `backend/src/domain/simulation/elegibilidad.js`: `evaluarElegibilidad()` y `evaluarElegibilidadEstrategia()`.
- `backend/src/domain/simulation/compatibilidad-temporal.js`: `evaluarCompatibilidadTemporal()`.
- `backend/src/domain/simulation/minimax-regret.test.js`: pruebas sintéticas del motor Minimax.
- `docs/contrato-api.md`: salida ficticia `demo` y contrato de simulación propuesto.
- `docs/metodologia/contratos-dominio.md` §0.3, §2.6, §5–§7 y §10: decisiones acordadas, asuntos pendientes y límites.
