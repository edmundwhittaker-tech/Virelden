import {defineConfig} from '@playwright/test';
/** Isolated authored-pose matrix and seeded actual-arena navigation; not an earned campaign. */
export default defineConfig({outputDir:'test-results/whole-enemies-browser',testDir:'./tests/browser',testMatch:'whole-enemies.spec.ts',workers:1,retries:0,timeout:120_000,
 use:{baseURL:'http://127.0.0.1:4182',viewport:{width:1440,height:1000},headless:true,screenshot:'only-on-failure',trace:'off'},
 webServer:{command:'npm run dev -- --host 127.0.0.1 --port 4182 --strictPort',url:'http://127.0.0.1:4182',reuseExistingServer:!process.env.CI}});
