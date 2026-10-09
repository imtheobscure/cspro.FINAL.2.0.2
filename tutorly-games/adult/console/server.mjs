#!/usr/bin/env node
/**
 * Tutorly Console — a server that can stream YouTube Playables in-rig.
 *
 * WHY THIS EXISTS
 * ---------------
 * Console is a static Next export (`output: "export"`), so by itself it can only
 * be hosted as files. Files cannot stream a YouTube Playable: a Playables build
 * lives on `<id>.playables.usercontent.goog` and answers with
 * `Content-Security-Policy: … frame-ancestors https://*.youtube.com …`, so the
 * browser refuses to frame it from our origin, and reading its HTML to strip that
 * header is a request the browser is not allowed to make (no CORS on the build
 * host). Something on a server has to fetch the build and hand it back under our
 * own origin — that is all this file does.
 *
 * There are now three interchangeable providers of the same contract, so the
 * console streams wherever it is deployed:
 *
 *   · `public/play.php`      — the cPanel/PHP host (ships inside the export);
 *   · this file              — `npm start` here, or any Node host;
 *   · the main app's route   — `server.ts` when the console is served from the
 *                              tutoring app at /tutorly-games/adult/console/.
 *
 * The client never has to be told which one is there: `src/lib/proxy.ts` asks the
 * path `<base>/play.php/__probe__` and uses whichever answers.
 *
 * ADDRESSING (identical to play.php and server.ts)
 *   GET <base>/play.php/<buildHost>/<path>   stream an asset (HTML is rewritten)
 *   GET <base>/play.php/__probe__            {"ok":true,…} handshake
 *   GET <base>/play.php?__probe__=1          the same, query-shaped (diagnostic)
 *   GET <base>/play.php?resolve=<id>         look up a Playable's build location
 *
 * Run: node server.mjs   (PORT=4173 by default)
 */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// A PORT of "0"/empty means "pick one" — treat that as "unset" so the default holds.
const PORT = Number(process.env.PORT) || 4173;

/** The sub-path the export is compiled for (see next.config.ts → BASE_PATH). */
const BASE = "/tutorly-games/adult/console";
const DIST = path.join(__dirname, "dist");
const PROXY_VERSION = 3;

const UPSTREAM_SUFFIX = ".playables.usercontent.goog";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

/** Types we can label ourselves — the build host is unreliable about Unity's. */
const MIME = {
  html: "text/html; charset=utf-8", htm: "text/html; charset=utf-8",
  js: "application/javascript; charset=utf-8", mjs: "application/javascript; charset=utf-8",
  css: "text/css; charset=utf-8", json: "application/json", wasm: "application/wasm",
  data: "application/octet-stream", unityweb: "application/octet-stream", mem: "application/octet-stream",
  symbols: "application/octet-stream", bin: "application/octet-stream", bundle: "application/octet-stream",
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", svg: "image/svg+xml",
  webp: "image/webp", ico: "image/x-icon", mp3: "audio/mpeg", ogg: "audio/ogg", wav: "audio/wav",
  mp4: "video/mp4", webm: "video/webm", ttf: "font/ttf", woff: "font/woff", woff2: "font/woff2",
  txt: "text/plain", xml: "application/xml",
};

/**
 * Headers safe to pass through. `content-encoding` is NOT here: Node's fetch
 * (undici) hands back a DECODED body while the response still says `gzip`, and
 * forwarding that label makes the browser fail with ERR_CONTENT_DECODING_FAILED —
 * a game that never boots. We ask upstream for `identity` for the same reason.
 * `etag`/`last-modified` are dropped too: our bodies are not byte-identical to the
 * host's, so their validators must never be replayed (a stored body from an older
 * proxy build would be revalidated forever and never replaced).
 */
const PASSTHROUGH = ["accept-ranges", "content-range", "vary"];

/** Build files only work as a set — never let a cache serve them half-stale. */
const COUPLED_EXT = new Set([
  "js", "mjs", "wasm", "data", "unityweb", "mem", "symbols", "bin", "bundle",
  "json", "css", "html", "htm",
]);
const cacheControl = (ext) => (COUPLED_EXT.has(ext) ? "no-store" : "public, max-age=86400");

const appBaseUrl = (req) => `${req.headers["x-forwarded-proto"] || "http"}://${req.headers.host}${BASE}`;
const isSafeHost = (host) => /^[a-z0-9-]{1,64}$/i.test(host);
const isSafePath = (p) =>
  !!p && !p.includes("\\") && !p.includes("\0") && p.split("/").every((s) => s !== "" && s !== "." && s !== "..");

