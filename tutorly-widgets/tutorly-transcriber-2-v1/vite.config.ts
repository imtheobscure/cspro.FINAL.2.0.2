import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  /**
   * MUST stay relative in production (same convention as the main app's
   * vite.config.ts).
   *
   * This used to be "/tutorly-transcriber-2-v1/", which welds every asset URL in the
   * build to the address the app happened to sit at on the day it was built. Served
   * from anywhere else — /tutorly-widgets/tutorly-transcriber-2-v1/ — the page still
   * loads and then EVERYTHING 404s: the entry script, the stylesheet, the AI worker,
   * the wasm model, the manifest and the service worker. The catch-all answers those
   * 404s with index.html, so the browser blames the MIME type rather than the path —
   * which is why it reads as a corrupt build instead of a moved one.
   *
   * An absolute base is only ever right for an app that owns its whole domain.
   */
  base: mode === "production" ? "./" : "/",
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      manifest: {
        name: "Tutorly Transcriber",
        short_name: "Tutorly",
        description: "AI-powered transcription and translation app for language learning",
        theme_color: "#1e1b4b",
        background_color: "#0f172a",
        display: "standalone",
        display_override: ["window-controls-overlay", "standalone"],
        icons: [
          {
            src: "Tutomy_logo_192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "Tutomy_logo_512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,wasm}"],
        maximumFileSizeToCacheInBytes: 50 * 1024 * 1024, // 50MB max file size to cache
        runtimeCaching: [
          {
            urlPattern:
              /^https:\/\/cdn\.jsdelivr\.net\/npm\/@xenova\/transformers@[\d.]+\/dist\/.*\.(wasm|js)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "transformers-wasm-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  worker: {
    format: "es",
  },
}));
