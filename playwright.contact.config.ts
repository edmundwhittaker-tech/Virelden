import {defineConfig} from '@playwright/test';
/** Isolated actual-renderer fixture. No production save/debug mutation API. */
export default defineConfig({testDir:'./tests/browser',testMatch:'melee-contact.spec.ts',workers:1,retries:0,timeout:420_000,
 use:{baseURL:'http://127.0.0.1:4176',viewport:{width:900,height:700},headless:true,screenshot:'only-on-failure',trace:'off'},
 webServer:{command:'npm run dev -- --host 127.0.0.1 --port 4176 --strictPort',url:'http://127.0.0.1:4176',reuseExistingServer:!process.env.CI}});
