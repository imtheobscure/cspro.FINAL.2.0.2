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
  base: "./",
  plugins: [react(), tailwindcss(), viteSingleFile()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // react/react-dom used to be aliased to this folder's own node_modules,
      // which was never installed — so `npm run build` (and the root-vite build
      // in scripts/build-widgets.mjs) failed on the first import with
      // "Could not load …/combat-arena/node_modules/react/jsx-runtime". Left to
      // normal resolution they walk up to the checkout's root node_modules, the
      // same place every other root-vite widget gets them.
    },
  },
});
