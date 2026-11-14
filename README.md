# Cultivitos · FIELDVERSE

Base de trabajo para Samuel, Alex y Hellen. React + Vite y Express. Requiere Node **22.12 o posterior** y npm. Si usas nvm: `nvm install && nvm use`.

## Primera instalación

```bash
git clone https://github.com/samuelellis0723-jpg/Cultivitos.git
cd Cultivitos
npm run setup
```

Abre dos terminales en la raíz:

```bash
# Terminal 1
npm run dev:backend
```

```bash
# Terminal 2
npm run dev:frontend
```

Abre http://localhost:5173. Debe mostrar «Conectado · fieldverse-api». Backend: http://127.0.0.1:3000/api/health. Vite redirige `/api` al backend: no hace falta configurar CORS para este flujo. No abrir index.html directamente.

Los valores por defecto funcionan sin archivos .env. Para cambiarlos copia `backend/.env.example` a `backend/.env` y `frontend/.env.example` a `frontend/.env`. Reinicia ambos procesos si cambias configuración. Si cambias PORT, ajusta también API_PROXY_TARGET. No poner secretos en variables VITE_* ni en Git.

## Ramas y propietarios

Después de clonar, cada persona ejecuta **solo su comando**:

| Persona | Comando | Propiedad |
|---|---|---|
| Samuel | `git switch feat/frontend-samuel` | frontend y configuración raíz |
| Alex | `git switch feat/backend-alex` | backend excepto src/domain |
| Hellen | `git switch feat/domain-hellen` | backend/src/domain y docs/metodologia |

Si ya habías clonado, ejecuta `git fetch origin` antes de cambiar de rama. Cada persona necesita permiso de escritura en GitHub y debe trabajar en su propio clon. Las ramas no conceden acceso: Samuel debe añadir a Alex y Hellen como colaboradores si aún no lo son.

1. Leer `docs/contrato-api.md` y `docs/equipo.md`.
2. Trabajar solo en el área asignada; avisar antes de cambiar un contrato.
3. Revisar `git diff`, hacer commit y `git push -u origin NOMBRE-DE-TU-RAMA`.
4. Abrir PR hacia main. Samuel integra tras revisar. No force push.
5. Para incorporar avances: con el árbol limpio, `git fetch origin` y `git merge origin/main` desde la rama propia. No se crea una nueva rama cada vez.

Una rama no aísla dos agentes ejecutándose en la misma carpeta. Usar clones o worktrees distintos; si se levantan dos apps a la vez en la misma máquina, asignar puertos diferentes.

## Estructura

- frontend/src: components → pages → routes → App → main; services para HTTP y assets para estilos.
- backend/src: app y server separados, routes, controllers y services (NASA/weather).
- backend/src/domain: catalog y simulation, reservados a Hellen.
- backend/data/backups: respaldos revisados, con fuente, coordenadas y fecha. Nunca datos privados.
- backend/data/cache: caché de ejecución, excluida de Git.
- docs: contrato y metodología.

## Verificación

```bash
npm test
npm run build
```

`npm run build` genera frontend/dist. `npm run preview --prefix frontend` solo previsualiza archivos estáticos; no incluye el proxy de desarrollo. Un despliegue debe servir `/api` desde Express mediante proxy del hosting, además de redirigir rutas de React a index.html. No hay despliegue configurado todavía.

## Estado real

Implementados: base React/Express, routing, conexión health con carga/error/reintento, 404 JSON y prueba del contrato health. Recharts está disponible para Samuel.

Pendientes: catálogo real, NASA, pronóstico, simulación, avisos, persistencia y autenticación. La pantalla inicial no presenta datos agrícolas inventados. No hay MySQL ni API de IA requerida para arrancar.
