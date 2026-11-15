# Correcciones de auditoría: procedencia, clima, calendario y descartes

Rama: feat/frontend-samuel. Contratos consultados mediante git show, sin merge:

- origin/feat/domain-hellen, d0400af: contratos-dominio.md §5 y el validador
  simulation/validar-clima.js. La implementación remota exige mm, °C y °C,
  series YYYYMMDD continuas y tolerancia de cobertura 0,01 puntos porcentuales.
- origin/feat/backend-alex, 912068a: solo health/404 publicado. No se presume
  disponibilidad de catálogo, historial, pronóstico ni simulación.

## Comportamiento

El modo de conexión (API/demostración) no establece la procedencia de datos.
Los distintivos usan metadatos de catálogo, evidencia o variables climáticas.
Historial deriva su procedencia de las tres variables; una mezcla live/backup
se presenta como mixta y conserva fuente y antigüedad de cada variable.
No se etiqueta como live un dato de origen desconocido. Declaraciones de origen
que contradigan las fuentes se rechazan. Una respuesta demo recibida por HTTP
sigue identificándose como demostración.

El adaptador de historial valida las tres variables, coordenadas, resolución,
período, unidades, fechas diarias consecutivas, números finitos/null, centinela
-999, cobertura calculada contra la serie y faltantes exactos. Verifica fuentes
únicas y sus referencias, procedencia concordante y antigüedad de backup.
No convierte unidades ni genera escenarios, parámetros o puntajes.
La fixture demo añade máxima desconocida (todos null), sin inventar valores.

Las fechas se validan por calendario UTC, incluidos años bisiestos, sin permitir
que Date normalice un 30 de febrero. Se aplica a consultas, períodos, series,
fechas de consulta, pronóstico, fechas opcionales del catálogo e históricos
locales. Una estrategia no elegible debe tener motivosDescarte no vacío con
textos no blancos. El arreglo descartes, si llega, también debe tener motivos.

## Período y piloto

frontend/.env local configura, conservando las demás variables:

```dotenv
VITE_HISTORY_START=20150101
VITE_HISTORY_END=20241231
```

Es historial 2015–2024 inclusive, no pronóstico. Reiniciar Vite para aplicar
cambios. .env sigue ignorado por Git; .env.example documenta estos valores.
No hay sustitución automática si falta configuración. Playwright fija esas
variables en su propio servidor para reproducir las pruebas sin necesitar .env.

Liberia, Guanacaste, 10.63/-85.44 es un punto ilustrativo propuesto, cargable
solo mediante botón explícito. No se asigna automáticamente ni acredita finca
validada, zona elegible o cultivos aptos. El mapa sigue permitiendo otras ubicaciones.

## Integración pendiente

Alex debe publicar y acordar los sobres HTTP de las API; se mantiene
/api/climate/history. C1–C11 siguen pendientes de confirmación por Alex, aunque
el frontend valida la estructura publicada por Hellen. No se confirma cobertura
real del período ni política de antigüedad, ni se sustituye historial por pronóstico.
Pronóstico mantiene el sobre provisional documentado por frontend; requiere
acuerdo HTTP independiente. Hellen debe aportar catálogo, cultivos, rotaciones,
parámetros y fuentes definitivos; cultivosAnteriores continúa provisionalmente
como IDs del catálogo. El piloto propuesto no cierra esos acuerdos.
La demostración continúa siendo explícita y no se activa por fallo de API.

## Pruebas

`npm test --prefix frontend`, `npm run test:e2e --prefix frontend`, `npm run build`.
Las E2E guardan nuevas capturas en test-results/capturas (ignorado), sin reemplazar
la evidencia visual de la entrega anterior cada vez que se ejecutan.

Resultado final ejecutado: 43/43 unitarias y 26/26 E2E aprobadas. Compilación
correcta (mantiene aviso de chunk >500 kB). git diff --check correcto y
frontend/.env confirmado como ignorado y no rastreado. La respuesta histórica
también debe coincidir con el período y coordenadas solicitados; la rejilla
puede diferir en coordenadas devueltas, tal como permite el contrato.

## Revisión de Explora (2026-11-15)

- Al continuar desde Tu finca, Explora solicita el historial con coordenadas
  guardadas y VITE_HISTORY_START/END; el período de respuesta debe coincidir.
- Los estados de clima y pronóstico solo se muestran si su fingerprint coincide
  con el perfil vigente. El cambio de ubicación oculta datos anteriores de
  inmediato, cancela solicitudes en curso y descarta sus respuestas tardías.
- El historial se titula 2015–2024 y declara que no es tiempo actual ni pronóstico;
  presenta ubicación, período, fuentes, enlaces seguros, procedencia y cobertura
  disponibles por variable.
- Mes de inicio empieza sin selección y sigue siendo obligatorio para continuar.
  Suelo y drenaje parten de `desconocido` según el vocabulario del catálogo.
- E2E con historia simulada válida y carrera de respuesta tardía: cubierta en
  escritorio y móvil. No demuestra disponibilidad o valores del proveedor real.
