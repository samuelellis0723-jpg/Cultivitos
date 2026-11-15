import { test, expect } from '@playwright/test';
import { DEMO_CATALOG, DEMO_SIMULATION_CASES } from '../../src/fixtures/demoData.js';
const finca = { latitude: 9.93, longitude: -84.09, suelo: 'desconocido', drenaje: 'desconocido', riego: 'desconocido', mesInicio: 5, prioridad: 'equilibrio', cultivosAnteriores: [] };
async function setup(page, result, status = 200) {
  await page.route('**/api/**', async route => {
    const url = route.request().url();
    const body = url.includes('/catalog') ? DEMO_CATALOG : url.includes('/simulations') ? result : { error: { message: 'Proveedor no disponible' } };
    await route.fulfill({ status: url.includes('/simulations') ? status : url.includes('/catalog') ? 200 : 503, json: body });
  });
  await page.goto('/');
  await page.evaluate(finca => localStorage.setItem('fieldverse.draft.v1', JSON.stringify({ schemaVersion: 1, finca, catalogVersion: 'demo-0.2' })), finca);
  await page.goto('/compara');
}
for (const [key, text] of [['default', 'Ganadora minimax:'], ['tie', 'Empate minimax:'], ['incomplete', 'Evaluación incompleta'], ['noOptions', 'Sin estrategias elegibles']]) {
  test(`estado ${key}`, async ({ page }) => {
    const fixture = DEMO_SIMULATION_CASES[key === 'noOptions' ? 'no_options' : key];
    await setup(page, fixture);
    await expect(page.getByText(text, { exact: false }).first()).toBeVisible();
    if (['incomplete','noOptions'].includes(key)) await expect(page.getByText('Ganadora minimax:')).toHaveCount(0);
  });
}
for (const [name, result, status] of [['inválido', {}, 200], ['HTTP', {}, 502]]) test(name, async ({ page }) => {
  await setup(page, result, status);
  await expect(page.getByText('No se pudo obtener la comparación del servidor')).toBeVisible();
});
test('guardar, recargar y consultar sin API disponible', async ({ page }) => {
  await setup(page, DEMO_SIMULATION_CASES.default);
  await page.getByRole('button', { name: 'Guardar comparación', exact: true }).click();
  await expect(page.getByText('Comparación guardada localmente', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Consultar resultado guardado' })).toBeVisible();
  await page.route('**/api/**', route => route.fulfill({ status: 503, json: { error: { message: 'Sin servicio' } } }));
  await page.reload();
  await page.getByRole('button', { name: 'Consultar resultado guardado' }).click();
  await expect(page.getByRole('heading', { name: 'Resultado histórico guardado' })).toBeVisible();
  await expect(page.getByText('Selección guardada: C')).toBeVisible();
});
test('teclado y modal móvil', async ({ page }, info) => {
  await setup(page, DEMO_SIMULATION_CASES.default);
  const first = page.getByRole('tab', { name: 'Habitual', exact: true });
  await first.focus(); await first.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Más seco' })).toBeFocused();
  if (info.project.name === 'mobile') {
    const trigger = page.getByRole('button', { name: 'Ver evidencia y exportar' });
    await trigger.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: 'Cerrar panel de evidencia' }).press('Shift+Tab');
    expect(await page.evaluate(() => document.querySelector('dialog').contains(document.activeElement))).toBeTruthy();
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.querySelector('dialog').contains(document.activeElement))).toBeTruthy();
    await page.keyboard.press('Escape'); await expect(trigger).toBeFocused();
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
});

test('Explora mueve foco con flechas y no consulta período oculto', async ({ page }) => {
  await setup(page, DEMO_SIMULATION_CASES.default);
  await page.goto('/explora');
  await expect(page.getByText('Historial pendiente:', { exact: false })).toBeVisible();
  const tab = page.getByRole('tab', { name: 'Habitual', exact: true });
  await tab.focus(); await tab.press('End');
  await expect(page.getByRole('tab', { name: 'Más lluvioso' })).toBeFocused();
});
