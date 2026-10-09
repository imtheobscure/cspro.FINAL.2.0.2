import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const appRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // The monorepo root has its own lockfile; without this Turbopack guesses the
  // workspace root and scans the whole repository. This app is its own root.
  turbopack: { root: appRoot },
  // The embedded Postgres (PGlite) and node-postgres ship native/wasm assets that
  // must stay outside the bundler's graph and be required at runtime.
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
  // The preview app and LAN devices reach the dev server by address rather than
  // by the name Next assumes, and dev-only resources are refused cross-origin.
  allowedDevOrigins: ["127.0.0.1", "localhost", "172.18.0.1"],
  images: {
    // Discovery pulls posters and stills from public catalogs (TMDB, Internet Archive,
    // Wikimedia) whose hostnames are not known ahead of time.
    remotePatterns: [
      { protocol: "https", hostname: "image.tmdb.org" },
      { protocol: "https", hostname: "archive.org" },
      { protocol: "https", hostname: "**.archive.org" },
      { protocol: "https", hostname: "upload.wikimedia.org" },
      { protocol: "https", hostname: "files.vidstack.io" },
    ],
  },
};

export default nextConfig;
