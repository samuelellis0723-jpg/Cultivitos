// Integration only: current compiled frontend, reviewed backup, no external providers/cache.
import { fileURLToPath } from 'node:url';
import { createApp } from '../../../backend/src/app.js';
import { createNasaService } from '../../../backend/src/services/nasa/nasa.service.js';
import { createExplainer } from '../../../backend/src/services/ai/openai.service.js';
const getClimate = createNasaService({ cacheDir: null, fetchImpl: async () => { throw new Error('Offline integration check'); } });
const staticDir = fileURLToPath(new URL('../../dist', import.meta.url));
createApp({ staticDir, getClimateHistory: getClimate, simulationDependencies: { getClimate, explain: createExplainer({ apiKey: '' }) } })
  .listen(5185, '127.0.0.1');
