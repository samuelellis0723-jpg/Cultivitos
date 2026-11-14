# Contrato API · v0.1

Health es el único endpoint implementado. Los demás son contratos propuestos para que cada área trabaje sin esperar a las otras. Cambios deben acordarse con los tres integrantes.

## Implementado

GET /api/health → 200

```json
{"status":"ok","service":"fieldverse-api","version":"0.1.0"}
```

Ruta inexistente → 404 con `error.code` y `error.message`. JSON inválido → 400. No usar un 200 vacío para simular endpoints pendientes.

## Propuestos

- GET /api/catalog: `{cultivos: [], estrategias: [], version: "…", fuentes: []}`.
- GET /api/climate/history?latitude=…&longitude=…&start=YYYYMMDD&end=YYYYMMDD: series y agregados, con unidades y metadatos.
- GET /api/climate/forecast?latitude=…&longitude=…: pronóstico con fechas de validez y origen. No usarlo como historial o escenario de toda una temporada.
- POST /api/simulations: perfil de finca, no puntuaciones calculadas por el navegador.

### Entrada propuesta de simulación

```json
{
  "finca": {
    "latitude": 9.93,
    "longitude": -84.09,
    "suelo": "desconocido",
    "drenaje": "desconocido",
    "riego": "desconocido",
    "cultivosAnteriores": [],
    "mesInicio": 5,
    "prioridad": "equilibrio"
  }
}
```

Coordenadas ilustrativas, no finca validada. Latitud [-90,90], longitud [-180,180], mes 1–12, prioridad: equilibrio / agua / suelo. Los valores de suelo, drenaje y riego se acuerdan con Hellen; el catálogo debe definirlos. No aceptar texto arbitrario como una propiedad agronómica comprobada.

### Salida propuesta de simulación

```json
{
  "estado": "demo",
  "escenarios": ["habitual", "seco", "humedo"],
  "resultados": [
    {"estrategiaId":"A","elegible":true,"puntajes":{"habitual":90,"seco":35,"humedo":55},"peorArrepentimiento":45},
    {"estrategiaId":"B","elegible":true,"puntajes":{"habitual":75,"seco":80,"humedo":50},"peorArrepentimiento":25},
    {"estrategiaId":"C","elegible":true,"puntajes":{"habitual":80,"seco":70,"humedo":75},"peorArrepentimiento":10}
  ],
  "ganadoras": ["C"],
  "explicacion": "Ejemplo ficticio: C tiene el menor peor arrepentimiento.",
  "evidencia": {"origen":"demo","fuentes":[],"supuestos":["Valores ficticios para comprobar el algoritmo"],"datosFaltantes":[],"motorVersion":"demo-0.1"}
}
```

Este ejemplo NO es un endpoint ya implementado ni una recomendación agrícola. No equivale a rendimiento ni probabilidad de supervivencia.

El motor recibe `{finca, clima, catalogo}` desde Alex y devuelve resultados y evidencia. Hellen define y documenta la estructura de clima que necesita antes de que Alex agregue datos por ventanas de cultivo. Dominio sin fetch ni Express.

## Estados y evidencia

- `estado`: completo / incompleto / sin_opciones / demo.
- `ganadoras`: array para permitir empates; vacío cuando no puede recomendarse una estrategia.
- Campos no calculables: null con motivo, nunca cero inventado.
- Cada fuente climática: proveedor, URL de consulta sin secretos, coordenadas solicitadas/devueltas, período, unidades, fecha de consulta, cobertura y origen (`live` o `backup`).
- Guardar reglas, pesos y versión del catálogo junto al resultado.
- Errores propuestos: 400 entrada inválida, 502 proveedor falló, 504 timeout. Un respaldo válido debe indicar backup y su antigüedad. Pronóstico viejo no genera avisos actuales.
- No forzar ganador si no hay opciones elegibles o faltan datos esenciales. Separar indisponibilidad de ausencia de riesgo.
