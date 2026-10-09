/**
 * Make a built app independent of the URL it is served from.
 *
 * WHY THIS EXISTS
 * ---------------
 * A Vite build takes its asset prefix from `base`. Built with
 * `base: "/tutorly-transcriber-2-v1/"` — which is what happened to the
 * Transcriber — every asset URL is welded to that one address:
 *
 *     <script src="/tutorly-transcriber-2-v1/assets/index-CogcqMP5.js">
 *     new URL("/tutorly-transcriber-2-v1/assets/ai.worker-….js", import.meta.url)
 *
 * That is fine until the folder moves, and then the page itself still loads
 * while every asset 404s (and the SPA catch-all answers with `index.html`, so
 * the console blames the MIME type rather than the path). The Transcriber moved
 * from `/tutorly-transcriber-2-v1/` to `/tutorly-widgets/tutorly-transcriber-2-v1/`,
 * which is exactly how that failed.
 *
 * The durable fix is `base: './'` in the app's `vite.config.ts`. This script is
 * for the apps that have no source in the repo — only a finished build that
 * arrives in a zip and is dropped straight into a widget folder. It rewrites
 * the baked-in prefix in the build to a RELATIVE one, so the same files work at
 * any depth, on any host, under any prefix:
 *
 *     node scripts/relativize-app.mjs tutorly-widgets/x/prebuilt x
 *
 * The collector also runs it on every copy it publishes (see the `relativize`
 * option in `collect-standalone-apps.mjs`), so dropping in a fresh, absolute
 * build is safe: `npm run build` normalizes it and this app can never ship
 * broken again by being rebuilt from that zip.
 *
 * WHAT IT CHANGES
 * ---------------
 * Only the app's OWN prefix. A reference to `/<appName>/<rest>` becomes a
 * relative path, chosen per the base the browser resolves it against:
 *
 *   · `new URL("/<app>/<rest>", import.meta.url)` — resolved against the MODULE,
 *     so it is made relative to the file's own directory. In a bundle that lives
 *     in `assets/`, `/app/assets/x.js` therefore becomes `./x.js` (a sibling),
 *     which is precisely what Vite emits for `base: './'`.
 *   · everything else (HTML attributes, CSS `url()`, the `__vitePreload` base,
 *     `fetch()` paths) — resolved against the DOCUMENT, so it becomes `./<rest>`.
 *
 * Deliberately NOT touched: any other absolute path. A site-root `/api/…` call
 * addresses the whole site, not this app, and rewriting it would break it.
 *
 * STALE SERVICE WORKERS
 * ---------------------
 * A PWA built at an old address leaves a service worker registered at the OLD
 * scope. That worker keeps serving its cached `index.html` from the dead URL, so
 * the visitor sees the broken page even after the fix is deployed. When a
 * registration file is rewritten, the old scope is read out of it and a small
 * retirement snippet is appended, unregistering that scope and nothing else.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Extensions worth reading as text. Binaries (wasm, png, …) are skipped. */
const TEXT_EXT = new Set([
  ".html",
  ".htm",
  ".js",
  ".mjs",
  ".cjs",
  ".css",
  ".json",
  ".webmanifest",
  ".svg",
  ".txt",
  ".xml",
]);

/**
 * Fences around the retirement block appended below. That block quotes the app's OLD
 * absolute address on purpose, so it has to survive a second run: without the fence,
 * the rewriter rewrites its own record of the old scope into "./" and the retirement
 * silently stops matching anything.
 */
const KEEP_START = "/* relativize:keep:start */";
const KEEP_END = "/* relativize:keep:end */";

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Relative specifier from `fromDir` ("" = app root) to `target`, both posix. */
function specifier(fromDir, target) {
  const rel = path.posix.relative(fromDir, target);
  return rel.startsWith(".") ? rel : `./${rel}`;
}

/**
 * A service-worker scope is a URL path. Git Bash on Windows silently rewrites an
 * argument like `/tutorly-transcriber-2-v1/` into `C:/Program Files/Git/tutorly-transcriber-2-v1/`,
 * which can never match a real scope — so recover the tail rather than writing a
 * retirement rule that silently does nothing. Anything else is dropped out loud.
 */
function normalizeScope(raw, appName) {
  const s = String(raw).trim();
  if (/^\/[^:]/.test(s)) return s.endsWith("/") ? s : `${s}/`;
  const recoverable = new RegExp(`\/${escapeRe(appName)}\/?$`);
  return recoverable.test(s) ? `/${appName}/` : null;
}

function walk(dir, prefix = "") {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...walk(path.join(dir, entry.name), rel));
    else out.push(rel);
  }
  return out;
}

