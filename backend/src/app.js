import express from 'express';
import healthRouter from './routes/health.routes.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));
  app.use('/api/health', healthRouter);
  app.use((req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ruta no disponible.' } }));
  app.use((error, req, res, next) => {
    const status = error.status === 400 ? 400 : error.status === 413 ? 413 : 500;
    if (status === 500) console.error(error);
    res.status(status).json({ error: { code: status === 500 ? 'INTERNAL_ERROR' : 'INVALID_REQUEST', message: status === 500 ? 'Error interno del servidor.' : 'Solicitud inválida.' } });
  });
  return app;
}
