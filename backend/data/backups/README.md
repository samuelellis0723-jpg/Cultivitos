# Respaldo climático revisado

El archivo `nasa-v1-066452b318d18182037c1e9f0956981013c77ef4c3e95659e6981c340523cf30.json`
es una captura REAL de NASA POWER, no un fixture sintético ni un escenario agrícola.

- Consulta: latitude 10.63, longitude -85.44; 20150101–20241231; AG, Daily Point, LST.
- Variables: PRECTOTCORR (mm/day), T2M (C), T2M_MAX (C).
- Descarga completada: 2026-11-15T16:57:05.131Z. `fechaConsulta` registra la finalización de esta descarga (mtime del archivo recién descargado), no la fecha de observación ni de publicación de NASA.
- Se conserva la respuesta JSON original bajo `raw`, incluyendo geometry, header, parámetros y series. No se fabrican coordenadas de proveedor.
- 3653 valores presentes por variable; se verificó el calendario completo y el adaptador de frontend y dominio.
- La URL real de descarga omitió time-standard, cuyo default de NASA es LST; raw.header.time_standard confirma LST. También tenía los parámetros en otro orden. El lector compara su significado, no exige texto idéntico a la URL canónica.
- La clave SHA256 incluye la URL canónica de consulta: ubicación exacta, período, variables, comunidad, formato y estándar temporal.
- El lector solo utiliza esta copia para la consulta exacta; no la aplica a coordenadas vecinas ni a otro período.
- Al servir el archivo: `backup`, fecha de consulta original y antigüedad calculada en ese momento. La etiqueta `live` solo corresponde a una petición de red recién completada.

Los dos archivos históricos `data/nasa_series_*.json` de Alex se conservan sin cambios, pero NO se usan como respaldo verificable. Tienen fechas por variable y 3653 registros, pero no conservan la respuesta cruda, metadata original de unidades ni coordenadas devueltas comprobables; el código que los construía copiaba las solicitadas. Cambiar sus nombres o completar esos campos no repara su trazabilidad. El respaldo de San José queda pendiente de una captura nueva revisada.

Las copias de ejecución van a `backend/data/cache/`, ya ignorado por Git. No deben publicarse. Este archivo de backups es una captura revisada explícitamente para reproducir la entrega, no una caché de ejecución.