/**
 * Headers that let the console *on another origin* use this proxy.
 *
 * The proxy normally sits next to the console, but the whole point of
 * `<base>/play.php` being a path is that the same contract can be hosted
 * elsewhere — a cPanel PHP host, a second Node box, a tunnel. A browser will not
 * let one origin read another's response without CORS, so without this the probe
 * fails with an opaque "network error" and the console reports that the proxy is
 * missing when in fact it is answering perfectly. `*` is right here: the proxy
 * serves public YouTube builds and holds no session of its own.
 */
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Range, Content-Type",
  "Access-Control-Max-Age": "86400",
};

function sendJson(res, status, payload) {
  const body = Buffer.from(JSON.stringify(payload), "utf8");
  res.writeHead(status, {
    ...CORS,
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "Content-Length": body.length,
  });
  res.end(body);
}

/**
 * A short, stable name for the build SET this HTML belongs to.
 *
 * A Unity build is one artifact split across four files (loader `.js`, framework
 * `.js`, `.wasm`, `.data`) that share a single function table. If a browser serves
 * one of them from an older copy, the first JS→wasm call through a stale table
 * index dies with `RuntimeError: null function or function signature mismatch`,
 * and C# delegate plumbing throws `Incompatible Delegate Types`. Sending
 * `no-store` stops NEW copies being stored, but it cannot evict one that was
 * cached under an older policy — so the console also stamps every build URL with
 * this token. A changed build means changed URLs, and no stale file can be mixed
 * into a fresh set again.
 *
 * The token comes from the HTML that names those files (with its per-response
 * nonces removed, so it is stable between requests) plus the host's validator.
 */
function buildToken(html, upstreamTag, fresh = "") {
  const stable = String(html).replace(/nonce="[^"]*"/gi, "").replace(/\s+/g, " ");
  // The proxy's own version is part of the token as well: if this side changes how
  // a build is served, every stamp changes with it and nothing is served "from
  // cache" that was stored by an older proxy.
  //
  // `fresh` is the console's own marker, sent when a tutor asks for a fresh copy
  // (the rig's hard reset). It is not a cache policy — it is the one lever a page
  // has over caches it may not clear: a value nothing has ever requested, which
  // makes every stamped URL new, so the build set is fetched instead of recalled.
  const seed = `${stable}|${upstreamTag || ""}|v${PROXY_VERSION}${fresh ? `|f${fresh}` : ""}`;
  let h = 5381;
  for (let i = 0; i < seed.length; i++) h = ((h * 33) ^ seed.charCodeAt(i)) >>> 0;
  return `${h.toString(36)}-${seed.length.toString(36)}`;
}

/**
 * The stamp that makes a build set cache-proof.
 *
 * It runs before the game's own script and appends `?bt=<token>` to every build
 * file the page asks for — through both `XMLHttpRequest` and `fetch`, because
 * Unity's loader uses one or the other depending on its version. The proxy drops
 * the parameter before talking to the build host, so it never reaches YouTube.
 */
/**
 * The script body, built once as plain text.
 *
 * Deliberately no regular expression: a `\.` written inside a template literal
 * loses its backslash, which shipped a frame that threw `SyntaxError: Invalid
 * regular expression` and silently did no stamping at all. A suffix list costs
 * nothing and cannot be mangled by the various layers of quoting between here and
 * the page.
 */
function buildStampScript(token) {
  const body = [
    "(function(){",
    `var T=${JSON.stringify(String(token))};`,
    // `.js` belongs in this list: the loader is a script the page creates for
    // itself, and a stale loader with a fresh wasm is the mismatch this whole
    // stamp exists to prevent.
    'var EXT=[".unityweb",".data",".wasm",".mem",".symbols",".bin",".bundle",".js"];',
    'function isBuild(u){if(typeof u!=="string"||!u)return false;if(u.indexOf("bt=")!==-1)return false;',
    "for(var i=0;i<EXT.length;i++){if(u.indexOf(EXT[i])!==-1)return true;}return false;}",
    'function stamp(u){return isBuild(u)?u+(u.indexOf("?")===-1?"?":"&")+"bt="+T:u;}',
    "function stampInput(i){try{if(typeof i===\"string\")return stamp(i);",
    'if(i&&typeof i.url==="string"&&isBuild(i.url))return new Request(stamp(i.url),i);}catch(e){}return i;}',
    "try{var o=XMLHttpRequest.prototype.open;XMLHttpRequest.prototype.open=function(m,u){",
    'try{if(typeof u==="string")arguments[1]=stamp(u);else if(u&&typeof u.href==="string")arguments[1]=stamp(u.href);',
    "}catch(e){}return o.apply(this,arguments);};}catch(e){}",
    "try{var f=window.fetch;if(f){window.fetch=function(i,n){return f.call(this,stampInput(i),n);};}}catch(e){}",
    "window.__tutorlyBuildToken=T;",
    "})();",
  ].join("");
  return `<script>${body}</script>`;
}

