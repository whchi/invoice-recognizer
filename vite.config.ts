import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    emptyOutDir: true,
    outDir: '../dist/client',
  },
  plugins: [
    tanstackRouter({
      generatedRouteTree: './src/routeTree.gen.ts',
      routesDirectory: './src/routes',
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@frontend': path.resolve(__dirname, './frontend/src'),
      '@backend': path.resolve(__dirname, './backend/src'),
    },
  },
  root: 'frontend',
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
});
