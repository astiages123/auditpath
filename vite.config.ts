import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig(({ mode }) => ({
  base: '/',
  plugins: [react(), tsconfigPaths()],
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
    chunkSizeWarningLimit: 1000,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // 1. React Core (en önce kontrol et - spesifik path ile)
            if (
              id.includes('/react/') ||
              id.includes('/react-dom/') ||
              id.includes('/scheduler/')
            ) {
              return 'vendor-react';
            }

            // 2. Database
            if (id.includes('@supabase')) return 'vendor-supabase';

            // 3. Routing (react-router-dom çok büyük)
            if (id.includes('react-router') || id.includes('@remix-run')) {
              return 'vendor-router';
            }

            // 4. UI Components
            if (id.includes('@radix-ui')) return 'vendor-ui';
            if (id.includes('lucide-react')) return 'vendor-icons';

            // 5. Animations
            if (id.includes('framer-motion')) return 'vendor-animations';

            // 6. State & Queries (@tanstack/react-virtual eklendi)
            if (
              id.includes('@tanstack/react-query') ||
              id.includes('@tanstack/react-virtual') ||
              id.includes('zustand')
            ) {
              return 'vendor-query';
            }

            // 7. Charts & Visualization (load with React to avoid forwardRef issues)
            if (id.includes('recharts') || id.includes('d3-')) {
              return 'vendor-react';
            }
            if (id.includes('mermaid')) return 'vendor-visualization';

            // 8. Markdown & Math
            if (
              id.includes('react-markdown') ||
              id.includes('remark-') ||
              id.includes('rehype-') ||
              id.includes('katex') ||
              id.includes('unist-') ||
              id.includes('mdast-')
            ) {
              return 'vendor-markdown';
            }

            // 9. Forms & Validation
            if (
              id.includes('zod') ||
              id.includes('react-hook-form') ||
              id.includes('@hookform/resolvers')
            ) {
              return 'vendor-forms';
            }

            // 10. Utilities
            if (
              id.includes('date-fns') ||
              id.includes('clsx') ||
              id.includes('class-variance-authority') ||
              id.includes('tailwind-merge')
            ) {
              return 'vendor-utils';
            }

            // 11. Effects & Feedback (YENİ CHUNK)
            if (id.includes('canvas-confetti') || id.includes('sonner')) {
              return 'vendor-effects';
            }

            // 12. Security & Media (YENİ CHUNK)
            if (
              id.includes('dompurify') ||
              id.includes('react-medium-image-zoom')
            ) {
              return 'vendor-security';
            }

            // 13. Theme & Helpers
            if (id.includes('next-themes') || id.includes('p-limit')) {
              return 'vendor-helpers';
            }

            // 14. Geri kalan
            return 'vendor';
          }
        },
      },
    },
  },
}));
