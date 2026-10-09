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
  // NOTE: a `base` here would be pointless — vite-plugin-singlefile forces `base = "./"` so it
  // can inline the bundle. That is why App.tsx resolves the scene artwork through
  // `import.meta.env.BASE_URL`: it is `"./"`, so the images resolve relative to the page. The hub
  // links to `/tutorly-games/adult/dungeon/index.html`, and `./images/…` from there is
  // `/tutorly-games/adult/dungeon/images/…` — correct, and it survives the folder being
  // moved. The old root-absolute `/images/…` did not: it pointed at the site root and 404'd.
  plugins: [react(), tailwindcss(), viteSingleFile()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
