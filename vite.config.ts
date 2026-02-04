import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
    plugins: [
        react(),
    ],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
            "@/app": path.resolve(__dirname, "./src/app"),
            "@/features": path.resolve(__dirname, "./src/features"),
            "@/shared": path.resolve(__dirname, "./src/shared"),
            "@/config": path.resolve(__dirname, "./src/config"),
            "@/styles": path.resolve(__dirname, "./src/styles"),
        },
    },
    envPrefix: ["VITE_"],
    define: {
        "process.env.NODE_ENV": JSON.stringify(mode),
    },
    // Production build optimizations
    esbuild: {
        // Remove console.log in production builds
        drop: mode === "production" ? ["console", "debugger"] : [],
    },
    build: {
        rollupOptions: {
            output: {
                // Let Vite handle chunking automatically for better compatibility with React 19
            },
        },
    },
}));
