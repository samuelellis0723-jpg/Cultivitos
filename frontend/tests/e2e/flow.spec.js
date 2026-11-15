import { test, expect } from '@playwright/test';
import { DEMO_CATALOG, DEMO_SIMULATION_CASES } from '../../src/fixtures/demoData.js';
const finca = { latitude: 9.93, longitude: -84.09, suelo: 'desconocido', drenaje: 'desconocido', riego: 'desconocido', mesInicio: 5, prioridad: 'equilibrio', cultivosAnteriores: [] };
async function setup(page, result, status = 200, catalog = DEMO_CATALOG) {
  await page.route('**/api/**', async route => {
    const url = route.request().url();
    const body = url.includes('/catalog') ? catalog : url.includes('/simulations') ? result : { error: { message: 'Proveedor no disponible' } };
    await route.fulfill({ status: url.includes('/simulations') ? status : url.includes('/catalog') ? 200 : 503, json: body });
  });
  await page.goto('/');
  await page.evaluate(finca => localStorage.setItem('fieldverse.draft.v1', JSON.stringify({ schemaVersion: 1, finca, catalogVersion: 'demo-0.2' })), finca);
  await page.goto('/compara');
}
for (const [key, text] of [['default', 'Ganadora minimax:'], ['tie', 'Empate minimax:'], ['incomplete', 'Evaluación incompleta'], ['noOptions', 'Sin estrategias elegibles']]) {
  test(`estado ${key}`, async ({ page }) => {
    const fixture = DEMO_SIMULATION_CASES[key === 'noOptions' ? 'no_options' : key];
    const provisionalCatalog = structuredClone(DEMO_CATALOG);
    if (key === 'incomplete') {
      provisionalCatalog.estrategias.forEach((strategy) => { strategy.parametrosPuntuacion = []; });
    }
    await setup(page, fixture, 200, provisionalCatalog);
    await expect(page.getByText(text, { exact: false }).first()).toBeVisible();
    if (['incomplete','noOptions'].includes(key)) await expect(page.getByText('Ganadora minimax:')).toHaveCount(0);
    if (key === 'incomplete') await expect(page.getByText('Provisional · reglas pendientes').first()).toBeVisible();
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
  await expect(page.getByText('Selección guardada: E3')).toBeVisible();
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
  const request = page.waitForRequest(req => req.url().includes('/api/climate/history?'));
  await page.goto('/explora');
  const url = new URL((await request).url());
  expect(url.searchParams.get('start')).toBe('20150101');
  expect(url.searchParams.get('end')).toBe('20241231');
  const tab = page.getByRole('tab', { name: 'Habitual', exact: true });
  await tab.focus(); await tab.press('End');
  await expect(page.getByRole('tab', { name: 'Más lluvioso' })).toBeFocused();
});

function climateResponse(latitude, longitude) {
  const start = new Date(Date.UTC(2015, 0, 1));
  const end = new Date(Date.UTC(2025, 0, 1));
  const serie = [];
  for (let day = new Date(start); day < end; day.setUTCDate(day.getUTCDate() + 1)) {
    serie.push({ fecha: day.toISOString().slice(0, 10).replaceAll('-', ''), valor: null });
  }
  const days = serie.length;
  const vars = Object.fromEntries(['precipitacion', 'temperaturaMedia', 'temperaturaMaxima'].map((key) => [key, {
    unidad: key === 'precipitacion' ? 'mm' : '°C', fechas: { inicio: '20150101', fin: '20241231' },
    procedencia: 'live', fechaConsulta: '2026-11-15T12:00:00Z', fuenteId: 'sim-api',
    cobertura: { diasEsperados: days, diasPresentes: 0, porcentaje: 0, faltantes: serie.map(item => item.fecha) }, serie,
  }]));
  return {
    coordenadas: { solicitadas: { latitude, longitude }, devueltas: { latitude, longitude } },
    periodo: { inicio: '20150101', fin: '20241231' }, resolucion: 'diaria', origen: 'live',
    fuentes: [{ id: 'sim-api', proveedor: 'Respuesta simulada para pruebas', urlConsulta: 'https://example.org/sim',
      coordenadasSolicitadas: { latitude, longitude }, coordenadasDevueltas: { latitude, longitude },
      periodo: { inicio: '20150101', fin: '20241231' }, unidades: { precipitacion: 'mm', temperaturaMedia: '°C', temperaturaMaxima: '°C' },
      fechaConsulta: '2026-11-15T12:00:00Z', cobertura: { porcentaje: 0 }, origen: 'live' }], variables: vars,
  };
}

test('historial automático corresponde a ubicación y muestra período, fuente y procedencia', async ({ page }) => {
  const selected = { ...finca, latitude: 10.63, longitude: -85.44 };
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/catalog')) return route.fulfill({ json: DEMO_CATALOG });
    if (url.pathname.endsWith('/climate/history')) {
      expect(url.searchParams.get('latitude')).toBe('10.63');
      expect(url.searchParams.get('longitude')).toBe('-85.44');
      expect(url.searchParams.get('start')).toBe('20150101');
      expect(url.searchParams.get('end')).toBe('20241231');
      return route.fulfill({ json: climateResponse(10.63, -85.44) });
    }
    return route.fulfill({ status: 503, json: { error: { message: 'API pendiente' } } });
  });
  await page.goto('/');
  await page.evaluate(({ draft, version }) => localStorage.setItem('fieldverse.draft.v1', JSON.stringify({ schemaVersion: 1, finca: draft, catalogVersion: version })), { draft: selected, version: DEMO_CATALOG.version });
  await page.goto('/');
  await page.reload();
  await page.getByRole('button', { name: 'Explorar mi finca' }).click();
  await expect(page).toHaveURL(/\/explora$/);
  await expect(page.getByRole('heading', { name: /Historial climático 2015–2024/ })).toBeVisible();
  await expect(page.getByText('10.63, -85.44', { exact: true })).toBeVisible();
  await expect(page.getByText('2015-01-01 a 2024-12-31')).toBeVisible();
  await expect(page.getByText('Respuesta simulada para pruebas')).toBeVisible();
  await expect(page.getByText('Datos reales · consulta directa', { exact: true }).first()).toBeVisible();
});

