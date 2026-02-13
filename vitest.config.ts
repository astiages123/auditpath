import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.tsx'],
    include: [
      'src/__tests__/**/*.{test,spec}.{ts,tsx}',
      'src/**/*.test.{ts,tsx}',
    ],
    exclude: [
      'node_modules',
      'dist',
      'src/main.tsx',
      'src/app/main.tsx',
      'src/__tests__/shared/components/ErrorBoundary.test.tsx',
    ],

    // Kilitlenmeyi önlemek için havuz sistemini basitleştiriyoruz
    pool: 'forks',

    coverage: {
      provider: 'v8',
      enabled: true,
      reporter: ['text', 'html', 'lcov'],
      include: ['src/shared/lib/**', 'src/features/**', 'src/app/providers/**'],
      exclude: [
        'src/**/*.test.*',
        'src/__tests__/**',
        '**/*.md',
        '**/documentation.md',
        '**/index.ts',
        '**/*.d.ts',
        '**/node_modules/**',
      ],
      thresholds: {
        statements: 35,
        branches: 25,
        functions: 30,
        lines: 35,
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
