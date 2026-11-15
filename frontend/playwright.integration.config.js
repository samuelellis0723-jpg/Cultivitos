import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/integration',
  use: { baseURL: 'http://127.0.0.1:5185' },
  projects: [{ name: 'desktop', use: { viewport: { width: 1366, height: 900 } } }, { name: 'mobile', use: { viewport: { width: 390, height: 844 } } }],
  // Run the documented build first. No Vite dev server can hide missing build variables.
  webServer: { command: 'node tests/support/serve-compiled.mjs', url: 'http://127.0.0.1:5185/api/health', reuseExistingServer: false },
});
