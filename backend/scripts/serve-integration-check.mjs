import { createExplainer } from '../src/services/ai/openai.service.js';
// Local integration check: reviewed real backup, forced offline, no cache writes.
import { createApp } from '../src/app.js';
import { createNasaService } from '../src/services/nasa/nasa.service.js';
const getClimate = createNasaService({ cacheDir:null, fetchImpl:async () => { throw new Error('Offline integration check'); } });
createApp({ getClimateHistory:getClimate, simulationDependencies:{getClimate, explain:createExplainer({apiKey:''})} }).listen(3015,'127.0.0.1');
