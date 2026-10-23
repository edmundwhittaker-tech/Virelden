import {defineConfig} from '@playwright/test';
/** Isolated real renderer; no gameplay or save capability is enabled here. */
export default defineConfig({outputDir:'test-results/poleaxe-support',testDir:'./tests/browser',testMatch:'poleaxe-support.spec.ts',workers:1,retries:0,timeout:90_000,
 use:{baseURL:'http://127.0.0.1:4177',viewport:{width:900,height:700},headless:true,screenshot:'only-on-failure',trace:'off'},
 webServer:{command:'npm run dev -- --host 127.0.0.1 --port 4177 --strictPort',url:'http://127.0.0.1:4177',reuseExistingServer:!process.env.CI}});

