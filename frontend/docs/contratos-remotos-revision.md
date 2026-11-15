# Revisión de contratos en ramas remotas

Revisión del 15 de noviembre de 2026 después de `git fetch origin`. No se
fusionaron ramas ni se editaron archivos de backend o dominio.

## Commits y código consultados

- Alex: `c56c652f960658664db863d7dba09b93eeef711e`, último commit publicado
  de `origin/feat/backend-alex` (simulación POST, motor y modo demo). También
  se consultaron `backend/src/controllers/climate.controller.js`,
  `backend/src/services/nasa/nasa.service.js` y `data/catalog.json` en ese
  mismo commit.
- Hellen: `d0400af`, último commit publicado de `origin/feat/domain-hellen`.
  Se consultaron `docs/metodologia/contratos-dominio.md`,
  `backend/src/domain/simulation/validar-clima.js` y
  `backend/src/domain/catalog/validar-catalogo.js`.
- El contrato API de Alex sigue describiendo el historial sin una envoltura
  `{ clima, fuente }`; no se encontró publicada esa forma en el controlador.

## Lo publicado y cómo lo consume el frontend

- Alex devuelve en simulación `estado: "incompleto"`, puntajes `null`,
  `motivosNoCalculable`, `ganadoras: []` y evidencia con origen/versiones.
  El frontend conserva esos motivos, muestra las estrategias sin ganadora y
  presenta como provisional las estrategias cuyo catálogo tiene la lista de
  `parametrosPuntuacion` vacía. La prueba de contrato usa esta forma publicada.
- El modo demo sigue separado: `estado: "demo"`, evidencia `origen: "demo"`
  y explicación que identifica la matriz ficticia. No se considera una
  recomendación real.
- El adaptador admite la envoltura HTTP `{ clima, fuente }` solicitada,
  valida el objeto `clima` antes de usarlo y conserva literalmente el campo
  `fuente`. Las mismas reglas de unidades y procedencia aplican al clima
  envuelto y al no envuelto.
- Una duración `null` se presenta como “Duración: Pendiente de validación”
  para `duracionMeses` o `duracionDias`; nunca se convierte en cero.

## Diferencias que bloquean la integración conjunta

1. **Envoltura y fuente:** el controlador climático publicado hace
   `res.json(climateData)`, sin `{ clima, fuente }`. La envoltura esperada no
   está publicada todavía.
2. **Ubicación en historial:** el controlador lee `lat`/`lon`, mientras el
   frontend y `docs/contrato-api.md` envían `latitude`/`longitude`. Al usar
   esos nombres, el controlador cae en coordenadas predeterminadas; el
   frontend rechaza correctamente el resultado si no corresponde a la
   ubicación elegida.
3. **Metadatos climáticos:** el servicio publicado entrega en cada fuente
   `id`, `proveedor`, `urlConsulta` y `origen`; faltan metadatos exigidos por
   el validador publicado de Hellen: coordenadas solicitadas/devueltas,
   período, unidades, fecha de consulta y cobertura a nivel de fuente. El
   adaptador estricto del frontend tampoco acepta esa respuesta incompleta.
   Además, el servicio añade al nivel raíz `origen: "nasa_power_api"` o
   `origen: "cache_local"`; esos valores describen el camino de conexión y
   no pertenecen al vocabulario de procedencia (`live`/`backup`/`demo`/`mixed`)
   validado por Hellen. El frontend no los convierte automáticamente en
   procedencia de datos.
4. **Precipitación:** el código NASA de Alex publicado emite `mm`, y el
   validador de clima de Hellen publicado exige `mm`. Por tanto, el supuesto
   conflicto con `mm/día` no aparece en estos commits. El frontend no acepta
   `mm/día`; si Alex lo emite en otro código aún no publicado, debe acordarse
   y publicarse una unidad única con Hellen antes de integrarlo.
5. **Catálogo/ciclos:** `data/catalog.json` publica `version:
   "1.0.0-piloto"`, campos `duracionMeses` con números y estrategias con
   `parametrosPuntuacion: []`. No publica `1.1.0-provisional`, `duracionDias`
   ni ciclos `v0.2`. Hellen también valida actualmente `duracionMeses` (que
   puede ser `null`), no `duracionDias`. Ventanas y estrategias siguen
   pendientes de validación según su contrato; el frontend las identifica
   como provisionales cuando no tienen parámetros de puntuación.

Para la prueba conjunta, Alex debe publicar la envoltura acordada, aceptar
`latitude`/`longitude` o coordinar los nombres y completar los metadatos de
fuentes; Alex y Hellen deben publicar el esquema/versionado de catálogo y
resolver la unidad de precipitación si cambia. Hellen debe cerrar las reglas,
ventanas y estrategias antes de que el frontend pueda presentar resultados
reales como recomendaciones.
