import {defineConfig} from '@playwright/test';

/** Offline rendering only. No autoplay-policy bypass and no live playback context. */
export default defineConfig({
 testDir:'./tests/browser',testMatch:'audio-preview.spec.ts',fullyParallel:false,workers:1,retries:0,timeout:60_000,
 outputDir:'test-results/audio-preview-browser',
 use:{baseURL:'http://127.0.0.1:4193',headless:true,trace:'off',screenshot:'only-on-failure'},
 webServer:{command:'npm run dev -- --host 127.0.0.1 --port 4193 --strictPort',url:'http://127.0.0.1:4193/tests/browser/audio-preview.html',reuseExistingServer:false,timeout:30_000}
});
