import {defineConfig} from '@playwright/test';
/** Optional isolated DOM contract suite. Does not change the game's browser QA configuration. */
export default defineConfig({
 testDir:'./tests/browser',testMatch:'equipment-panel.spec.ts',workers:1,retries:0,
 use:{baseURL:'http://127.0.0.1:4175',viewport:{width:1440,height:1000},headless:true,screenshot:'only-on-failure',trace:'off'},
 webServer:{command:'npm run dev -- --host 127.0.0.1 --port 4175 --strictPort',url:'http://127.0.0.1:4175',reuseExistingServer:!process.env.CI},
});
