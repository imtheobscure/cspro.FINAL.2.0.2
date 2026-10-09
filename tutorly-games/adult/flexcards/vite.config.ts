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
       * `npm run build` writes `dist/index.html` *inside* the directory the dev server is
       * watching, so without this every production build registers as a source change and
       * reloads every open tab — landing mid-write and leaving a blank page behind a 500 on a
       * file that compiles perfectly well.
       */
      ignored: ["**/dist/**"],
    },
  },
});
