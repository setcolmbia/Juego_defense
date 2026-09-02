import { defineConfig } from 'vite';

// Served from https://<owner>.github.io/Juego_defense/ via GitHub Pages,
// so asset URLs need the repo name as a base path in production.
export default defineConfig({
  base: process.env.GITHUB_PAGES ? '/Juego_defense/' : '/',
});
