# Auditoría D6: escenarios climáticos

**Estado:** auditoría documental y propuesta de trabajo. D6 sigue pendiente; este archivo no ratifica umbrales ni implementa la construcción de escenarios.

## Alcance y evidencia revisada

Se revisaron `AGENTS.md`, `README.md`, `docs/contrato-api.md`, `docs/metodologia/contratos-dominio.md` y los validadores/pruebas de `backend/src/domain/simulation/validar-clima.js`.

### Datos reales verificados

En esta revisión no se hizo una consulta a NASA POWER ni se verificó una descarga de datos climáticos reales. Por tanto, no hay aquí una serie real cuya fuente, consulta, coordenadas, período y cobertura puedan certificarse. La dirección general de NASA POWER no basta para atribuirle valores concretos.

### Fixture sintético verificado en el repositorio

`backend/src/domain/simulation/validar-clima.test.js` define diez fechas de prueba del 1 al 10 de enero de 2020 y arrays para precipitación, temperatura media y máxima. Los valores que aparecieron en una versión anterior de esta auditoría son exactamente los del objeto `VALORES` de esa prueba. La prueba genera metadatos con `proveedor: "Proveedor ficticio de pruebas"` y `urlConsulta: "https://example.test/clima"`.

Estos datos sirven para validar forma, tipos, fechas, faltantes y cobertura del validador. **Son sintéticos; no son una descarga de NASA, una observación confirmada de Liberia/Cañas ni evidencia agronómica.** La prueba contiene `origen: "live"` en su fixture, pero el proveedor ficticio y el dominio `example.test` dejan claro que ese literal no acredita una consulta en vivo.

## Qué valida el código de clima

`validarClima()` en `backend/src/domain/simulation/validar-clima.js` revisa estructura, resolución diaria, coordenadas y períodos; exige las variables y unidades definidas por el módulo; y comprueba coherencia entre la serie, sus días esperados/presentes, el porcentaje declarado y las fechas faltantes. También valida procedencia y metadatos de fuentes.

No define un mínimo aceptable de cobertura, no obtiene datos de un proveedor, no decide si una serie es representativa de una localidad y no clasifica condiciones como `habitual`, `seco` o `humedo`. Puede aceptar cobertura baja —incluida una serie de valores todos `null`— si los metadatos y faltantes son coherentes. Una decisión de cobertura mínima requeriría un criterio aprobado y pruebas específicas; no debe inferirse del validador actual.

## Separación de conceptos

- **Historial observado:** mediciones pasadas con proveedor, consulta, coordenadas, período, unidades, fecha de consulta, cobertura y origen trazables. No equivale por sí solo a un escenario.
- **Escenarios hipotéticos:** `habitual`, `seco` y `humedo` son los nombres que aparecen en los contratos. Su definición climática —variables, agregación temporal, método y umbrales— sigue pendiente en D6. No son pronósticos ni tienen probabilidades asignadas.
- **Demo:** la matriz ficticia de `docs/contrato-api.md` y `backend/src/domain/simulation/minimax-regret.test.js` comprueba el algoritmo con puntuaciones de ejemplo; no usa clima observado ni sustenta una recomendación.
- **Pruebas sintéticas:** los fixtures del validador prueban el contrato del dato. No deben presentarse como historial real, demo agronómica ni evidencia de escenarios.

## Métodos posibles, aún no decididos

Se pueden evaluar métodos basados en distribuciones históricas, reglas explícitas acordadas por el equipo u otro método documentado. Esta lista no recomienda ni selecciona uno. No se fijan bandas percentiles, períodos mínimos, umbrales de lluvia/temperatura ni criterios de representatividad: faltan justificación, fuente y aprobación. En particular, percentiles 40–60 no son el rango intercuartil (que, por definición, corresponde a percentiles 25–75); tampoco se adopta esa banda para D6.

El método elegido debe especificar, como mínimo, qué variable o combinación caracteriza cada escenario, la ventana temporal y unidad de agregación, el tratamiento de valores faltantes, la población de referencia, los requisitos de cobertura, las reglas de asignación y la procedencia/versión de esas reglas. Los parámetros no pueden tener valores predeterminados ocultos.

## Datos y decisiones que faltan para D6

1. Una serie histórica utilizable con fuente consultada, coordenadas, período, resolución, unidades, fecha de consulta, origen y faltantes/cobertura por variable. El proveedor y sus límites deben ser verificables.
2. Localidad o ámbito geográfico piloto y regla para aceptar o rechazar datos de otras zonas.
3. Ventana histórica y temporal relevante para el uso previsto, justificadas por evidencia; no se prescribe una duración en esta auditoría.
4. Variables climáticas y agregaciones que distinguirán cada escenario, con unidades y tratamiento de faltantes.
5. Método para derivar `habitual`, `seco` y `humedo`, con parámetros explícitos, fuente/justificación y aprobación del equipo.
6. Política aprobada de cobertura mínima y de comportamiento ante fuente caída, datos parciales y respaldo. El validador actual solo comprueba consistencia.
7. Pruebas con casos sintéticos identificados como tales y, antes de afirmar validez climática local, evidencia observada independiente adecuada.

## Entrega esperada desde la capa backend de Samuel

El backend debe entregar al dominio datos ya normalizados, sin trasladar la consulta HTTP al dominio: series diarias por variable con unidad, fecha, procedencia, períodos, coordenadas solicitadas/devueltas y cobertura/faltantes; fuentes con URL de consulta sin secretos, fecha de consulta y origen (`live` o `backup`); y errores diferenciados de indisponibilidad. Los respaldos deben llevar fecha y origen. Historial y pronóstico deben mantenerse separados. Esta es una necesidad de integración, no una afirmación de que la capa ya esté disponible.

El dominio de Hellen podrá validar esos datos y, una vez D6 sea aprobado, construir escenarios como hipótesis explícitas. No debe atribuir puntuaciones demostrativas a NASA ni convertir indisponibilidad en ausencia de riesgo.

## Referencias locales

- `backend/src/domain/simulation/validar-clima.js`: `validarClima()`, `validarVariables()`, `validarSerie()` y `validarCobertura()`.
- `backend/src/domain/simulation/validar-clima.test.js`: `VALORES`, proveedor ficticio y casos de cobertura, `null` e inmutabilidad.
- `backend/src/domain/simulation/minimax-regret.test.js`: matriz ficticia independiente del origen climático.
- `docs/contrato-api.md`: contratos propuestos de historial, pronóstico y simulación; ejemplo `demo` expresamente ficticio.
- `docs/metodologia/contratos-dominio.md` §5, §6, §7 y §10: separación de clima/escenarios, estados y D6 pendiente.
