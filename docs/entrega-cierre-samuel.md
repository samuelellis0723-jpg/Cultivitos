# Entrega de cierre MVP técnico · Samuel (`feat/cierre-mvp-samuel`)

## Alcance implementado
- **Diagnóstico de elegibilidad D10** de extremo a extremo (`backend/src/services/simulation/simulation.service.js`, `frontend/src/services/adapters.js`, `frontend/src/components/comparison/StrategyCard.jsx`, `frontend/src/components/climate/ScenarioTabs.jsx`):
  - En modo `real` (sin metodología D7 habilitada), las estrategias reportan `elegible: null` y `elegibilidadEstado: "no_evaluable"` con `puntajes: null`, `peorArrepentimiento: null`, `ganadoras: []` y `estado: "incompleto"`, sin forzar `elegible: true` ni invocar Minimax con datos artificiales.
  - En modo `demo`, la matriz ficticia `E1`/`E2`/`E3` mantiene `elegible: true`, `elegibilidadEstado: "elegible"`, arrepentimientos `45`/`25`/`10` y ganadora `["E3"]`.
  - La UI distingue `Descartada` (`elegible === false`) de `Elegibilidad no evaluable` (`elegible === null`), y el adaptador rechaza `sin_opciones` si existen estrategias `no_evaluable` (insuficiencia prevalece sobre `sin_opciones`).
- **Servicio de compilación en mismo origen** (`backend/src/app.js`):
  - Cuando `SERVE_STATIC_FRONTEND=1` (o se pasa `staticDir`), Express sirve `frontend/dist` y resuelve rutas SPA (`/`, `/explora`, `/compara`) hacia `index.html`, manteniendo `/api/*` desconocido en `404` JSON.

## Arranque y configuración (sin secretos)
- **Desarrollo** (proxy Vite `/api` → Express):
  1. `npm run setup` (instala dependencias de `backend/` y `frontend/` desde lockfiles).
  2. Terminal 1: `npm run dev:backend` (`http://127.0.0.1:3000`).
  3. Terminal 2: `VITE_HISTORY_START=20150101 VITE_HISTORY_END=20241231 npm run dev:frontend` (`http://127.0.0.1:5173`).
- **Ejecución local compilada** (mismo origen en Express):
  1. `VITE_HISTORY_START=20150101 VITE_HISTORY_END=20241231 npm run build --prefix frontend` (genera `frontend/dist`).
  2. `SERVE_STATIC_FRONTEND=1 node backend/src/server.js` (sirve `/api/*` y SPA en `http://127.0.0.1:3000`).
Vite incorpora las variables `VITE_HISTORY_START` y `VITE_HISTORY_END` durante el build. Configurarlas solo al iniciar Express no cambia el bundle; hay que recompilar. Sin período explícito el historial queda pendiente, sin fechas o ubicación implícitas. Ver `frontend/.env.example`.

- Variables opcionales: `PORT`, `HOST`, `SERVE_STATIC_FRONTEND`, `OPENAI_API_KEY` (opcional; sin clave usa explicación determinista).

## Verificaciones y estado

Ejecutar secuencialmente desde la raíz (Playwright desde `frontend`):

```bash
npm test --prefix backend
node backend/scripts/check-climate-consumers.mjs frontend backend/src/domain
npm test --prefix frontend
VITE_HISTORY_START=20150101 VITE_HISTORY_END=20241231 npm run build --prefix frontend
cd frontend
npx playwright test --config playwright.integration.config.js
npx playwright test
cd ..
git diff --check
```

La integración Express sirve el build recién generado en el puerto 5185, sin Vite. Usa el respaldo real revisado de Liberia 2015–2024, adquirido el 2026-11-15T16:57:05.131Z; NASA e IA están desactivadas y no escribe caché. La suite E2E usa fixtures interceptados o demo local sin conexión en el puerto 5174. Ninguna de estas pruebas verifica proveedores en vivo. Los puertos deben estar libres; no detener servidores ajenos.

## Pendientes y límites científicos
- **Fachada de dominio de Hellen (`7033092`)**: integrada en `simulation.service.js` (`evaluarPreparacionSimulacion({ finca, catalogo, clima })`), conservando `evidencia.modulos`, `datosFaltantes` y `elegible: null` / `elegibilidadEstado: 'no_evaluable'` en modo `real`. `evidenciaAtributos` enviado por HTTP se ignora (respuesta 200 para una petición válida); no se usa como evidencia confiable ni se rechaza por su presencia.
- **Metodología agrícola real (D6/D7)**: no habilitada; las puntuaciones reales y recomendaciones agronómicas siguen pendientes de ratificación científica.
- **`GET /api/climate/forecast`**: pendiente de implementación en backend.
- **Despliegue público**: no configurado (requiere proveedor/alojamiento acordado); se probó únicamente build y ejecución local compilada en Express.

## Correcciones de revisión

- Demo local sin conexión alineada con HTTP: E1/E2/E3, matriz 90/35/55, 75/80/50 y 80/70/75; arrepentimientos 45/25/10 y ganadora E3. Todo sigue siendo ficticio, sin atribución a NASA.
- Comparaciones guardadas del formato local reconocido `demo-0.2` con A/B/C se identifican como demostraciones históricas y conservan sus IDs, catálogo y resultado originales. No hay migración ni reescritura de registros reales; las nuevas comparaciones y sus exportaciones usan E1/E2/E3; las exportaciones históricas conservan A/B/C.
- `resultados[].advertencias` se conserva desde HTTP hasta exportación y se muestra por estrategia. Ausencia en registros antiguos equivale a lista vacía; las advertencias no constituyen descartes.
