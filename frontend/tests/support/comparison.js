import { expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

export async function fillFarm(page) {
  await page.getByLabel('Latitud', { exact: true }).fill('10.63');
  await page.getByLabel('Longitud', { exact: true }).fill('-85.44');
  await page.locator('.fv-details-summary').click();
  await page.getByLabel('Mes de inicio previsto (1–12)').selectOption('5');
  await page.getByRole('button', { name: 'Explorar mi finca' }).click();
}
export async function exportComparison(page) {
  const trigger = page.getByRole('button', { name: 'Ver evidencia y exportar' });
  if (await trigger.isVisible()) await trigger.click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Descargar resultados (.json)' }).click();
  const file = await download;
  const data = JSON.parse(await readFile(await file.path(), 'utf8'));
  if (await page.getByRole('dialog').isVisible()) await page.keyboard.press('Escape');
  return data;
}
export async function saveReloadAndExport(page, simulation, { offline = false } = {}) {
  const current = await exportComparison(page);
  expect(current.simulacion).toEqual(simulation);
  await page.getByRole('button', { name: 'Guardar comparación', exact: true }).click();
  await expect(page.getByText('Comparación guardada localmente', { exact: false })).toBeVisible();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('fieldverse.comparisons.v1'))[0]);
  expect(saved.simulation).toEqual(simulation);
  if (offline) await page.route('**/api/**', route => route.abort());
  await page.reload();
  await page.getByRole('button', { name: 'Consultar resultado guardado' }).click();
  await expect(page.getByRole('heading', { name: 'Resultado histórico guardado' })).toBeVisible();
  const historical = await exportComparison(page);
  expect(historical.simulation).toEqual(simulation);
  expect(historical.selectedStrategyId).toEqual(saved.selectedStrategyId);
}