test('una respuesta tardía de la ubicación anterior no reemplaza el historial nuevo', async ({ page }) => {
  let releaseOld;
  let oldResponseStarted;
  const oldStarted = new Promise(resolve => { oldResponseStarted = resolve; });
  const oldGate = new Promise(resolve => { releaseOld = resolve; });
  let historyCount = 0;
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/catalog')) return route.fulfill({ json: DEMO_CATALOG });
    if (url.pathname.endsWith('/climate/history')) {
      historyCount += 1;
      const latitude = Number(url.searchParams.get('latitude'));
      const longitude = Number(url.searchParams.get('longitude'));
      if (latitude === 9.93) {
        oldResponseStarted();
        await oldGate;
        try { await route.fulfill({ json: climateResponse(latitude, longitude) }); } catch { /* The browser may abort the superseded request. */ }
      } else {
        await route.fulfill({ json: climateResponse(latitude, longitude) });
      }
      return;
    }
    return route.fulfill({ status: 503, json: { error: { message: 'API pendiente' } } });
  });
  await page.goto('/');
  await page.evaluate(({ draft, version }) => localStorage.setItem('fieldverse.draft.v1', JSON.stringify({ schemaVersion: 1, finca: draft, catalogVersion: version })), { draft: finca, version: DEMO_CATALOG.version });
  await page.reload();
  await page.getByRole('button', { name: 'Explorar mi finca' }).click();
  await oldStarted;
  await page.getByRole('link', { name: 'Editar finca' }).click();
  await page.getByLabel('Latitud', { exact: true }).fill('10.63');
  await page.getByLabel('Longitud', { exact: true }).fill('-85.44');
  await page.getByRole('button', { name: 'Explorar mi finca' }).click();
  await expect(page.getByText('10.63, -85.44', { exact: true })).toBeVisible();
  await expect(page.getByText('9.93, -84.09')).toHaveCount(0);
  releaseOld();
  await page.waitForTimeout(250);
  await expect(page.getByText('10.63, -85.44', { exact: true })).toBeVisible();
  expect(historyCount).toBeGreaterThanOrEqual(2);
});
