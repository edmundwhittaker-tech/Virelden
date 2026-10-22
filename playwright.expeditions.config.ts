import {defineConfig} from '@playwright/test';
/** Seeded v4 feature acceptance, NOT a claim of an earned full campaign walkthrough.
 * Run `npm test` first to build the actual core used by the validated seed factory.
 */
export default defineConfig({
 testDir:'./tests/browser',testMatch:'connected-expeditions.spec.ts',workers:1,retries:0,timeout:360_000,
 use:{baseURL:'http://127.0.0.1:4177',viewport:{width:1280,height:900},headless:true,screenshot:'only-on-failure',trace:'off'},
 webServer:{command:'npm run dev -- --host 127.0.0.1 --port 4177 --strictPort',url:'http://127.0.0.1:4177',reuseExistingServer:!process.env.CI,timeout:30_000},
});
