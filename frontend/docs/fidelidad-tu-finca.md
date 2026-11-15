# Tu finca: revisión visual

Referencia principal: segunda captura facilitada por Samuel. Se conserva React/Vite
y el contrato de simulación; no se modifica backend ni dominio.

- Fondo marfil, encabezado compacto y navegación discreta.
- Formulario izquierdo y mapa derecho en escritorio; una columna en móvil.
- Agua y prioridades como tarjetas. «Tengo riego» abre el selector del tipo real
  del catálogo; no asigna riego completo ni interpreta desconocido como secano.
  Si el catálogo usa otro vocabulario, se muestran sus opciones originales.
- Suelo, drenaje, mes e historial en sección secundaria. No se añade un campo
  de cultivo deseado: no hay contrato confirmado para enviarlo al motor.
- Guardar y salir guarda realmente el borrador local, incluso parcial, e indica
  que se puede cerrar la pestaña. Explorar valida antes de avanzar.
- El fallo de catálogo mantiene ubicación, mapa y formulario. Agua, prioridad,
  detalles y avance quedan deshabilitados; reintento y demo son explícitos.
- Los errores técnicos quedan en un desplegable cerrado solo en desarrollo;
  la página principal muestra mensajes sencillos sin errores HTTP internos.

## Mapa

Se revisaron las dependencias originales (React, router, Recharts, Vite y Playwright).
Se añadió Leaflet 1.9.4, sin claves. Selección por clic, marcador arrastrable,
zoom, desplazamiento con teclado y Enter para seleccionar el centro. Las
coordenadas escritas actualizan el marcador. El centro inicial de Costa Rica
solo orienta el mapa: no se guarda como ubicación sin selección.

La cartografía de OpenStreetMap es una dependencia de red del mapa, no una
fuente agronómica ni climática. Mantiene atribución visible; si falla, se
ofrece escribir coordenadas sin fingir que se cargó el mapa.

Referencias técnicas: [Leaflet](https://leafletjs.com/reference-1.9.4.html),
[política de teselas OSM](https://operations.osmfoundation.org/policies/tiles/).

## Verificación visual y reproducible

`npm run test:e2e --prefix frontend` arranca un Vite aislado en 5174 (configurable
con E2E_PORT); no detiene el servidor de desarrollo de 5173. APIs interceptadas:
las capturas válidas usan un perfil de prueba y catálogo demostrativo, sin
atribuirlo a datos agrícolas reales. Las teselas visibles sí vienen del mapa.
Las capturas se regeneran al ejecutar farm-visual.spec.js. La comparación visual
es manual contra la referencia: no es una prueba automática de igualdad de píxeles.
Se corrigieron la altura de las tarjetas de agua, el espaciado de detalles y
la jerarquía de acciones tras inspeccionar las capturas.

| Estado | Escritorio 1366×900 | Móvil 390×844 |
|---|---|---|
| Demo | [Captura](capturas/tu-finca-demo-desktop.png) | [Captura](capturas/tu-finca-demo-mobile.png) |
| Sin catálogo | [Captura](capturas/tu-finca-unavailable-desktop.png) | [Captura](capturas/tu-finca-unavailable-mobile.png) |
| Perfil válido de prueba | [Captura](capturas/tu-finca-valid-desktop.png) | [Captura](capturas/tu-finca-valid-mobile.png) |

Se conservan las 18 E2E previas y se agregan 8 verificaciones de ubicación,
guardado, estados visuales, riego preciso y avance con datos válidos.

Resultado final: 26/26 E2E y 17/17 unitarias frontend aprobadas; compilación
correcta. Vite mantiene el aviso de tamaño del bundle. Se revisaron capturas
reales con teselas cargadas, sin desbordamiento horizontal en ambos tamaños.
