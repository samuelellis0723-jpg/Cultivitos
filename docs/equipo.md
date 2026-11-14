# Primer bloque de trabajo

## Samuel
1. Ejecutar la base y confirmar conexión.
2. Crear formulario Mi finca respetando contrato-api.md.
3. Construir comparación con un ejemplo local identificado como demostrativo.
4. Conectar servicios cuando Alex entregue endpoints.

## Alex
1. Ejecutar backend y prueba health.
2. Probar una consulta NASA corta, conservar metadatos y filtrar datos ausentes.
3. Implementar GET /api/climate/history con caché por coordenadas, período y parámetros.
4. Conectar catálogo y motor de Hellen sin reescribir su lógica.
5. Añadir pronóstico solo después del recorrido de simulación.

## Hellen
1. Elegir localidad piloto con el equipo y documentar catálogo/ciclos con fuentes.
2. Implementar minimax con la matriz demostrativa del contrato y comprobar los resultados.
3. Definir elegibilidad, escenarios, pesos e indicadores antes de asignar puntos a datos reales.
4. Exportar función de motor independiente de HTTP; Alex escribe la ruta que la invoca.

Integrar cada 60–90 minutos. El contrato propuesto se acuerda antes de implementar endpoints adicionales. Un JSON válido de NASA no demuestra validez agronómica del modelo.
