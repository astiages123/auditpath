/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig(({ mode }) => ({
  base: '/',
  plugins: [
    react({
      babel: {
        plugins: ['babel-plugin-react-compiler'],
      },
    }),
    tsconfigPaths(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  envPrefix: ['VITE_'],
  define: {
    'process.env.NODE_ENV': JSON.stringify(mode),
  },
  build: {
    chunkSizeWarningLimit: 2600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('katex')) return 'vendor-katex';
          if (id.includes('mermaid')) return 'vendor-mermaid';
          if (
            id.includes('node_modules/recharts') ||
            id.includes('node_modules/d3')
          ) {
            return 'vendor-charts';
          }
          if (id.includes('node_modules/react')) return 'vendor-react';
          if (id.includes('@supabase')) return 'vendor-supabase';
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
}));
