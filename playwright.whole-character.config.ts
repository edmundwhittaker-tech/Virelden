import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./tests/browser',testMatch:'whole-character-effects.spec.ts',workers:1,retries:0,timeout:90_000,
 use:{baseURL:'http://127.0.0.1:4189',viewport:{width:900,height:700},headless:true,screenshot:'only-on-failure',trace:'off'},
 webServer:{command:'npm run dev -- --host 127.0.0.1 --port 4189 --strictPort',url:'http://127.0.0.1:4189',reuseExistingServer:!process.env.CI}});
