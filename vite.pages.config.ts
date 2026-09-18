import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Reuse the simulation UI and browser workers without a server runtime.
export default defineConfig({
  root: fileURLToPath(new URL('./static-site', import.meta.url)),
  base: process.env.PAGES_BASE_PATH || '/fun-sims/',
  publicDir: fileURLToPath(new URL('./public', import.meta.url)),
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
  build: {
    outDir: fileURLToPath(new URL('./dist-pages', import.meta.url)),
    emptyOutDir: true,
  },
});
