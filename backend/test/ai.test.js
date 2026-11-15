import test from 'node:test';
import assert from 'node:assert/strict';
import { createExplainer } from '../src/services/ai/openai.service.js';
const input = { explicacionBase:'Evaluación incompleta, sin ganadoras.', estado:'incompleto', ganadoras:[], resultados:[{puntajes:{seco:null}}], evidencia:{origen:null} };
test('optional explanation uses deterministic text without key or on provider failures', async () => {
  for (const options of [ {apiKey:'',fetchImpl:()=>{throw Error('must not call');}}, {apiKey:'fixture',fetchImpl:async()=>{throw Error('offline');}}, {apiKey:'fixture',fetchImpl:async()=>({ok:false})}, {apiKey:'fixture',fetchImpl:async()=>({ok:true,json:async()=>({})})} ]) {
    assert.equal((await createExplainer(options)(input)).explicacionIA,input.explicacionBase);
  }
});
test('timeout bounds both network and body even when provider ignores abort', async () => {
  for (const fetchImpl of [()=>new Promise(()=>{}),async()=>({ok:true,json:()=>new Promise(()=>{})})]) {
    const result = await createExplainer({apiKey:'fixture',fetchImpl,timeoutMs:10})(input);
    assert.equal(result.origen,'fallback_timeout_ia');
    assert.equal(result.explicacionIA,input.explicacionBase);
  }
});
test('provider only returns text and cannot modify scores winners or evidence', async () => {
  const before = structuredClone(input);
  const result = await createExplainer({apiKey:'fixture',fetchImpl:async()=>({ok:true,json:async()=>({choices:[{message:{content:'Texto simulado'}}],ganadoras:['inventada'],evidencia:{origen:'live'}})})})(input);
  assert.deepEqual(result,{explicacionIA:'Texto simulado',origen:'openai_live'});
  assert.deepEqual(input,before);
});
