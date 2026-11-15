import { test, expect } from '@playwright/test';
import { DEMO_CATALOG } from '../../src/fixtures/demoData.js';
import { mkdir } from 'node:fs/promises';
const finca = { localidad: 'Parcela de prueba', latitude: 10.45, longitude: -85.4, suelo: 'desconocido', drenaje: 'desconocido', riego: 'riego_apoyo', mesInicio: 5, prioridad: 'equilibrio', cultivosAnteriores: [] };
for (const state of ['demo', 'unavailable', 'valid']) {
  test(`Tu finca captura ${state}`, async ({ page }, info) => {
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/**', route => {
      const catalog = route.request().url().includes('/catalog');
      return route.fulfill({ status: catalog && state === 'valid' ? 200 : 503, json: catalog && state === 'valid' ? DEMO_CATALOG : { error: { message: 'Error interno técnico que no debe aparecer' } } });
    });
    await page.goto('/');
    if (state === 'demo') {
      await page.getByRole('button', { name: 'Activar modo demostración' }).click();
      await page.getByRole('button', { name: 'Cargar Liberia · punto ilustrativo, no finca validada' }).click();
    }
    if (state === 'valid') {
      await page.evaluate(finca => localStorage.setItem('fieldverse.draft.v1', JSON.stringify({ schemaVersion: 1, finca, catalogVersion: 'demo-0.2' })), finca);
      await page.reload();
      await expect(page.getByLabel('Latitud', { exact: true })).toHaveValue('10.45');
      await expect(page.getByLabel('¿Qué tipo de riego usas?')).toHaveValue('riego_apoyo');
      await expect(page.getByRole('button', { name: 'Modo demostración', exact: true })).toHaveAttribute('aria-pressed', 'false');
      await expect(page.locator('.fv-badge-demo')).toHaveText('Demostración');
    }
    const map = page.getByRole('region', { name: /^Mapa interactivo/ });
    await expect(map).toBeVisible();
    if (state === 'unavailable') {
      await expect(page.getByRole('alert')).toContainText('No pudimos cargar las opciones');
      await expect(page.getByRole('button', { name: 'Explorar mi finca' })).toBeDisabled();
      await expect(page.getByRole('heading', { name: 'Conozcamos tu finca.' })).toBeVisible();
      await expect(page.getByText('Error interno técnico que no debe aparecer', { exact: true })).not.toBeVisible();
    }
    await page.waitForTimeout(800); // Allow visible map tiles to paint before evidence capture.
    await mkdir('test-results/capturas', { recursive: true });
    await page.screenshot({ path: `test-results/capturas/tu-finca-${state}-${info.project.name}.png`, fullPage: true });
    // Real map event updates form; coordinates remain editable without network.
    await map.click({ position: { x: 130, y: 180 } });
    const selected = await page.getByLabel('Latitud', { exact: true }).inputValue();
    expect(Number.isFinite(Number(selected)) && selected !== '').toBeTruthy();
    await page.getByRole('button', { name: 'Guardar y salir' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Tu finca quedó guardada' })).toBeVisible();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('fieldverse.draft.v1')).finca.latitude)).toBe(selected);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    await page.getByRole('region', { name: /^Mapa interactivo/ }).focus();
    await page.keyboard.press('ArrowRight'); await page.keyboard.press('Enter');
    expect(errors).toEqual([]);
  });
}

test('riego requiere precisar tipo y conserva contrato de entrada', async ({ page }) => {
  await page.route('**/api/catalog', route => route.fulfill({ json: DEMO_CATALOG }));
  await page.goto('/');
  await page.getByLabel('Latitud', { exact: true }).fill('10.45');
  await page.getByLabel('Longitud', { exact: true }).fill('-85.4');
  await page.getByRole('radio', { name: /^Tengo riego/ }).check();
  await page.getByRole('button', { name: 'Guardar y salir' }).click();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('fieldverse.draft.v1')).finca.riego)).toBe('');
  await page.getByLabel('¿Qué tipo de riego usas?').selectOption('riego_apoyo');
  await page.getByRole('button', { name: 'Guardar y salir' }).click();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('fieldverse.draft.v1')).finca.riego)).toBe('riego_apoyo');
  await page.getByRole('button', { name: 'Explorar mi finca' }).click();
  await expect(page).toHaveURL(/\/explora$/);
});
