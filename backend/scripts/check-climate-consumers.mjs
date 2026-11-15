// Validates the actual published consumers without copying or changing their code.
// node backend/scripts/check-climate-consumers.mjs <frontend-directory> <domain-directory>
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createNasaService } from '../src/services/nasa/nasa.service.js';
import { simular } from '../src/services/simulation/simulation.service.js';
const [frontendDir, domainDir] = process.argv.slice(2);
if (!frontendDir || !domainDir) throw new Error('Indica frontend/ y backend/src/domain/ de las entregas a verificar.');
const load = file => import(pathToFileURL(path.resolve(file)).href);
const { adaptClimateHistory, adaptSimulationResponse } = await load(path.join(frontendDir, 'src/services/adapters.js'));
const { validarClima } = await load(path.join(domainDir, 'simulation/validar-clima.js'));
const getHistory = createNasaService({ cacheDir:null,fetchImpl:async () => { throw new Error('Offline contract check'); } });
const clima = await getHistory({ latitude:10.63,longitude:-85.44,start:'20150101',end:'20241231' });
assert.equal(adaptClimateHistory({ clima,fuente:clima.fuentes[0] }).origen,'backup');
const validation = validarClima(clima);
assert.equal(validation.valido,true,JSON.stringify(validation));
const finca = { latitude:10.63,longitude:-85.44,mesInicio:5,suelo:'desconocido',drenaje:'desconocido',riego:'desconocido',cultivosAnteriores:[],prioridad:'equilibrio' };
const explain = async result => ({ explicacionIA:result.explicacionBase,origen:'fixture_contract_test' });
const noClimate = await simular({ finca }, { getClimate:async () => { throw new Error('offline'); },explain });
assert.equal(adaptSimulationResponse(noClimate).evidencia.origen,null);
assert.deepEqual(noClimate.ganadoras,[]);
const withBackup = await simular({ finca },{ getClimate:async () => clima,explain });
assert.equal(adaptSimulationResponse(withBackup).evidencia.origen,'backup');
console.log(JSON.stringify({ checks:4,passed:4,failed:0,scope:['frontend climate','domain climate','frontend absent provenance','frontend backup provenance'] },null,2));
