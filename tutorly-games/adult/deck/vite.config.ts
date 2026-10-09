import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    watch: {
      /*
       * `dist` is excluded from the dev watcher.
       *
       * The build output is a single `dist/index.html` *inside* the served root, so every
       * `npm run build` counted as a source change and reloaded every open tab. The reload
       * lands while the module graph is mid-flight, so the page sometimes came back blank
       * with a 500 on a source file that compiles perfectly on its own — which reads as a
       * broken edit and is not one. Nothing in `dist` is ever imported during development,
       * so there is nothing to lose by ignoring it.
       */
      ignored: ["**/dist/**"],
    },
  },
});