/**
 * @param {string} dir      the built app folder (contains index.html)
 * @param {object} opts
 * @param {string} opts.appName      the prefix baked in, e.g. "tutorly-transcriber-2-v1"
 * @param {string[]} [opts.extraScopes]  extra old service-worker scopes to retire
 * @param {(msg: string) => void} [opts.log]
 * @returns {{changed: string[], scopes: string[], absoluteLeft: string[]}}
 */
export function relativizeApp(dir, { appName, extraScopes = [], log = () => {} }) {
  const abs = `/${appName}/`;
  const absBare = `/${appName}`;
  const changed = [];
  const scopes = new Set();
  const absoluteLeft = [];
  const addScope = (raw) => {
    const scope = normalizeScope(raw, appName);
    if (scope) scopes.add(scope);
    else log(`ignoring unparseable service-worker scope ${JSON.stringify(String(raw))}`);
  };
  for (const scope of extraScopes) addScope(scope);

  for (const rel of walk(dir)) {
    if (!TEXT_EXT.has(path.posix.extname(rel).toLowerCase())) continue;

    const full = path.join(dir, rel);
    const before = fs.readFileSync(full, "utf8");
    if (!before.includes(abs) && !before.includes(absBare)) continue;

    const fileDir = path.posix.dirname(rel); // "." for the app root
    const moduleRule = new RegExp(
      `new URL\\((["'])\\${escapeRe(abs)}([^"']*)\\1\\s*,\\s*import\\.meta\\.url\\s*\\)`,
      "g",
    );
    let fenced = false;
    let leftover = false;

    /**
     * Rewritten LINE BY LINE so the fenced retirement block can be skipped whole.
     * Every pattern here (an attribute, a `new URL(...)`, a scope) is on one line, so
     * nothing is lost by not seeing the file as a single string.
     */
    const text = before
      .split("\n")
      .map((line) => {
        if (line.includes(KEEP_START)) fenced = true;
        const inFence = fenced;
        if (line.includes(KEEP_END)) fenced = false;
        if (inFence) return line;

        // 1. Module-relative: new URL("/app/<rest>", import.meta.url) → a SIBLING.
        //    Not "./assets/…": against the module's own URL that resolves to
        //    assets/assets/… . `./x.js` in assets/ is exactly what Vite emits for
        //    `base: './'`.
        let out = line.replace(
          moduleRule,
          (_m, quote, rest) => `new URL(${quote}${specifier(fileDir, rest)}${quote}, import.meta.url)`,
        );

        // 2. Read the OLD scope out before it is rewritten away.
        if (out.includes("serviceWorker") && out.includes("register")) {
          for (const m of out.matchAll(/scope\s*:\s*["'](\/[^"']*\/)["']/g)) addScope(m[1]);
        }

        // 3. Everything else resolves against the document base — the app root.
        out = out.split(abs).join("./");

        // A bare "/app" (no trailing slash) is the folder itself, so only a file at
        // the root may name it; anything deeper is reported rather than guessed at.
        if (out.includes(absBare)) {
          if (fileDir === ".") out = out.split(absBare).join("./");
          else absoluteLeft.push(`${rel} (bare ${absBare})`);
        }

        if (out.includes(abs)) leftover = true;
        return out;
      })
      .join("\n");

    if (leftover) absoluteLeft.push(rel);

    if (text !== before) {
      fs.writeFileSync(full, text);
      changed.push(rel);
    }
  }

  // Retire the old scopes, but never the one this copy now registers at.
  const stale = [...scopes].filter((s) => s !== `/${appName}/`);
  if (stale.length) {
    for (const rel of walk(dir)) {
      if (!TEXT_EXT.has(path.posix.extname(rel).toLowerCase())) continue;
      if (!/(^|\/)(registerSW|sw-register|register-sw)\.[cm]?js$/i.test(rel)) continue;
      const full = path.join(dir, rel);
      const text = fs.readFileSync(full, "utf8");
      if (text.includes(KEEP_START)) continue;
      fs.appendFileSync(
        full,
        `\n${KEEP_START}\n` +
          `/* retire stale scope — this app used to be served from ${stale.join(", ")} and a service\n` +
          `   worker left registered there keeps serving the old, broken page from a dead URL. */\n` +
          `(function(){if(!("serviceWorker" in navigator))return;var stale=${JSON.stringify(stale)};` +
          `var here=new URL("./",location.href).pathname;navigator.serviceWorker.getRegistrations()` +
          `.then(function(rs){for(var i=0;i<rs.length;i++){var s=new URL(rs[i].scope).pathname;` +
          `if(s!==here&&stale.indexOf(s)>-1)rs[i].unregister()}}).catch(function(){})})();\n` +
          `${KEEP_END}\n`,
      );
      changed.push(rel);
    }
  }

  for (const rel of changed) log(`relativized ${rel}`);
  for (const s of stale) log(`retires the old service-worker scope ${s}`);
  for (const rel of absoluteLeft) log(`WARNING still absolute: ${rel}`);

  return { changed, scopes: stale, absoluteLeft };
}

