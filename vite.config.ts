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
    modulePreload: {
      resolveDependencies(filename, deps, { hostId: _hostId }) {
        // Prevent preloading heavy mermaid and katex on initial load
        if (
          filename.includes('vendor-mermaid') ||
          filename.includes('vendor-katex')
        ) {
          return [];
        }
        return deps;
      },
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('mermaid')) return 'vendor-mermaid';
          if (id.includes('recharts')) return 'vendor-recharts';
          if (id.includes('katex')) return 'vendor-katex';
          if (id.includes('framer-motion')) return 'vendor-motion';
          if (id.includes('@supabase')) return 'vendor-supabase';
          if (id.includes('node_modules/react')) return 'vendor-react';
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    setupFiles: ['./src/__tests__/setupTests.ts'],
  },
}));
