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
  3. Terminal 2: `npm run dev:frontend` (`http://127.0.0.1:5173`).
- **Ejecución local compilada** (mismo origen en Express):
  1. `npm run build --prefix frontend` (genera `frontend/dist`).
  2. `SERVE_STATIC_FRONTEND=1 node backend/src/server.js` (sirve `/api/*` y SPA en `http://127.0.0.1:3000`).
- Variables opcionales: `PORT`, `HOST`, `SERVE_STATIC_FRONTEND`, `OPENAI_API_KEY` (opcional; sin clave usa explicación determinista).

## Verificaciones y estado
- `npm test --prefix backend` (incluye prueba HTTP de compilado estático y D10).
- `node backend/scripts/check-climate-consumers.mjs frontend backend/src/domain`.
- `npm test --prefix frontend` (incluye pruebas D10 en `adapters.js`).
- `npm run build --prefix frontend`.
- Playwright E2E interceptado (`playwright.config.js`) e integración Express con respaldo real de Liberia (`playwright.integration.config.js`, escritorio y móvil).

## Pendientes y límites científicos
- **Integración de fachada de dominio de Hellen**: pendiente de recibir su SHA para conectar la fachada desde `simulation.service.js`; actualmente la evaluación real reporta `incompleto` honesto sin reglas agronómicas conectadas.
- **Metodología agrícola real (D7)**: no habilitada; las puntuaciones reales y recomendaciones agronómicas siguen pendientes de ratificación científica.
- **`GET /api/climate/forecast`**: pendiente de implementación en backend.
- **Despliegue público**: no configurado (requiere proveedor/alojamiento acordado); se probó únicamente build y ejecución local compilada en Express.
