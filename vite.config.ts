import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { syncNotes } from './scripts/sync-notes'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
    plugins: [
        react(),
        {
            name: 'markdown-note-sync',
            configureServer(server) {
                let timer: NodeJS.Timeout;
                const triggerSync = (reason: string) => {
                    clearTimeout(timer);
                    timer = setTimeout(async () => {
                        console.log(`\n[Auto-Sync] ${reason} tespit edildi, senkronize ediliyor...`);
                        try {
                            await syncNotes();
                        } catch (err) {
                            console.error('[Auto-Sync] Hata:', err);
                        }
                    }, 800);
                };

                server.httpServer?.once('listening', () => {
                    triggerSync('Server başlangıcı');
                });

                server.watcher.on('all', (event, filePath) => {
                    const relativePath = path.relative(process.cwd(), filePath);
                    if (relativePath.startsWith('public/notes')) {
                        // Trigger on any change in the notes directory (files or folders)
                        const events = ['add', 'change', 'unlink', 'addDir', 'unlinkDir'];
                        if (events.includes(event)) {
                            triggerSync(`${event} - ${path.basename(filePath)}`);
                        }
                    }
                });
            }
        }
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
    define: {
        'process.env': {},
    },
    // Production build optimizations
    esbuild: {
        // Remove console.log in production builds
        drop: mode === 'production' ? ['console', 'debugger'] : [],
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    // Vendor chunks for better caching
                    'vendor-react': ['react', 'react-dom', 'react-router-dom'],
                    'vendor-ui': ['framer-motion', 'lucide-react', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
                    'vendor-charts': ['recharts'],
                    'vendor-markdown': ['react-markdown', 'remark-math', 'rehype-katex', 'katex'],
                    'vendor-query': ['@tanstack/react-query', 'zustand'],
                    'vendor-supabase': ['@supabase/supabase-js'],
                },
            },
        },
    },
}))
