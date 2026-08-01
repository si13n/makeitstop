import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    // Phaser is a game engine and its minified runtime is intentionally larger
    // than Vite's general-purpose 500 kB default (about 1.4 MB / 365 kB gzip).
    chunkSizeWarningLimit: 1410
  }
});
