import {defineConfig} from '@playwright/test';
/** Dedicated unseeded native-input campaign acceptance. Run `npm test` first.
 * Main game is Phaser.CANVAS/rAF. No software-WebGL switches, save seeds or dense traces.
 */
export default defineConfig({
 testDir:'./tests/browser',testMatch:'native-campaign.spec.ts',fullyParallel:false,workers:1,retries:0,timeout:1_500_000,
 use:{baseURL:'http://127.0.0.1:4178',viewport:{width:1280,height:900},headless:true,screenshot:'only-on-failure',trace:'off'},
 webServer:{command:'npm run dev -- --host 127.0.0.1 --port 4178 --strictPort',url:'http://127.0.0.1:4178',reuseExistingServer:!process.env.CI,timeout:30_000},
});
