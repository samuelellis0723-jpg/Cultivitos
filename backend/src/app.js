import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import healthRouter from './routes/health.routes.js';
import { createClimateRouter } from './routes/climate.routes.js';
import catalogRouter from './routes/catalog.routes.js';
import { createSimulationRouter } from './routes/simulation.routes.js';

const DEFAULT_STATIC_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../frontend/dist');

export function createApp({ getClimateHistory, simulationDependencies, staticDir } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));

  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
  });

  app.use('/api/simulations', createSimulationRouter(simulationDependencies));

  app.use('/api/health', healthRouter);
  app.use('/api/climate', createClimateRouter(getClimateHistory));
  app.use('/api/catalog', catalogRouter);

  // Cualquier ruta /api desconocida debe devolver JSON 404, nunca index.html.
  app.use('/api', (req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ruta no disponible.' } }));

  const resolvedStaticDir =
    staticDir !== undefined
      ? staticDir
      : ['1', 'true'].includes(String(process.env.SERVE_STATIC_FRONTEND ?? '').toLowerCase())
        ? DEFAULT_STATIC_DIR
        : null;

  if (resolvedStaticDir && fs.existsSync(path.join(resolvedStaticDir, 'index.html'))) {
    app.use(express.static(resolvedStaticDir));
    app.get(/^\/(?!api(?:\/|$)).*/, (req, res) => {
      res.sendFile(path.join(resolvedStaticDir, 'index.html'));
    });
  }

  app.use((req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ruta no disponible.' } }));
  app.use((error, req, res, next) => {
    const status = error.status === 400 ? 400 : error.status === 413 ? 413 : 500;
    if (status === 500) console.error(error);
    res.status(status).json({ error: { code: status === 500 ? 'INTERNAL_ERROR' : 'INVALID_REQUEST', message: status === 500 ? 'Error interno del servidor.' : 'Solicitud inválida.' } });
  });
  return app;
}