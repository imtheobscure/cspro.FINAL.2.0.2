import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Tutoflix is served from https://cspro.tutomy.com/tutorly-games/adult/flix/
// so every asset URL must carry that prefix (scripts/check-static-deploy.mjs
// fails the build if this base path and the deployed folder disagree).
export default defineConfig({
  base: "/tutorly-games/adult/flix/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    port: 5204,
    strictPort: true,
  },
  build: {
    target: "es2022",
    chunkSizeWarningLimit: 4000,
  },
});
