# Auditoría D7: cálculo de puntuaciones

**Estado:** D7 no está implementado como cálculo agronómico integrado. Esta auditoría describe módulos locales inspeccionados y los requisitos pendientes; no afirma que se hayan ejecutado sus pruebas en esta revisión.

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

Las pruebas correspondientes (`validar-catalogo.test.js`, `validar-clima.test.js`, `elegibilidad.test.js` y `compatibilidad-temporal.test.js`) describen validaciones de esos módulos. Su existencia no demuestra que haya un flujo integrado que los ejecute juntos, y no se ejecutaron como parte de esta revisión documental.

## Lo que falta integrar

No se encontró en los módulos de dominio inspeccionados una función D7 que transforme indicadores por estrategia/escenario y prioridad en puntuaciones. Tampoco hay un orquestador documentado que tome `{finca, clima, catalogo}`, valide sus dependencias, calcule todas las puntuaciones y las entregue a `calcularMinimaxRegret`. El README y `docs/contrato-api.md` siguen clasificando catálogo, clima y simulación como pendientes o contratos propuestos; el único endpoint declarado implementado es health.

La integración futura debe ordenar explícitamente: validar entrada; validar clima/catálogo; resolver elegibilidad y compatibilidad; construir o recibir escenarios según D6; puntuar solo estrategias elegibles con datos completos; y pasar esas puntuaciones a Minimax. La forma pública y los campos nuevos requieren acuerdo de integración conforme a `docs/contrato-api.md` y D10 de `contratos-dominio.md`.

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

Se puede desarrollar y probar, con datos sintéticos claramente aislados, el mecanismo de entrada/salida, validaciones de tipos/rangos/completitud, normalización configurable, combinación explícita, motivos de `null`, trazabilidad, inmutabilidad y adaptación a Minimax. Una fórmula o esquema matemático no ratificado debe etiquetarse **PROPUESTA DE INGENIERÍA PENDIENTE**, y los parámetros de sus pruebas deben etiquetarse **SOLO PARA PRUEBAS; SIN VALIDEZ AGRONÓMICA**.

La puntuación real queda bloqueada hasta contar con indicadores, parámetros y fuentes justificadas, pesos por prioridad aprobados, escenarios D6 definidos, reglas para faltantes y decisiones de integración ratificadas. No sustituir esos datos con valores predeterminados, ejemplos del contrato ni fixtures del validador.

## Criterios verificables para aceptar una futura implementación D7

1. Con configuración completa y sintética, la función produce valores reproducibles por estrategia y por cada uno de los tres escenarios; la aritmética está comprobada en pruebas.
2. Tres casos distinguen las prioridades `equilibrio`, `agua` y `suelo` mediante la configuración recibida, sin pesos ocultos.
3. Falta un indicador requerido ⇒ puntuación de esa estrategia/escenario `null` con motivo estable; no se reescalan los pesos restantes. Minimax no declara ganadora si la matriz elegible queda incompleta.
4. Tipos incorrectos, rangos invertidos, pesos inválidos/no normalizados, unidades incompatibles, parámetros ausentes o referencias de fuente desconocidas se rechazan como entrada/configuración inválida, no se interpretan como cero.
5. Una estrategia descartada mantiene su motivo y no entra al cálculo; esto se distingue de una estrategia elegible sin datos suficientes.
6. Se verifica inmutabilidad y determinismo con pruebas.
7. La evidencia de salida identifica modo, escenario, versiones de reglas/catálogo, valores/unidades usados y fuentes; modo demo/prueba no puede presentarse como resultado real.
8. Hay pruebas de frontera para 0 y 100, todos los escenarios y cada prioridad, además de faltantes e insumos inválidos.
9. La integración conserva el contrato de la API: Minimax usa `puntuaciones` internamente; la propuesta pública de `docs/contrato-api.md` nombra el mapa `puntajes`. El adaptador debe mapearlo explícitamente, sin alterar unilateralmente el contrato.

## Referencias

- `backend/src/domain/simulation/minimax-regret.js`: `calcularMinimaxRegret()` y validación de la matriz recibida.
- `backend/src/domain/catalog/validar-catalogo.js`: `validarCatalogo()` y `validarParametrosPuntuacion()`.
- `backend/src/domain/simulation/validar-clima.js`: `validarClima()` y validación de cobertura.
- `backend/src/domain/simulation/elegibilidad.js`: `evaluarElegibilidad()` y `evaluarElegibilidadEstrategia()`.
- `backend/src/domain/simulation/compatibilidad-temporal.js`: `evaluarCompatibilidadTemporal()`.
- `backend/src/domain/simulation/minimax-regret.test.js`: pruebas sintéticas del motor Minimax.
- `docs/contrato-api.md`: salida ficticia `demo` y contrato de simulación propuesto.
- `docs/metodologia/contratos-dominio.md` §0.3, §2.6, §5–§7 y §10: decisiones acordadas, asuntos pendientes y límites.
