import { defineConfig } from 'vite';

const repoBase = '/Mejengapp/';

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? repoBase : '/'
});
