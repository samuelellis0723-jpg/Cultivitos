# Contrato API · v0.1

Estado integrado: health, catálogo, historial y simulación están implementados. Forecast sigue pendiente. Las reglas agrícolas reales D6/D7 no están habilitadas.

## Implementado

GET /api/health → 200

```json
{"status":"ok","service":"fieldverse-api","version":"0.1.0"}
```

Ruta inexistente → 404 con `error.code` y `error.message`. JSON inválido → 400. No usar un 200 vacío para simular endpoints pendientes.

## Rutas de la integración actual

- GET /api/catalog: `{cultivos: [], estrategias: [], version: "…", fuentes: []}`.
- GET /api/climate/history?latitude=…&longitude=…&start=YYYYMMDD&end=YYYYMMDD: series diarias, con unidades y metadatos; no calcula agregados.
- PENDIENTE: GET /api/climate/forecast?latitude=…&longitude=… (actualmente 404). Propuesta: pronóstico con fechas de validez y origen. No usarlo como historial o escenario de toda una temporada.
- POST /api/simulations: perfil de finca, no puntuaciones calculadas por el navegador.

### Entrada de simulación

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

### Ejemplo de salida demo

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

La matriz demo está implementada como ejemplo ficticio de Minimax. No equivale a rendimiento ni probabilidad de supervivencia.

La interfaz futura de dominio recibe datos desde servicios, sin fetch ni Express. En la integración actual el servicio obtiene clima y catálogo, pero solo pasa a Minimax escenarios y estrategias con puntuaciones nulas en real o la matriz fija en demo. No calcula ventanas ni agregados climáticos.

## Estados y evidencia

- `estado`: completo / incompleto / sin_opciones / demo.
- `ganadoras`: array para permitir empates; vacío cuando no puede recomendarse una estrategia.
- Campos no calculables: null con motivo, nunca cero inventado.
- Cada fuente climática: proveedor, URL de consulta sin secretos, coordenadas solicitadas/devueltas, período, unidades, fecha de consulta, cobertura y origen (`live` o `backup`).
- Guardar reglas, pesos y versión del catálogo junto al resultado.
- Errores propuestos: 400 entrada inválida, 502 proveedor falló, 504 timeout. Un respaldo válido debe indicar backup y su antigüedad. Pronóstico viejo no genera avisos actuales.
- No forzar ganador si no hay opciones elegibles o faltan datos esenciales. Separar indisponibilidad de ausencia de riesgo.

## Historial climático implementado — revisión Samuel, 2026-11-15

Esta sección describe la implementación de `feat/backend-samuel`, base `0230aa3`.
Reemplaza para este endpoint la indicación inicial de «propuesto». No ratifica D6/D7
ni modifica los contratos de puntuación. El backend entrega clima, no escenarios agrícolas.

### Petición

`GET /api/climate/history?latitude=10.63&longitude=-85.44&start=20150101&end=20241231`

Los cuatro campos son obligatorios. Coordenadas finitas en [-90,90] y [-180,180];
fechas calendario YYYYMMDD, inicio ≤ fin, desde 19810101 hasta la fecha UTC actual.
El límite de fechas es técnico, no un umbral agrícola. No hay ubicación implícita,
ni alias lat/lon, ni parámetros repetidos o adicionales. La precisión solicitada se
conserva en la URL NASA, en la respuesta y en la clave de caché.

### Respuesta 200

`{ clima, fuente }`, donde `fuente` es el mismo objeto que `clima.fuentes[0]`.

- `clima.coordenadas.solicitadas`: valores originales de la petición, sin redondeo.
- `clima.coordenadas.devueltas`: geometry.coordinates de NASA (orden convertido de longitud/latitud). No son una finca validada ni necesariamente el centro de una celda.
- `periodo: { inicio, fin }`, `resolucion: "diaria"`, `origen: "live" | "backup"`.
- `variables`: precipitacion, temperaturaMedia y temperaturaMaxima.
- Cada variable: unidad, unidadOriginal, parametroOriginal, transformacion, fechas, procedencia, fechaConsulta, fuenteId, cobertura y serie diaria ordenada `{ fecha: YYYYMMDD, valor: number | null }`.
- Cobertura por variable: diasEsperados (calendario inclusivo completo), diasPresentes, porcentaje sin redondeo prematuro y faltantes (todas las fechas con null).
- Faltantes: fechas omitidas, null, marcadores del proveedor, valores no finitos/no numéricos y precipitación negativa. Cero permanece cero; temperaturas negativas válidas no se convierten en faltantes.
- Fuente: proveedor, URL sin secretos, fechaConsulta, origen, coordenadas solicitadas/devueltas, período, unidades finales y originales, parámetros y estándar temporal LST; coberturaPorVariable y cobertura global sobre el total de celdas día-variable. Ninguna cobertura implica aptitud agrícola.
- Backup añade antiguedad desde la adquisición original. No se cambia fechaConsulta al leer una copia.

