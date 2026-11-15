import express from 'express';
import healthRouter from './routes/health.routes.js';
import { createClimateRouter } from './routes/climate.routes.js';
import catalogRouter from './routes/catalog.routes.js';
import simulationRouter from './routes/simulation.routes.js';

export function createApp({ getClimateHistory } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));

  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
  });

  app.use('/api/simulations', simulationRouter);

  app.use('/api/health', healthRouter);
  app.use('/api/climate', createClimateRouter(getClimateHistory));
  app.use('/api/catalog', catalogRouter);

  app.use((req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ruta no disponible.' } }));
  app.use((error, req, res, next) => {
    const status = error.status === 400 ? 400 : error.status === 413 ? 413 : 500;
    if (status === 500) console.error(error);
    res.status(status).json({ error: { code: status === 500 ? 'INTERNAL_ERROR' : 'INVALID_REQUEST', message: status === 500 ? 'Error interno del servidor.' : 'Solicitud inválida.' } });
  });
  return app;
}