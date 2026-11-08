/// <reference types="vitest" />
/// <reference types="vite/client" />

import path from 'node:path';

import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import viteTsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  base: './',
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
    }),
    react(),
    viteTsconfigPaths(),
  ],
  server: {
    port: 3000,
    allowedHosts: [],
  },
  preview: {
    port: 3000,
    allowedHosts: [],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  optimizeDeps: { exclude: ['fsevents'] },
});