/**
 * Take oversized files OUT of a generated service worker's precache list.
 *
 * Workbox precaching is all-or-nothing: `install` fetches every entry listed in the
 * manifest, and if ONE of them cannot be stored the install fails, the registration
 * is discarded, and the app gets no service worker at all — offline support, update
 * handling, all of it. Nothing is logged on the page either, so it just silently
 * never works.
 *
 * The Transcriber ships a 21 MB `ort-wasm-simd-threaded.jsep.wasm` and listed it for
 * precache. Measured in the browser: the Cache API refuses that response
 * (`cache.put` → NetworkError) while a 56 kB stylesheet stores fine, so the SW went
 * `installing → redundant` every single load. Removing that one entry makes the same
 * worker activate.
 *
 * It costs almost nothing to drop: the model is fetched on demand when transcription
 * starts (it is 200 OK either way), and transformers.js keeps its own cache for the
 * models it downloads. What is bought back is a service worker that installs.
 *
 * @returns {string[]} the entries removed, as `url (size)` — for the build log.
 */
export function trimServiceWorkerPrecache(dir, { maxBytes, log = () => {} }) {
  const dropped = [];
  for (const rel of walk(dir)) {
    if (!/\.(js|mjs)$/.test(rel)) continue;
    const full = path.join(dir, rel);
    const text = fs.readFileSync(full, "utf8");
    if (!text.includes("precacheAndRoute")) continue;

    const next = text.replace(/\{url:"([^"]+)",revision:(?:null|"[^"]*"),?\},?/g, (entry, url) => {
      const file = path.join(dir, url);
      if (!fs.existsSync(file)) return entry; // not ours to reason about
      const size = fs.statSync(file).size;
      if (size <= maxBytes) return entry;
      dropped.push(`${url} (${(size / 1048576).toFixed(1)} MB)`);
      return "";
    });

    if (next !== text) {
      fs.writeFileSync(full, next);
      for (const entry of dropped) log(`removed oversized precache entry ${entry}`);
    }
  }
  return dropped;
}

/**
 * Second opinion for the shape `relativizeApp` cannot repair: a build made with
 * `base: "/"`, whose refs are `/assets/…` with the app's name nowhere in them.
 * Such a build looks fine on disk and 404s the moment it is nested, so it is
 * worth saying out loud rather than shipping it.
 */
export function findRootAbsoluteRefs(dir, log = () => {}) {
  const found = [];
  for (const rel of ["index.html", "registerSW.js", "manifest.webmanifest"]) {
    const full = path.join(dir, rel);
    if (!fs.existsSync(full)) continue;
    for (const m of fs.readFileSync(full, "utf8").matchAll(/(?:src|href)=["'](\/[^"']*)["']/g)) {
      found.push(`${rel} → ${m[1]}`);
    }
  }
  for (const rel of found) log(`WARNING root-absolute reference: ${rel}`);
  return found;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const maxFlag = argv.find((a) => a.startsWith("--sw-precache-max-mb="));
  const [dir, appName, ...scopes] = argv.filter((a) => !a.startsWith("--"));
  if (!dir || !appName) {
    console.error(
      "usage: node scripts/relativize-app.mjs <built-app-folder> <appName> [oldScope …]" +
        " [--sw-precache-max-mb=8]",
    );
    process.exit(1);
  }
  const result = relativizeApp(path.resolve(dir), {
    appName,
    extraScopes: scopes,
    log: (m) => console.log(`[relativize] ${m}`),
  });
  if (maxFlag) {
    trimServiceWorkerPrecache(path.resolve(dir), {
      maxBytes: Number(maxFlag.split("=")[1]) * 1048576,
      log: (m) => console.log(`[relativize] ${m}`),
    });
  }
  findRootAbsoluteRefs(path.resolve(dir), (m) => console.log(`[relativize] ${m}`));
  console.log(
    `[relativize] ${result.changed.length} file(s) rewritten in ${dir}` +
      (result.scopes.length ? `, retiring ${result.scopes.join(", ")}` : ""),
  );
  if (result.absoluteLeft.length) {
    console.error("[relativize] FAILED — absolute references it could not rewrite are listed above.");
    process.exit(1);
  }
}
