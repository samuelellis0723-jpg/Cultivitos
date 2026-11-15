# Pendientes de integración (para Alex y Hellen)

Fecha: 2026-11-14  
Rama frontend: `feat/frontend-samuel`

## Estado observado del backend en el repositorio

- `GET /api/health`: **implementado** (`{"status":"ok","service":"fieldverse-api","version":"0.1.0"}`).
- `GET /api/catalog`: **pendiente** (devuelve 404 en la base actual).
- `GET /api/climate/history`: **pendiente** (devuelve 404 en la base actual).
- `GET /api/climate/forecast`: **pendiente** (devuelve 404 en la base actual).
- `POST /api/simulations`: **pendiente** (devuelve 404 en la base actual).

## Pendientes para Alex (backend / API)

1. **Publicar `GET /api/catalog`** con `{ version, fuentes, opcionesFinca, cultivos, estrategias }`, confirmando si `opcionesFinca` y `localidadPiloto` de `contratos-dominio-v02.md` se incluyen tal cual en el sobre HTTP.
2. **Publicar `GET /api/climate/history?latitude=…&longitude=…&start=YYYYMMDD&end=YYYYMMDD`** confirmando el sobre JSON (`coordenadas.solicitadas/devueltas`, `periodo`, `resolucion`, `origen`, `antiguedadHoras`, `fuentes`, `variables.precipitacion`, `variables.temperaturaMedia`).
3. **Publicar `POST /api/simulations`** recibiendo `{ finca }` y devolviendo la transformación HTTP de la respuesta de dominio (`estado`, `escenarios`, `resultados`, `descartes`, `ganadoras`, `explicacion`, `evidencia`) usando `puntajes` (0–100) y `peorArrepentimiento`.
4. **Publicar `GET /api/climate/forecast?latitude=…&longitude=…`** con `origen`, `fechaEmision`, `fuente` y `dias[]` (si no está listo en la primera entrega, el frontend ya permite continuar con el núcleo histórico).
5. **Confirmar política de antigüedad de `backup`** (`antiguedadHoras`) y convención de huecos (`null` frente a ausencia de fecha).

## Pendientes para Hellen (dominio / catálogo)

1. **Aprobar vocabulario definitivo de `opcionesFinca`** (`suelo`, `drenaje`, `riego`) y confirmar que incluye `desconocido` en cada grupo.
2. **Confirmar formato definitivo de `cultivosAnteriores`**: actualmente el frontend envía un arreglo de IDs de `catalog.cultivos[]` (provisional según `contratos-dominio-v02.md` §3.7).
3. **Definir localidad piloto, cultivos y ciclos aprobados** con sus `fuenteId` reales y `ventanaSiembra`.
4. **Confirmar si habrá desglose por subindicadores** (agua/suelo/estabilidad) en `resultados[]`; mientras no exista en el contrato, el frontend muestra únicamente `puntajes` por escenario (0–100) y `peorArrepentimiento`.
