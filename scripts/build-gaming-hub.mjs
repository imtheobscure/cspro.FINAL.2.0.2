/**
 * Build the Gaming Hub straight into `dist/gaming-hub/`.
 *
 * The hub is a standalone Vite + React SPA with its own package.json, but it
 * shares the same React / Vite / Tailwind toolchain as the main app. It must end
 * up inside the main `dist/` folder because that is exactly what the Express
 * server serves in production:
 *
 *     app.get("/gaming-hub*all", … sendFile(dist/gaming-hub/index.html))
 *
 * Without this step `npm run build` produces a `dist/` with no `gaming-hub`
 * folder, so the production hub silently falls back to the previous deployment.
 *
 * This script deliberately builds the hub with the ROOT toolchain (vite,
 * @vitejs/plugin-react, @tailwindcss/vite, vite-plugin-singlefile from the root
 * node_modules) and only prefers `gaming-hub/node_modules/<pkg>` when that
 * package happens to be installed there. That keeps `npm run build` working on a
 * fresh checkout that never ran `npm install` inside `gaming-hub`.
 *
 * `vite-plugin-singlefile` inlines the JS and CSS, so the artifact is a single
 * self-contained HTML file. The hub's category artwork are remote Unsplash URLs,
 * so there are no binary assets to copy.
 *
 * Run standalone with:  node scripts/build-gaming-hub.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { build } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const hubRoot = path.join(root, "gaming-hub");
const hubOut = path.join(hubRoot, "dist");
const dest = path.join(root, "dist", "gaming-hub");

if (!fs.existsSync(path.join(hubRoot, "index.html"))) {
  console.error("[gaming-hub] gaming-hub/index.html not found — nothing to build.");
  process.exit(1);
}

/** Prefer the hub's own copy of a dependency when it is installed, else the root's. */
const dep = (pkg) => {
  const local = path.join(hubRoot, "node_modules", pkg);
  return fs.existsSync(local) ? local : path.join(root, "node_modules", pkg);
};

console.log("[gaming-hub] building →", path.relative(root, hubOut));

await build({
  root: hubRoot,
  base: "./",
  configFile: false,
  logLevel: "warn",
  plugins: [react(), tailwindcss(), viteSingleFile()],
  resolve: {
    alias: {
      "@": path.join(hubRoot, "src"),
      react: dep("react"),
      "react-dom": dep("react-dom"),
    },
  },
  build: {
    outDir: hubOut,
    emptyOutDir: true,
    chunkSizeWarningLimit: 12000,
  },
});

const built = path.join(hubOut, "index.html");
if (!fs.existsSync(built)) {
  console.error("[gaming-hub] build finished but index.html was not produced.");
  process.exit(1);
}

// Copy the whole build (single-file output is just index.html, but mirror
// anything else Vite emitted so nothing is silently dropped).
fs.rmSync(dest, { recursive: true, force: true });
fs.mkdirSync(dest, { recursive: true });
for (const entry of fs.readdirSync(hubOut)) {
  fs.cpSync(path.join(hubOut, entry), path.join(dest, entry), { recursive: true });
}

const kb = (fs.statSync(path.join(dest, "index.html")).size / 1024).toFixed(0);
console.log(`[gaming-hub] wrote ${path.relative(root, dest)}/index.html (${kb} kB)`);
