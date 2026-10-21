import { defineConfig } from 'vite';
export default defineConfig({
  // Relative assets work both in Codespaces and under /Virelden/ on Pages.
  base: './',
  server: { host: '0.0.0.0', port: 5173, strictPort: true, allowedHosts: ['.app.github.dev'] },
  preview: { host: '0.0.0.0', port: 4173, strictPort: true },
  build: { target: 'es2022', rollupOptions: { output: { manualChunks: { phaser: ['phaser'] } } } }
});
