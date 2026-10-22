import {defineConfig} from '@playwright/test';
/** Real browser audio lifecycle. CI invokes xvfb-run; no autoplay bypass switches. */
export default defineConfig({
 testDir:'./tests/browser',testMatch:['audio-lifecycle.spec.ts','audio-native-visibility.spec.ts'],outputDir:'test-results/audio-native-failures',workers:1,retries:0,timeout:90_000,
 use:{baseURL:'http://127.0.0.1:4179',viewport:{width:1280,height:900},headless:false,screenshot:'only-on-failure',trace:'off'},
 webServer:[
  {command:'npm run preview -- --host 127.0.0.1 --port 4179 --strictPort',url:'http://127.0.0.1:4179',reuseExistingServer:!process.env.CI,timeout:30_000},
  {command:'python3 -m http.server 4191 --bind 127.0.0.1 --directory .test-build',url:'http://127.0.0.1:4191',reuseExistingServer:!process.env.CI,timeout:30_000},
 ],
});
