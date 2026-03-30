import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '@backend': path.resolve(__dirname, './backend/src'),
      '@frontend': path.resolve(__dirname, './frontend/src'),
    },
    exclude: ['**/node_modules/**', '**/tests/e2e/**'],
    globals: true,
    passWithNoTests: true,
  },
});