/**
 * Stamp the build's own file names in the page itself.
 *
 * The runtime patch below cannot reach a script the page creates for itself — and
 * Unity's loader does exactly that (`script.src = loaderUrl`). The loader is the
 * file that builds the wasm's function table and the import object, so a cached
 * loader next to a fresh wasm is the classic `RuntimeError: null function or
 * function signature mismatch`. Rewriting the names in the HTML closes that hole:
 * every file of the set — loader, framework, wasm, data, and the template's own
 * `.js` — is requested under a URL that only exists for this build.
 */
function stampBuildUrls(html, token) {
  if (!token) return html;
  return html.replace(
    /(["'])(?!https?:|\/\/|blob:|data:)([^"'\s<>]+\.(?:unityweb|data|wasm|mem|symbols|bin|bundle|js))(\?[^"']*)?(["'])/gi,
    (whole, q1, file, query, q2) => {
      if (query && query.includes("bt=")) return whole;
      return `${q1}${file}${query || ""}${query ? "&" : "?"}bt=${token}${q2}`;
    }
  );
}

/** Drop CSP meta tags, re-point root-absolute refs at the proxy, swap in our shim. */
function transformHtml(html, host, appBase, token) {
  const prefix = `${appBase}/play.php/${host}/`;
  let out = html.replace(/<meta[^>]+http-equiv=["']?Content-Security-Policy["']?[^>]*>/gi, "");
  out = out.replace(/(src|href|data-src|poster)=(["'])\/(?!\/|play\.php\/|ytgame-shim\.js)/gi, `$1=$2${prefix}`);
  out = out.replace(/url\((["']?)\/(?!\/|play\.php\/|ytgame-shim\.js)/gi, `url($1${prefix}`);
  out = out.replace(/(["'])https?:\/\/www\.youtube\.com\/game_api\/v\d+\/?\1/gi, `$1${appBase}/ytgame-shim.js$1`);
  if (!/ytgame-shim\.js/i.test(out)) {
    out = out.replace(/<head[^>]*>/i, (m) => `${m}\n<script src="${appBase}/ytgame-shim.js"></script>`);
  }
  // Before anything else in the page: stamp this build's asset URLs, both in the
  // names the page will use (above) and for anything built at runtime (below).
  if (token) out = out.replace(/<head[^>]*>/i, (m) => `${m}\n${buildStampScript(token)}`);
  return stampBuildUrls(out, token);
}

/** Read a Playable's build host off its public YouTube page (`?resolve=<id>`). */
async function resolvePlayable(rawId) {
  const urlMatch = String(rawId).match(/playables\/([A-Za-z0-9_-]{10,})/);
  const id = urlMatch ? urlMatch[1] : /^[A-Za-z0-9_-]{10,}$/.test(String(rawId).trim()) ? String(rawId).trim() : "";
  if (!id) return { status: 400, body: { error: "Give a Playables id or page URL." } };

  let html = "";
  try {
    const res = await fetch(`https://www.youtube.com/playables/${id}`, {
      headers: { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9", "Accept-Encoding": "identity" },
    });
    if (!res.ok) return { status: res.status, body: { error: `YouTube answered HTTP ${res.status} for that Playable.` } };
    html = await res.text();
  } catch (e) {
    return { status: 502, body: { error: `Could not reach YouTube: ${e.message}` } };
  }

  const raw = html.match(/"externalVideoUrl":"([^"]+)"/) || html.match(/"(https:\\?\/\\?\/[a-z0-9-]+\.playables\.usercontent\.goog[^"]*)"/i);
  if (!raw) {
    return {
      status: 404,
      body: { error: "Could not locate a game build on that Playables page. The game may be region-locked, removed, or require sign-in." },
    };
  }
  const launch = JSON.parse(`"${raw[1]}"`);
  const parsed = new URL(launch);
  const hostMatch = parsed.hostname.match(/^([a-z0-9-]+)\.playables\.usercontent\.goog$/i);
  const decode = (s) => s.replace(/\\u0026/g, "&").replace(/\\\//g, "/").replace(/&amp;/g, "&");
  return {
    status: 200,
    body: {
      id,
      title: decode((html.match(/<title>([^<]*)<\/title>/) || [])[1] || id).replace(/\s*-\s*YouTube\s*$/, "").trim() || id,
      launchUrl: launch,
      buildHost: hostMatch ? hostMatch[1] : parsed.hostname,
      entryPath: parsed.pathname.replace(/^\/+/, "") || "index.html",
      hash: parsed.hash || "",
      genre: decode((html.match(/"primaryGenre":"([^"]*)"/) || [])[1] || ""),
      developer: decode((html.match(/\{"label":"Developer","value":"((?:[^"\\]|\\.)*)"\}/) || [])[1] || ""),
      description: decode((html.match(/"miniAppGameInfoDialogViewModel":\{[^{}]*?"description":"((?:[^"\\]|\\.)*)"/) || [])[1] || ""),
      thumbnailUrl: decode((html.match(/"og:image"\s+content="([^"]+)"/) || html.match(/property="og:image" content="([^"]+)"/) || [])[1] || ""),
      direct: !hostMatch,
    },
  };
}

/**
 * An optional request trace, for the question that cannot be answered from the
 * outside: which exact URLs a game asked for, in what order.
 *
 * Set `TUTORLY_PROXY_LOG=<file>` and every proxied request is appended to it with
 * its query string (`…/BAQ7.data.unityweb?bt=15xkror-5fi`) plus the answer. A game
 * that reports `null function or function signature mismatch` is a game assembled
 * out of files from two different builds, and the only way to prove which request
 * came from where is to write them down.
 */
/**
 * The freshness marker on a game-page request, if there is one.
 *
 * Kept to a short opaque token: it ends up inside build URLs, so anything that
 * could confuse a URL is dropped rather than encoded and carried around.
 */
function freshFrom(req) {
  try {
    const raw = String(new URL(req.url || "", `http://${req.headers.host || "localhost"}`).searchParams.get("fresh") || "");
    return /^[A-Za-z0-9._-]{1,32}$/.test(raw) ? raw : "";
  } catch {
    return "";
  }
}

const REQUEST_LOG = process.env.TUTORLY_PROXY_LOG || "";
function trace(line) {
  if (!REQUEST_LOG) return;
  try {
    fs.appendFileSync(REQUEST_LOG, `${new Date().toISOString()} ${line}\n`);
  } catch {
    /* a trace is never worth failing a request over */
  }
}

/** Stream one build asset through our origin. */
async function proxyAsset(req, res, host, asset, appBase) {
  const ext = (asset.split(".").pop() || "").toLowerCase();
  const asked = String(req.url || "");
  trace(`GET ${asked.slice(-90)}`);
  const upstream = `https://${host}${UPSTREAM_SUFFIX}/${asset.split("/").map(encodeURIComponent).join("/")}`;

  const headers = { "User-Agent": UA, "Accept": "*/*", "Accept-Encoding": "identity" };
  if (req.headers.range) headers["Range"] = String(req.headers.range);

  let up;
  try {
    up = await fetch(upstream, { headers, redirect: "follow" });
  } catch (e) {
    return sendJson(res, 502, { error: `Upstream fetch failed: ${e.message}` });
  }
  if (!up.ok && up.status !== 206) {
    return sendJson(res, up.status, { error: `Upstream returned HTTP ${up.status}` });
  }

  const outHeaders = {
    ...CORS,
    "Content-Type": MIME[ext] || up.headers.get("content-type") || "application/octet-stream",
    "Cache-Control": cacheControl(ext),
    "Cross-Origin-Resource-Policy": "cross-origin",
  };
  for (const h of PASSTHROUGH) {
    const v = up.headers.get(h);
    if (v) outHeaders[h] = v;
  }

  const isHtml = outHeaders["Content-Type"].startsWith("text/html");
  if (isHtml) {
    const text = await up.text();
    const token = buildToken(text, up.headers.get("etag") || up.headers.get("last-modified") || "", freshFrom(req));
    const body = Buffer.from(transformHtml(text, host, appBase, token), "utf8");
    outHeaders["Content-Length"] = body.length;
    res.writeHead(200, outHeaders);
    return res.end(body);
  }

  res.writeHead(up.status === 206 ? 206 : 200, outHeaders);
  if (!up.body) return res.end();
  const reader = up.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    res.write(Buffer.from(value));
  }
  res.end();
}

/** Serve the static export (the console itself). */
function serveStatic(req, res, urlPath) {
  let rel = urlPath.slice(BASE.length);
  if (rel === "" || rel === "/") rel = "/index.html";
  if (rel.endsWith("/")) rel += "index.html";
  const clean = path.posix.normalize(rel).replace(/^\/+/, "");
  const file = path.join(DIST, clean);
  if (!file.startsWith(DIST)) {
    res.writeHead(403).end("Forbidden");
    return;
  }
  fs.stat(file, (err, stat) => {
    if (err || !stat.isFile()) {
      // Next's static export writes folder/index.html; anything else is a 404 page.
      const notFound = path.join(DIST, "404.html");
      if (fs.existsSync(notFound)) {
        res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
        return res.end(fs.readFileSync(notFound));
      }
      res.writeHead(404, { "Content-Type": "text/plain" });
      return res.end("Not found");
    }
    const ext = (clean.split(".").pop() || "").toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Content-Length": stat.size,
      "Cache-Control": ext === "html" ? "no-cache" : "public, max-age=3600",
    });
    fs.createReadStream(file).pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const pathname = decodeURIComponent(url.pathname);

  // A console on another origin asks permission before a ranged asset request.
  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS).end();
    return;
  }

  // ── the proxy ─────────────────────────────────────────────────────────────
  if (pathname === `${BASE}/play.php` || pathname.startsWith(`${BASE}/play.php/`)) {
    const appBase = appBaseUrl(req);
    const rest = pathname.slice(`${BASE}/play.php`.length);

    if (rest === "/__probe__" || url.searchParams.has("__probe__")) {
      return sendJson(res, 200, {
        ok: true,
        proxy: "node",
        version: PROXY_VERSION,
        node: process.version,
        mode: "node",
      });
    }
    if (url.searchParams.has("resolve")) {
      const out = await resolvePlayable(String(url.searchParams.get("resolve")));
      return sendJson(res, out.status, out.body);
    }

    // Legacy absolute form: ?u=https://<host>.…/path
    let host = "";
    let asset = "";
    if (rest === "" || rest === "/") {
      const target = String(url.searchParams.get("u") || "");
      try {
        const parts = new URL(target);
        host = parts.hostname.endsWith(UPSTREAM_SUFFIX) ? parts.hostname.slice(0, -UPSTREAM_SUFFIX.length) : "";
        asset = parts.pathname.replace(/^\/+/, "");
      } catch {
        /* fall through to the 400 below */
      }
    } else {
      const idx = rest.indexOf("/", 1);
      host = idx === -1 ? "" : rest.slice(1, idx);
      asset = idx === -1 ? "" : rest.slice(idx + 1);
    }

    if (!isSafeHost(host) || !isSafePath(asset)) return sendJson(res, 400, { error: "Invalid proxy target" });
    if (asset.split("/").pop() === "ytgame-shim.js") {
      res.writeHead(307, { Location: `${BASE}/ytgame-shim.js` });
      return res.end();
    }
    return proxyAsset(req, res, host, asset, appBase);
  }

  // Anything else is the console itself. `BASE/` is served directly rather than
  // redirected — a redirect here breaks simple preview/embedding clients, and the
  // export's own index.html is what the redirect would have pointed at anyway.
  if (pathname === "/") {
    res.writeHead(302, { Location: `${BASE}/` + url.search });
    return res.end();
  }
  if (!pathname.startsWith(BASE)) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    return res.end(`Not found. The console lives at ${BASE}/`);
  }
  return serveStatic(req, res, pathname);
});

server.listen(PORT, "0.0.0.0", () => {
  const bound = server.address();
  const port = bound && typeof bound === "object" ? bound.port : PORT;
  console.log(`Tutorly Console on http://localhost:${port}${BASE}/`);
  console.log(`Playables proxy: http://localhost:${port}${BASE}/play.php/__probe__`);
  if (!fs.existsSync(path.join(DIST, "index.html"))) {
    console.warn(`⚠  ${path.relative(process.cwd(), DIST)}/index.html is missing — run "npm run build" first.`);
  }
});
