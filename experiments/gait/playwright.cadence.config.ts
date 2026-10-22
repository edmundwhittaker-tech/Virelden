import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  testDir: '.', testMatch: 'cadence.browser.spec.ts', workers: 1, timeout: 60000,
  use: { baseURL: 'http://127.0.0.1:5180', viewport: { width: 800, height: 600 }, screenshot: 'only-on-failure', video: 'off', trace: 'retain-on-failure' },
  outputDir: '../../.cadence-browser-results',
  webServer: { cwd: fileURLToPath(new URL('../..', import.meta.url)), command: './node_modules/.bin/vite --host 127.0.0.1 --port 5180',
    url: 'http://127.0.0.1:5180/cadence.html', reuseExistingServer: true },
});
