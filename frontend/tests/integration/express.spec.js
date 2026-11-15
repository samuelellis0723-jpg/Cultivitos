import { test, expect } from '@playwright/test';
import { adaptSimulationResponse } from '../../src/services/adapters.js';
import { fillFarm, saveReloadAndExport } from '../support/comparison.js';

test('compilado: Tu finca → Explora → Compara, advertencias, guardado, recarga y exportación con respaldo real', async ({page}) => {
  await page.goto('/');
  await expect(page.getByLabel('Latitud',{exact:true})).toHaveValue('');
  await expect(page.getByLabel('Longitud',{exact:true})).toHaveValue('');
  const history = page.waitForResponse(r=>r.url().includes('/api/climate/history?'));
  await fillFarm(page);
  const response = await history;
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.clima.periodo).toEqual({inicio:'20150101',fin:'20241231'});
  expect(body.clima.coordenadas.solicitadas).toEqual({latitude:10.63,longitude:-85.44});
  expect(body.clima.origen).toBe('backup');
  expect(body.fuente.fechaConsulta).toBe('2026-11-15T16:57:05.131Z');
  await expect(page.getByRole('heading',{name:/Historial climático 2015–2024/})).toBeVisible();
  await expect(page.getByText(/NASA POWER \(AG Community\)/).first()).toBeVisible();
  const simulation = page.waitForResponse(r => r.url().endsWith('/api/simulations'));
  await page.getByRole('link',{name:'Comparar estrategias'}).click();
  const raw = await (await simulation).json();
  expect(raw.estado).toBe('incompleto'); expect(raw.ganadoras).toEqual([]);
  expect(raw.resultados.every(r => r.elegible === null && Object.values(r.puntajes).every(v => v === null))).toBe(true);
  await expect(page.getByText('Evaluación incompleta — sin ganadora declarada')).toBeVisible();
  await expect(page.getByText('Elegibilidad no evaluable').first()).toBeVisible();
  await expect(page.getByText('Descartada',{exact:true})).toHaveCount(0);
  await expect(page.getByText('Ganadora minimax:',{exact:false})).toHaveCount(0);
  await expect(page.getByRole('region', {name:/Advertencias de/})).toHaveCount(3);
  await expect(page.getByText('No conocemos el suelo de la finca.', {exact:false}).first()).toBeVisible();
  const experimental = raw.resultados[0].advertencias.find(a => a.includes('D20/D22'));
  expect(experimental).toBeTruthy();
  await expect(page.getByText(experimental, {exact:true}).first()).toBeVisible();
  await saveReloadAndExport(page, adaptSimulationResponse(raw), {offline:true});
  await expect(page.getByText(experimental, {exact:true}).first()).toBeVisible();
  await expect(page.getByText('Elegibilidad no evaluable').first()).toBeVisible();
});

test('HTTP demo E1/E2/E3, real incompleto, evidencia ignorada, modo sintético rechazado y respaldo exclusivo de Liberia', async ({request}) => {
  const finca = {latitude:10.63,longitude:-85.44,suelo:'desconocido',drenaje:'desconocido',riego:'desconocido',cultivosAnteriores:[],mesInicio:5,prioridad:'equilibrio'};
  const post = data => request.post('/api/simulations', {data:{finca,...data}});
  const demoResponse = await post({modo:'demo'}); expect(demoResponse.status()).toBe(200);
  const demo = await demoResponse.json();
  expect(demo.resultados.map(r=>r.estrategiaId)).toEqual(['E1','E2','E3']);
  expect(demo.resultados.map(r=>Object.values(r.puntajes))).toEqual([[90,35,55],[75,80,50],[80,70,75]]);
  expect(demo.resultados.map(r=>r.peorArrepentimiento)).toEqual([45,25,10]); expect(demo.ganadoras).toEqual(['E3']);
  expect(demo.evidencia.origen).toBe('demo'); expect(demo.clima).toBeNull();
  const real = await (await post({modo:'real'})).json();
  expect(real.estado).toBe('incompleto'); expect(real.ganadoras).toEqual([]);
  expect(real.evidencia.modulos.d7.ejecutado).toBe(false);
  const forged = await post({modo:'real',evidenciaAtributos:{modo:'prueba_sintetica',declaraciones:[{atributoId:'maiz/m1/duracionDias'}]}});
  expect(forged.status()).toBe(200); expect((await forged.json()).resultados).toEqual(real.resultados);
  expect((await post({modo:'prueba_sintetica'})).status()).toBe(400);
  const other = await request.get('/api/climate/history?latitude=9.93&longitude=-84.09&start=20150101&end=20241231');
  expect(other.status()).toBe(502); expect((await other.json()).error.code).toBe('NASA_UNAVAILABLE');
  for (const path of ['/','/explora','/compara']) {
    const response = await request.get(path); expect(response.status()).toBe(200); expect(await response.text()).toContain('<div id="root">');
  }
  const missing = await request.get('/api/no-existe'); expect(missing.status()).toBe(404); expect((await missing.json()).error.code).toBe('NOT_FOUND');
});