### Unidades y transformación explícita

NASA Daily AG devuelve PRECTOTCORR en `mm/day` y temperaturas en `C`, verificado
en la respuesta original. Para cada intervalo diario LST, la tasa media de
precipitación se integra durante **un día**: `mm/day × 1 día = mm` acumulados en ese
día. El valor numérico es el mismo, pero se documentan ambas unidades y la operación.
No se aplica este adaptador a datos mensuales, horarios ni a un período de duración
arbitraria. Temperaturas `C` → `°C` conservan escala y valor.

La salida mantiene exclusivamente `mm` y `°C`, como exigen el frontend `8692cb1`
y el validador de Hellen. No se aceptan ambas etiquetas silenciosamente. Si NASA
cambia las unidades originales, se rechaza la respuesta hasta revisar el adaptador.
Referencia del proveedor: https://power.larc.nasa.gov/docs/services/api/temporal/daily/
y https://power.larc.nasa.gov/docs/methodology/data/sources_meteorology/.

### Errores y respaldo

- 400 `INVALID_CLIMATE_QUERY`: entrada inválida; no se consulta NASA.
- 502 `INVALID_NASA_RESPONSE`: estructura, unidades, coordenadas o período incompatibles.
- 502 `NASA_NO_DATA`: ninguna variable contiene datos utilizables. Una variable parcialmente o totalmente faltante puede viajar con nulls si existen datos en otra; decidir suficiencia para D6 corresponde al dominio.
- 502 `NASA_UNAVAILABLE`: fallo HTTP, de red o JSON inválido sin respaldo verificable.
- 504 `NASA_TIMEOUT`: límite de 9000 ms, incluido el cuerpo JSON, sin respaldo verificable.

Orden: caché exacta y validada → NASA → respaldo exacto y validado si NASA falla.
Un resultado de caché o respaldo siempre es backup. Errores de escritura de caché
no descartan una respuesta NASA válida. No hay TTL agronómico ni umbral de cobertura
inventado. La antigüedad se informa; la política de actualización permanece por acordar.

### Ausencia de clima en simulación

Si falla el clima, `clima: null`, `evidencia.origen: null`, `evidencia.fuentes: []`
y motivo en datosFaltantes; nunca `live` por defecto. El adaptador frontend publicado
acepta null y conserva la ausencia. Con las puntuaciones aún pendientes, estado
incompleto y ganadoras vacías. Demo conserva origen demo y no consulta NASA.
El período de simulación sigue fijo en el piloto 20150101–20241231; este cambio no
introduce un contrato nuevo para seleccionar períodos en POST /api/simulations.


## Simulación y catálogo en feat/integracion-samuel

GET /api/catalog y simulación leen el mismo data/catalog.json mediante el servicio
getCatalog. Versión actual 1.0.0-piloto; fuentes y duracionMeses heredadas no se
consideran verificadas ni se convierten al esquema propuesto duracionDias.
Los errores HTTP no exponen rutas del archivo.

POST /api/simulations acepta modo real o demo. Omitir modo equivale a real.
Otros modos, incluido prueba_sintetica, devuelven 400. Demo usa únicamente la
matriz ficticia, sin NASA y con origen demo. Real consulta historial 2015–2024,
pero sigue incompleto: puntajes null, ganadoras vacías y motivos metodológicos.
Si no hay clima válido, añade un motivo climático, clima null, origen null y
fuentes vacías; nunca activa demo automáticamente. D7 no se invoca en este flujo.
Con historial válido mantiene fuentes y procedencia live/backup; eso no habilita D7.

La explicación opcional heredada de Alex solo redacta texto, sin modificar puntajes,
ganadoras o evidencia. El servicio único en services/ai usa OPENAI_API_KEY si existe;
sin clave, ante error o timeout total de 5000 ms devuelve explicación determinista.
La lectura del cuerpo del proveedor está incluida en ese límite. Las pruebas no
requieren claves ni llaman al proveedor real.
