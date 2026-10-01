import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    // Preview platforms proxy the dev server through a randomized host
    // (e.g. sb-xxxx.vercel.run), so allow any host instead of hardcoding one.
    allowedHosts: true,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  build: {
    rollupOptions: {
      // "-r2" suffix renamed every file once (2026-10-01) so URLs Cloudflare had cached as 404 are never requested again.
      output: {
        entryFileNames: "assets/[name]-[hash]-r2.js",
        chunkFileNames: "assets/[name]-[hash]-r2.js",
        assetFileNames: "assets/[name]-[hash]-r2[extname]",
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
}));
