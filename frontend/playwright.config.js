import { defineConfig } from '@playwright/test';
const port = Number(process.env.E2E_PORT || 5174);
const baseURL = `http://127.0.0.1:${port}`;
export default defineConfig({
  testDir: './tests/e2e',
  use: { baseURL },
  projects: [{ name: 'desktop', use: { viewport: { width: 1366, height: 900 } } }, { name: 'mobile', use: { viewport: { width: 390, height: 844 } } }],
  webServer: { command: `npm run dev -- --port ${port}`, url: baseURL, reuseExistingServer: false, env: { VITE_HISTORY_START: '20150101', VITE_HISTORY_END: '20241231' } },
});
