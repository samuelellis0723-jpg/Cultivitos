import { test, expect } from '@playwright/test';
import { DEMO_CATALOG, DEMO_SIMULATION_CASES } from '../../src/fixtures/demoData.js';
import { fillFarm, saveReloadAndExport, exportComparison } from '../support/comparison.js';

test('demo local offline E1/E2/E3: recorrido, guardado, recarga y exportación', async ({page}) => {
  const simulationRequests = [];
  page.on('request', r => { if(r.url().endsWith('/api/simulations')) simulationRequests.push(r.url()); });
  await page.route('**/api/**', route => route.abort());
  await page.goto('/');
  await page.getByRole('button',{name:'Modo demostración',exact:true}).click();
  await expect(page.getByRole('region',{name:'Estado de modo demostración'})).toContainText('ficticios');
  await fillFarm(page);
  await page.getByRole('link',{name:'Comparar estrategias'}).click();
  await expect(page.getByText('Ganadora minimax:',{exact:false}).first()).toBeVisible();
  for (const id of ['E1','E2','E3']) await expect(page.getByRole('heading',{name:`Estrategia ${id} (demostrativa)`})).toBeVisible();
  await saveReloadAndExport(page, DEMO_SIMULATION_CASES.default);
  await expect(page.getByText('Selección guardada: E3')).toBeVisible();
  expect(simulationRequests).toEqual([]);
});

test('demo A/B/C guardada se identifica como histórica y se exporta sin reescribir IDs', async ({page}) => {
  await page.route('**/api/**', route => route.abort());
  await page.goto('/');
  const catalog = structuredClone(DEMO_CATALOG), simulation = structuredClone(DEMO_SIMULATION_CASES.default);
  const ids = {E1:'A',E2:'B',E3:'C'};
  catalog.estrategias.forEach(e => {e.id=ids[e.id];e.nombre=`Estrategia ${e.id} (demostrativa)`;});
  simulation.resultados.forEach(r => {r.estrategiaId=ids[r.estrategiaId];}); simulation.ganadoras=['C'];
  const legacy = {schemaVersion:2,id:'legacy',savedAt:'2026-11-15T20:00:00Z',dataMode:'demo',finca:{latitude:10.63,longitude:-85.44},catalog,simulation,selectedStrategyId:'C'};
  await page.evaluate(record => localStorage.setItem('fieldverse.comparisons.v1',JSON.stringify([record])),legacy);
  await page.goto('/compara');
  await expect(page.getByText('Demo histórica · formato A/B/C')).toBeVisible();
  await page.getByRole('button',{name:'Consultar resultado guardado'}).click();
  await expect(page.getByRole('note')).toContainText('Se conservan sus identificadores originales');
  expect(await exportComparison(page)).toEqual(legacy);
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('fieldverse.comparisons.v1'))[0])).toEqual(legacy);
});
