# Entrega climática de Samuel para Hellen

Fecha: 15 de noviembre de 2026. Trabajo realizado en copia independiente de este chat;
no se accedió a `/home/panterita/Proyectos/Cultivitos` ni se modificó la computadora de Samuel.

## Rama y base

- Rama local: `feat/backend-samuel`.
- Base: `origin/feat/backend-alex`, `0230aa353642622f5b7cf8783c0b31bba7ffc817`.
- Frontend contrastado: `8692cb186be3d05c9ff97909e357b4ef6b1cd98e`.
- Última rama Hellen observada tras fetch: `9ab35ff` (añade auditoría/propuesta D7).
- Su validador climático coincide byte a byte con `57b58d0`, usado para la ejecución del consumidor.
- Cambios sin commit, sin push, sin merge ni modificación de ramas ajenas.

## Archivos y motivo

| Archivo | Cambio |
|---|---|
| backend/src/services/nasa/nasa.service.js | Validación estricta, coordenadas exactas, calendario completo, unidades explícitas, origen, timeout, caché y respaldos verificables. |
| backend/src/controllers/climate.controller.js | Recibir la consulta contractual, envoltura `{clima, fuente}`, errores HTTP claros. |
| backend/src/routes/climate.routes.js | Factoría para probar HTTP real con proveedor controlado. |
| backend/src/app.js | Inyección opcional del servicio climático; arranque normal conservado. |
| backend/src/services/simulation/simulation.service.js | Nombre correcto de coordenadas y período piloto; origen null sin clima, fuentes conservadas; dependencias sustituibles solo para pruebas. No implementa D7. |
| backend/test/climate.test.js | 16 pruebas nuevas de transporte, respaldo, validación y procedencia. |
| backend/scripts/check-climate-http.mjs | Comprobación manual HTTP live sin fallback o offline con respaldo. No escribe cachés. |
| backend/scripts/check-climate-consumers.mjs | Ejecuta los adaptadores reales de frontend y dominio recibidos por ruta. |
| backend/data/backups/README.md y nasa-v1-*.json | Captura original NASA revisada, adquisición y límites. |
| docs/contrato-api.md | Contrato implementado de clima y ausencia de procedencia en simulación. |
| docs/verificacion/*.json | Resultados de HTTP live, HTTP offline y comprobación de consumidores. |
| docs/entrega-clima-samuel.md | Esta entrega y pendientes. |

No se modificaron backend/src/domain/, docs/metodologia/, catálogo, frontend, dependencias,
lockfiles ni archivos NASA antiguos. No se incluyeron .env, claves, node_modules o cachés de ejecución.

## Contrato final implementado

Ver sección «Historial climático implementado» en docs/contrato-api.md.

Entrada: latitude, longitude, start y end obligatorios. Salida HTTP `{ clima, fuente }`;
series diarias inclusivas con nulls explícitos, unidades y transformaciones, coordenadas
originales y las efectivamente devueltas por NASA, fuente fechada y cobertura por variable.
Errores 400/502/504 sin ubicación por defecto ni falsa procedencia live.

Se preserva el contrato mm/°C de ambos consumidores. PRECTOTCORR original mm/day se
integra sobre cada intervalo de un día LST a mm por día observado, sin cambiar su valor
numérico, conservando unidadOriginal y transformacion. No es una aceptación silenciosa
de unidades alternativas ni una conversión de meses a días agrícolas.

Ejemplo REAL completo de tres días, metadatos y valores: docs/verificacion/clima-http-real.json.
No es un escenario D6 ni una puntuación D7.

## Pruebas y resultados exactos

| Verificación | Resultado |
|---|---|
| Backend antes de editar, `npm test --prefix backend` | 12 aprobadas, 0 fallidas. |
| Backend después de editar, mismo comando | 28 aprobadas, 0 fallidas: 12 anteriores + 16 nuevas. |
| Frontend publicado, `node --test frontend/tests/*.test.mjs` en su worktree | 49 aprobadas, 0 fallidas. No son E2E. |
| Consumidores ejecutados sobre respaldo real y simulación controlada | 4/4: frontend clima, dominio clima, frontend origen null y frontend backup. |
| HTTP local con NASA simulado | 200 ubicación exacta, 400 entradas inválidas antes de llamar proveedor, 502 vacío/fallo/JSON inválido, 504 timeout incluido cuerpo, 200 backup validado. |
| HTTP local con NASA REAL, sin caché ni respaldo | 200 live, 10.631234/-85.441234, período 20240101–20240103. |
| HTTP local offline sobre captura NASA REAL | 200 backup, 10.63/-85.44, período 20150101–20241231, 3653 días por variable. |

La primera ejecución nueva tuvo una aserción estricta de igualdad de porcentajes
que difería en ~7e-15 por orden de operaciones IEEE-754. Se corrigió la prueba para
comparar con tolerancia 1e-12, manteniendo exactos los conteos y las fechas. No se
relajaron las validaciones climáticas ni se cambió el cálculo para ocultar datos faltantes.

No se ejecutó navegador, E2E, build ni despliegue: esta rama parte del backend de Alex
y no incorpora el frontend de Samuel. No se llamó a IA; simulación se probó con
explicación controlada. No se certifica el recorrido completo ni la integración D7.

## Datos reales disponibles

1. Captura NASA Liberia: consulta 10.63/-85.44, 20150101–20241231; finalizada
   2026-11-15T16:57:05.131Z. Tres variables × 3653 registros presentes (100% por variable).
   Geometry de NASA: 10.63/-85.44. Raw original preservado en backend/data/backups/.
2. Comprobación HTTP en otro punto: solicitud 10.631234/-85.441234; NASA devuelve
   10.631/-85.441. Período 20240101–20240103. Fuente y fecha exactas en el JSON
   de verificación. Conservar ambos pares evita mentir sobre el redondeo del proveedor.
3. Solo estos datos climáticos están verificados en esta entrega. Son históricos de
   grilla, no mediciones de parcela, pronóstico, normal oficial ni validación agrícola.
4. Los dos archivos antiguos de Alex tienen 3653 registros por variable y fechas en
   las variables, pero no permiten reconstruir la respuesta original. Se mantienen
   intactos; no se usan rellenando procedencia supuesta. San José no tiene todavía
   un respaldo nuevo revisado.
5. No se inventó suficiencia de cobertura para D6: una serie parcialmente ausente se
   entrega con nulls. Solo la ausencia total de valores utilizables produce NASA_NO_DATA.
6. Caché sin TTL: toda reutilización se etiqueta backup y muestra edad. La política
   de actualización queda pendiente; los nombres incluyen toda la consulta exacta.

## Estado del catálogo, sin modificaciones

- `data/catalog.json`: versión `1.0.0-piloto`, no `1.1.0-provisional`.
- `duracionMeses`: maíz 4, frijol 3 y sorgo 4; no se convirtieron a duracionDias.
- Fuentes: src_nasa_power y src_piloto_fao; esta última tiene URL null y una nota
  general FAO/MAG, insuficiente para tratarla como evidencia agrícola verificada.
- El controlador GET /api/catalog sigue buscando backend/data/catalog.json, que no
  existe; el servicio de simulación usa data/catalog.json. Es un bloqueo conocido
  fuera del alcance climático de esta entrega; debe corregirse en tarea posterior.

## Pendientes para Hellen y la integración

- Revisar y ratificar esta representación climática con Hellen; que los validadores
  la acepten no equivale a acuerdo metodológico. No se alteró su dominio.
- D6: definir qué función obtiene indicadores/escenarios desde las series, con fuentes
  y tratamiento explícito de cobertura insuficiente. No está implementado aquí.
- D7: acordar entrada/salida definitiva de la propuesta 9ab35ff antes de conectarla.
- Conservar cambios mínimos de procedencia al integrar el nuevo servicio de simulación
  de Hellen; no reemplazar su futura implementación por este archivo completo.
- Catálogo, D5/D18/D19/D20/D22, parámetros, pesos y evidencia siguen pendientes según
  la entrega de dominio. La simulación real actual continúa incompleta y sin ganadoras.
- IA de Alex sigue con duplicación y sin timeout: no se añadieron funciones de IA ni
  se resolvió ese trabajo en esta tarea. Tampoco se configuró despliegue.

## Reproducción

En esta rama:

```bash
npm ci --prefix backend
npm test --prefix backend
node backend/scripts/check-climate-http.mjs --offline
node backend/scripts/check-climate-http.mjs --live 10.631234 -85.441234 20240101 20240103
```

En el entorno del chat se utilizó Node 24.22.1 y `--use-env-proxy` para la consulta live,
por la red de ejecución; no se exige ese flag para Linux Mint ni se cambia Node del usuario.
El proyecto conserva su requisito Node >=22.12.

Para verificar consumidores en worktrees separados, pasar sus carpetas explícitamente:

```bash
node backend/scripts/check-climate-consumers.mjs /ruta/frontend /ruta/backend/src/domain
```

No requiere claves de NASA ni IA. --live desactiva los respaldos para que una respuesta
200 no pueda confundirse con una consulta nueva cuando realmente proviene de copia.
