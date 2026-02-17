import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ mode }) => ({
  base: "/",
  plugins: [react(), tsconfigPaths()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  envPrefix: ["VITE_"],
  define: {
    "process.env.NODE_ENV": JSON.stringify(mode),
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("@supabase")) return "vendor-supabase";
            if (id.includes("framer-motion")) return "vendor-animations";
            if (id.includes("recharts")) return "vendor-charts";
            if (id.includes("lucide-react")) return "vendor-icons";
            if (id.includes("@radix-ui")) return "vendor-ui";
            if (id.includes("@tanstack/react-query")) return "vendor-query";
            if (
              id.includes("react-markdown") ||
              id.includes("remark") ||
              id.includes("rehype") ||
              id.includes("katex")
            ) {
              return "vendor-markdown";
            }
            if (id.includes("mermaid")) return "vendor-visualization";
            return "vendor";
          }
        },
      },
    },
  },
}));
