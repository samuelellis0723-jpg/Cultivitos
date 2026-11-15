import { createExplainer } from '../src/services/ai/openai.service.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from '../src/app.js';
import { getCatalog } from '../src/services/catalog/catalog.js';
import { createNasaService } from '../src/services/nasa/nasa.service.js';
import { adaptCatalog, adaptClimateHistory, adaptSimulationResponse } from '../../frontend/src/services/adapters.js';

const finca = { latitude:10.63, longitude:-85.44, mesInicio:5, suelo:'desconocido', drenaje:'desconocido', riego:'desconocido', prioridad:'equilibrio', cultivosAnteriores:[] };
test('Express catalog, history backup and demo/real simulation share catalog and retain frontend contracts', async t => {
  const getClimate = createNasaService({ cacheDir:null, fetchImpl:async () => { throw new Error('offline integration test'); } });
  const server = createApp({ getClimateHistory:getClimate, simulationDependencies:{getClimate, explain:createExplainer({apiKey:''})} }).listen(0,'127.0.0.1');
  await once(server,'listening');
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  const catalogResponse = await fetch(base+'/api/catalog');
  assert.equal(catalogResponse.status,200);
  const catalog = await catalogResponse.json();
  assert.deepEqual(catalog,await getCatalog());
  assert.equal(adaptCatalog(catalog).version,catalog.version);
  const historyResponse = await fetch(base+'/api/climate/history?latitude=10.63&longitude=-85.44&start=20150101&end=20241231');
  assert.equal(historyResponse.status,200);
  const history = await historyResponse.json();
  assert.deepEqual(history.fuente,history.clima.fuentes[0]);
  assert.equal(adaptClimateHistory(history).origen,'backup');
  for (const modo of ['demo','real','prueba_sintetica']) {
    const response = await fetch(base+'/api/simulations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({finca,modo})});
    if (modo === 'prueba_sintetica') { assert.equal(response.status,400); continue; }
    assert.equal(response.status,200);
    const result = adaptSimulationResponse(await response.json());
    assert.equal(result.evidencia.catalogoVersion,catalog.version);
    assert.deepEqual(result.resultados.map(r=>r.estrategiaId),catalog.estrategias.map(e=>e.id));
    assert.equal(result.estado,modo==='demo'?'demo':'incompleto');
    if (modo==='real') {
      assert.deepEqual(result.ganadoras,[]);
      assert.equal(result.evidencia.origen,'backup');
      assert.ok(result.evidencia.datosFaltantes.some(m=>m.includes('D7')));
      assert.ok(result.resultados.every(r=>r.elegible===null && r.elegibilidadEstado==='no_evaluable'));
      assert.ok(result.resultados.every(r=>Object.values(r.puntajes).every(v=>v===null)));
    } else {
      assert.equal(result.clima,null);
      assert.equal(result.evidencia.origen,'demo');
      assert.ok(result.resultados.every(r=>r.elegible===true && r.elegibilidadEstado==='elegible'));
    }
  }
});

test('Express static build serving handles SPA routes and keeps /api/* returning 404 JSON', async t => {
  const { mkdtempSync, writeFileSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const path = await import('node:path');
  const dir = mkdtempSync(path.join(tmpdir(), 'fv-dist-'));
  writeFileSync(path.join(dir, 'index.html'), '<!doctype html><html><body>FIELDVERSE_SPA</body></html>');
  t.after(() => rmSync(dir, { recursive: true, force: true }));

  const server = createApp({ staticDir: dir }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  const base = `http://127.0.0.1:${server.address().port}`;

  const health = await fetch(base + '/api/health');
  assert.equal(health.status, 200);
  assert.equal((await health.json()).status, 'ok');

  const apiMissing = await fetch(base + '/api/no-existe');
  assert.equal(apiMissing.status, 404);
  assert.equal((await apiMissing.json()).error.code, 'NOT_FOUND');

  for (const spaPath of ['/', '/explora', '/compara']) {
    const res = await fetch(base + spaPath);
    assert.equal(res.status, 200);
    assert.match(await res.text(), /FIELDVERSE_SPA/);
  }
});
