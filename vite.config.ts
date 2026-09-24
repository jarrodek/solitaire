import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'esnext',
  },
  server: {
    port: 8000,
    open: true,
  },
  preview: {
    port: 5000,
  },
});
