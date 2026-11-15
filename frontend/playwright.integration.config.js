import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir:'./tests/integration',
  use:{ baseURL:'http://127.0.0.1:5185' },
  projects:[{name:'desktop',use:{viewport:{width:1366,height:900}}},{name:'mobile',use:{viewport:{width:390,height:844}}}],
  webServer:[
    {command:'node ../backend/scripts/serve-integration-check.mjs',url:'http://127.0.0.1:3015/api/health'},
    {command:'npm run dev -- --port 5185',url:'http://127.0.0.1:5185',env:{API_PROXY_TARGET:'http://127.0.0.1:3015',VITE_HISTORY_START:'20150101',VITE_HISTORY_END:'20241231'}},
  ],
});
