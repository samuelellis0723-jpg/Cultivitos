# Contrato API · v0.1

## Implementados

- `GET /api/health` → `200`: `{"status":"ok","service":"fieldverse-api","version":"0.1.0"}`
- `GET /api/catalog` → `200`: catálogo piloto (`cultivos`, `estrategias`, `opcionesFinca`, `version`, `fuentes`).
- `GET /api/climate/history?latitude=…&longitude=…&start=YYYYMMDD&end=YYYYMMDD` → `200`: historial climático diario con unidades, cobertura y metadatos (`live` o `backup` revisado).
- `POST /api/simulations` → `200`: evalúa en modo `demo` (matriz ficticia E1/E2/E3) o `real` (actualmente `incompleto` honesto mientras la metodología D7 no esté habilitada). Rechaza `modo: "prueba_sintetica"` con `400`.

Ruta `/api/*` inexistente → `404` JSON con `error.code` y `error.message` (nunca `index.html`). JSON inválido → `400`.

## Pendiente

- `GET /api/climate/forecast?latitude=…&longitude=…`: pronóstico con fechas de validez y origen (pendiente de implementar; no usar historial como pronóstico).

## Entrada de simulación (`POST /api/simulations`)

```json
{
  "modo": "real",
  "finca": {
    "latitude": 10.63,
    "longitude": -85.44,
    "suelo": "desconocido",
    "drenaje": "desconocido",
    "riego": "desconocido",
    "cultivosAnteriores": [],
    "mesInicio": 5,
    "prioridad": "equilibrio"
  }
}
```

Coordenadas: latitud `[-90, 90]`, longitud `[-180, 180]`, `mesInicio` entero `1–12`, `prioridad`: `equilibrio` / `agua` / `suelo`. `modo` acepta `"real"` (por defecto) o `"demo"`; `"prueba_sintetica"` se rechaza con `400`.

## Ajuste D10: diagnóstico de elegibilidad

Cada elemento de `resultados` distingue explícitamente elegibilidad evaluada de desconocida/no evaluable:

- `elegible`: `boolean | null` (`true` = elegible, `false` = descartada, `null` = no evaluable).
- `elegibilidadEstado`: `"elegible"` | `"descartada"` | `"no_evaluable"` (coherente con `elegible`).
- Cuando `elegible === null`, `peorArrepentimiento` es `null` y los motivos van en `motivosNoCalculable` y `motivoPeorArrepentimiento` (nunca se fuerza `elegible: true` ni se invoca Minimax con datos artificiales, ni se reporta `sin_opciones`).

### Salida `demo` (matriz ficticia E1/E2/E3)

```json
{
  "estado": "demo",
  "escenarios": ["habitual", "seco", "humedo"],
  "resultados": [
    {"estrategiaId":"E1","elegible":true,"elegibilidadEstado":"elegible","puntajes":{"habitual":90,"seco":35,"humedo":55},"peorArrepentimiento":45},
    {"estrategiaId":"E2","elegible":true,"elegibilidadEstado":"elegible","puntajes":{"habitual":75,"seco":80,"humedo":50},"peorArrepentimiento":25},
    {"estrategiaId":"E3","elegible":true,"elegibilidadEstado":"elegible","puntajes":{"habitual":80,"seco":70,"humedo":75},"peorArrepentimiento":10}
  ],
  "ganadoras": ["E3"],
  "peorArrepentimientoMinimo": 10,
  "explicacion": "Demostración con matriz ficticia del contrato. Los valores no provienen de NASA ni de datos reales.",
  "evidencia": {"origen":"demo","fuentes":[],"supuestos":["Matriz ficticia del docs/contrato-api.md para verificar el algoritmo."],"datosFaltantes":[],"motorVersion":"minimax-regret v1","reglasVersion":"no-implementado"}
}
```

Este ejemplo NO es una recomendación agrícola ni equivale a rendimiento o probabilidad de supervivencia.

## Estados y evidencia

- `estado`: `completo` / `incompleto` / `sin_opciones` / `demo`.
- `ganadoras`: array (vacío `[]` cuando es `incompleto` o `sin_opciones`).
- Campos no calculables: `null` con motivo, nunca cero inventado.
- Cada fuente climática: proveedor, URL de consulta sin secretos, coordenadas solicitadas/devueltas, período, unidades, fecha de consulta, cobertura y origen (`live` o `backup` con antigüedad).
- Errores propuestos/implementados: `400` entrada inválida, `502` proveedor falló, `504` timeout.
- Insuficiencia (`incompleto`) prevalece sobre `sin_opciones`: no forzar ganador ni descartar estrategias sin evaluación concluida.
