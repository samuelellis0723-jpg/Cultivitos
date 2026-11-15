# Revisión posterior a d01a847

Samuel · 2026-11-14 · feat/frontend-samuel

## Estado inicial

Checkout limpio en d01a847, rama feat/frontend-samuel. Origin apunta a
samuelellis0723-jpg/Cultivitos. Tras fetch, frontend local y remoto coinciden.
El reflog local no contiene cambio a backend-alex ni integración de dominio;
no hay merge/rebase activo ni cambios locales que preservar. El fetch actualizó
solo origin/feat/domain-hellen hasta dbfbe2a. No se fusionaron ramas ajenas.
No hay avances posteriores de Gemini en esta rama local o remota.
No se encontraron documentos 00–06 en los archivos disponibles. Se leyeron
README, AGENTS, contrato API, equipo, frontend/docs y el contrato de dominio
mediante git show origin/feat/domain-hellen:docs/metodologia/contratos-dominio.md.

## Correcciones

- Contratos: estados y elegibilidad obligatorios; números finitos 0–100,
  null con motivo para puntuación elegible, IDs únicos, ganadoras existentes,
  elegibles y consistentes con el menor arrepentimiento informado. Incompleto
  y sin_opciones no admiten ganadoras. Origen ausente queda sin especificar.
- Catálogo: IDs, dos pasos con órdenes 1/2, pertenencia cultivo/ciclo y
  opciones valor/etiqueta válidas. El formulario ya enviaba valor y mostraba
  etiqueta; se conserva esa implementación.
- Guardado versión 2: perfil, respuesta completa, evidencia, selección,
  catálogo completo, versiones, modo y contexto histórico climático.
  Consulta disponible en Compara incluso con catálogo remoto caído después
  de recargar, rotulada como resultado histórico. Los registros antiguos
  resumidos no permiten reconstruir resultados y no se presentan como completos;
  permanecen en almacenamiento hasta el siguiente guardado/eliminación.
- Modal nativo dialog/showModal: fondo inerte, foco contenido, Escape,
  bloqueo de desplazamiento y devolución de foco al botón de apertura.
- Selector compartido Explora/Compara: flechas, Home/End y foco móvil.
- Fuentes: enlaces HTTP/HTTPS sin usuario ni contraseña; otros protocolos
  no se convierten en enlaces. Se conserva origen desconocido sin llamarlo live.

## Configuración climática pendiente de acuerdo

VITE_HISTORY_START y VITE_HISTORY_END en frontend/.env (YYYYMMDD,
orden inicio <= fin) definen explícitamente el período solicitado. Reiniciar
Vite al cambiarlas. Sin configuración se muestra indisponibilidad del historial;
el pronóstico y el modo demostración siguen siendo independientes.
No hay período predeterminado ni generación de escenarios por percentiles.
Se conserva GET /api/climate/history. El período de la fixture demo sigue
siendo ficticio y explícito. La validez agronómica del período no la decide la UI.

## Reproducción de verificaciones

Desde la raíz:

```bash
npm ci --prefix frontend
cd frontend
npx playwright install chromium
npm test
npm run test:e2e
npm run build
```

E2E usa Vite en 127.0.0.1:5173 y respuestas HTTP interceptadas, sin necesitar
backend ni acceso a proveedores. Detener otros procesos en ese puerto.
Cubre escritorio 1366×900 y móvil 390×844, estados, errores, guardado,
consulta tras recarga sin API, teclado, modal y desbordamiento horizontal.
Son pruebas de integración del frontend; no certifican endpoints reales.

## Dependencias externas pendientes

Alex: sobres HTTP de catálogo/simulación/clima, endpoints y política de
respaldo/antigüedad. Hellen: catálogo real y fuentes, vocabulario definitivo,
localidad/ciclos y reglas. Ambos: período climático y acuerdos pendientes
C1–C11. No se confirman en esta entrega.

cultivosAnteriores sigue provisionalmente como array de IDs de cultivos del
catálogo (§3.7/D4 del contrato de dominio), sin texto libre. El formato definitivo
requiere acuerdo con Hellen y el sobre de entrada con Alex. Ninguna puntuación
demo se atribuye a NASA ni representa rendimiento o supervivencia.

## Resultados ejecutados

- npm test --prefix frontend: 17/17 aprobadas.
- npm run test:e2e --prefix frontend: 18/18 aprobadas (17,5 s en la ejecución final).
- npm test (raíz): 1/1 prueba health/404 aprobada.
- npm run build: correcta; aviso de chunk JavaScript superior a 500 kB.
- git diff --check: correcto; cambios limitados a frontend/.

La instalación informó tres vulnerabilidades altas en el árbol de dependencias;
no se aplicó una actualización forzada de las dependencias existentes.
