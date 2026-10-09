// Client-side: mount a local Unity WebGL build folder so it can be played in the console.

import { appUrl } from "./basePath";

export const LOCAL_CACHE = "tutorly-local-unity-v1";

/**
 * Where a mounted build's files live, under the app's own sub-path.
 *
 * Not `/local-unity` at the site root: the console is served from
 * `/tutorly-games/adult/console/`, and a root-absolute path would leave both the
 * service worker's scope and the app itself, so every request would 404 on a host
 * where the console is not at the root of its domain. `appUrl()` is the one place
 * that knows the sub-path (see `lib/basePath.ts`).
 */
const LOCAL_ROOT = appUrl("local-unity");

const MIME: Record<string, string> = {
  html: "text/html; charset=utf-8",
  htm: "text/html; charset=utf-8",
  js: "application/javascript; charset=utf-8",
  mjs: "application/javascript; charset=utf-8",
  css: "text/css; charset=utf-8",
  json: "application/json",
  wasm: "application/wasm",
  data: "application/octet-stream",
  unityweb: "application/octet-stream",
  mem: "application/octet-stream",
  symbols: "application/octet-stream",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  svg: "image/svg+xml",
  ico: "image/x-icon",
  webp: "image/webp",
  mp3: "audio/mpeg",
  ogg: "audio/ogg",
  wav: "audio/wav",
  mp4: "video/mp4",
  webm: "video/webm",
  ttf: "font/ttf",
  woff: "font/woff",
  woff2: "font/woff2",
  txt: "text/plain",
  xml: "application/xml",
  bin: "application/octet-stream",
  bundle: "application/octet-stream",
};

function mimeFor(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  return MIME[ext] || "application/octet-stream";
}

export async function ensureLocalServiceWorker(): Promise<boolean> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return false;
  try {
    // Registered from the app's own directory: a worker may only control URLs at or
    // below the folder its script came from, so `scope: "/"` here was both a 404 (the
    // file is not at the site root) and, if it had resolved, a SecurityError.
    // `appUrl("")` is the app's directory with its trailing slash, which is exactly the
    // widest scope a worker registered from inside that directory may claim.
    await navigator.serviceWorker.register(appUrl("unity-sw.js"), { scope: appUrl("") });
    await navigator.serviceWorker.ready;
    return true;
  } catch (e) {
    console.error("Service worker registration failed", e);
    return false;
  }
}

function rewriteHtml(html: string): string {
  return html
    .replace(/<meta[^>]+http-equiv=["']?Content-Security-Policy["']?[^>]*>/gi, "")
    .replace(/(["'])https?:\/\/www\.youtube\.com\/game_api\/v\d\/?\1/gi, "$1/ytgame-shim.js$1");
}

async function maybeGunzip(file: File): Promise<Blob> {
  if (!file.name.toLowerCase().endsWith(".gz")) return file;
  if (typeof DecompressionStream === "undefined") return file;
  try {
    const ds = new DecompressionStream("gzip");
    const stream = file.stream().pipeThrough(ds);
    return await new Response(stream).blob();
  } catch {
    return file;
  }
}

export interface MountedLocalGame {
  gameId: string;
  entryUrl: string; // /local-unity/<id>/index.html
  fileCount: number;
  totalBytes: number;
  entryName: string;
}

/**
 * Store all files of a Unity WebGL build folder under /local-unity/<gameId>/ in the Cache API.
 * Files are served by public/unity-sw.js so relative Build/… references resolve naturally.
 */
export async function mountLocalUnityBuild(
  files: File[],
  onProgress?: (done: number, total: number) => void
): Promise<MountedLocalGame> {
  if (files.length === 0) throw new Error("No files selected");
  const ok = await ensureLocalServiceWorker();
  if (!ok) throw new Error("Service workers are unavailable in this browser; local builds need them.");

  // Determine relative paths and the entry HTML (shallowest .html, prefer index.html)
  const entries = files.map((f) => {
    const rel = ((f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name).replace(/\\/g, "/");
    return { file: f, rel };
  });

  const htmlCandidates = entries
    .filter((e) => /\.html?$/i.test(e.rel))
    .sort((a, b) => {
      const da = a.rel.split("/").length;
      const dbb = b.rel.split("/").length;
      if (da !== dbb) return da - dbb;
      const ia = /index\.html?$/i.test(a.rel) ? 0 : 1;
      const ib = /index\.html?$/i.test(b.rel) ? 0 : 1;
      return ia - ib;
    });

  if (htmlCandidates.length === 0) {
    throw new Error("No index.html found. Select the exported Unity WebGL folder (contains index.html, Build/, TemplateData/).");
  }

  const entry = htmlCandidates[0];
  const baseDir = entry.rel.includes("/") ? entry.rel.slice(0, entry.rel.lastIndexOf("/") + 1) : "";
  const gameId = `local-${Date.now().toString(36)}`;
  const cache = await caches.open(LOCAL_CACHE);

  let done = 0;
  let totalBytes = 0;
  for (const e of entries) {
    if (!e.rel.startsWith(baseDir)) {
      done++;
      continue;
    }
    const relFromBase = e.rel.slice(baseDir.length);
    if (!relFromBase) {
      done++;
      continue;
    }
    const key = `${LOCAL_ROOT}/${gameId}/${relFromBase}`;
    let body: Blob;
    const headers: Record<string, string> = { "content-type": mimeFor(relFromBase.replace(/\.gz$/i, "")) };

    if (/\.html?$/i.test(relFromBase)) {
      body = new Blob([rewriteHtml(await e.file.text())], { type: "text/html" });
    } else if (/\.gz$/i.test(relFromBase)) {
      body = await maybeGunzip(e.file);
    } else {
      body = e.file;
    }
    totalBytes += body.size;
    await cache.put(new Request(key), new Response(body, { headers }));
    done++;
    onProgress?.(done, entries.length);
  }

  const entryName = entry.rel.slice(baseDir.length);
  return {
    gameId,
    // The same path the files were stored under, so the worker's `cache.match(pathname)`
    // finds them without the worker needing to know the sub-path.
    entryUrl: `${LOCAL_ROOT}/${gameId}/${entryName}`,
    fileCount: done,
    totalBytes,
    entryName,
  };
}
