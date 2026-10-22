import {defineConfig} from '@playwright/test';
/** Read-only snapshots of an isolated actual-renderer fixture. No production save mutation API. */
export default defineConfig({testDir:'./tests/browser',testMatch:'raider-spacing.spec.ts',workers:1,retries:0,timeout:45_000,
 use:{baseURL:'http://127.0.0.1:4177',viewport:{width:900,height:700},headless:true,screenshot:'only-on-failure',trace:'off'},
 webServer:{command:'npm run dev -- --host 127.0.0.1 --port 4177 --strictPort',url:'http://127.0.0.1:4177',reuseExistingServer:!process.env.CI}});
