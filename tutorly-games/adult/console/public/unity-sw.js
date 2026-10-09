/*
 * Tutorly Consol – Local Unity build server (Service Worker)
 *
 * Two jobs, both of them "hand the Unity loader a file it can trust":
 *
 *   1. Files from an uploaded Unity WebGL build folder are stored in the Cache API
 *      under `/local-unity/<gameId>/…` and served from here, so the loader can fetch
 *      them like a real host.
 *
 *   2. A proxied YouTube Playable (`/play.php/<buildHost>/…`) is stored the same way
 *      once it has been downloaded. Without this, every single open of a game
 *      re-streams the whole build — a real title is 10–20 MB of `.wasm` and `.data`,
 *      so the second, third and tenth open of the same game cost exactly as much as
 *      the first one did.
 *
 * WHY CACHING THESE IS SAFE
 * -------------------------
 * A Unity build is a set of files that only work together (`RuntimeError: null
 * function or function signature mismatch` when they don't), which is why the proxy
 * is so careful: it stamps every build URL with a token derived from the build
 * itself (`…?bt=…`), and serves it `no-store`. The token is what makes a cache safe
 * here — it is not a cache-buster bolted on, it *is* the identity of the build. Two
 * different builds cannot share a cache entry, because they cannot share a URL.
 *
 * So the rules are:
 *
 *   · a stamped URL (`…?bt=…`) may be answered from the cache forever — the token
 *     guarantees the bytes;
 *   · the wrapper HTML may NOT: it is the document that *chooses* the token, so it
 *     is always asked for over the network, with the cached copy kept only as an
 *     offline fallback. A build YouTube has updated is therefore picked up on the
 *     next open, without ever mixing two builds in one set;
 *   · when that HTML comes back with a different token, this build's cache is
 *     flushed — untokenized parts of the build (`style.css`, the template's icons)
 *     would otherwise outlive the build they belong to;
 *   · `?fresh=…` (a tutor pressing hard reset) never touches the cache at all: it
 *     goes to the network, and it flushes the build's cache on the way past.
 *
 * The cache is per build host, so one game being updated never costs another game
 * its downloads.
 */
var CACHE_NAME = "tutorly-local-unity-v1";

/**
 * The proxy generation is part of the cache name: if the proxy starts serving
 * builds differently, every entry must be re-fetched rather than mixed with what
 * this version stored. Bump it with `PROXY_VERSION` in `public/play.php`.
 */
var PLAY_PREFIX = "/tutorly-playables-v3-";

self.addEventListener("install", function () {
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    (async function () {
      await self.clients.claim();
      // Caches from an older proxy generation can never be reused (an entry can only
      // be trusted by the generation that wrote it), so they go now rather than
      // sitting there looking like free storage that never gets used.
      if (!self.caches) return;
      var names = await caches.keys();
      await Promise.all(
        names
          .filter(function (name) {
            return name.indexOf("/tutorly-playables-v") !== -1 && name.indexOf(PLAY_PREFIX) !== 0;
          })
          .map(function (name) {
            return caches.delete(name);
          })
      );
    })()
  );
});

self.addEventListener("fetch", function (event) {
  var url = new URL(event.request.url);
  if (url.origin !== self.location.origin || event.request.method !== "GET") return;

  // `indexOf` rather than `startsWith("/local-unity/")`: the console is served from a
  // sub-path (`/tutorly-games/adult/console/`), so the segment is never at position 0.
  // The worker's scope already limits which requests reach here.
  if (url.pathname.indexOf("/local-unity/") !== -1) {
    event.respondWith(serveLocalBuild(url));
    return;
  }

  if (url.pathname.indexOf("/play.php/") !== -1 && !isControlRequest(url)) {
    event.respondWith(serveProxiedBuild(event.request, url));
  }
});

/* ── Uploaded builds: `/local-unity/<gameId>/…` ─────────────────────────────── */

function serveLocalBuild(url) {
  return caches.open(CACHE_NAME).then(function (cache) {
    return cache.match(url.pathname, { ignoreSearch: true }).then(function (hit) {
      if (hit) return hit;
      // Fallback: a directory request -> index.html
      if (url.pathname.endsWith("/")) {
        return cache.match(url.pathname + "index.html").then(function (idx) {
          return idx || notFound(url.pathname);
        });
      }
      return notFound(url.pathname);
    });
  });
}

function notFound(path) {
  return new Response(
    "Tutorly Consol: file not found in the local Unity package: " + path +
      "\nRe-upload the build folder (the one containing index.html, Build/ and TemplateData/).",
    { status: 404, headers: { "content-type": "text/plain" } }
  );
}

/* ── Proxied builds: `/play.php/<buildHost>/…` ──────────────────────────────── */

/** The handshake, a lookup, and the app's own shim are never build files. */
function isControlRequest(url) {
  if (/\/__probe__$/.test(url.pathname)) return true;
  if (/\/ytgame-shim\.js$/.test(url.pathname)) return true;
  if (url.searchParams.has("resolve") || url.searchParams.has("stats")) return true;
  return /\/play\.php\/?$/.test(url.pathname);
}

function isHtml(url) {
  return /\.html?$/i.test(url.pathname);
}

/** `/play.php/<buildHost>/<path>` -> `<buildHost>`, the cache this build lives in. */
function buildHostOf(url) {
  var rest = url.pathname.slice(url.pathname.indexOf("/play.php/") + "/play.php/".length);
  var slash = rest.indexOf("/");
  return slash === -1 ? rest : rest.slice(0, slash);
}

function buildCacheName(url) {
  return PLAY_PREFIX + buildHostOf(url);
}

/** The build token inside a response body, for telling one build from the next. */
function tokenIn(html) {
  var m = /[?&]bt=([A-Za-z0-9]+)/.exec(html || "");
  return m ? m[1] : "";
}

function serveProxiedBuild(request, url) {
  var fresh = url.searchParams.has("fresh");
  var cacheName = buildCacheName(url);

  // A reset means "a copy I have never run before": straight to the network, and the
  // build that was cached is dropped on the way past, so it cannot be handed back.
  if (fresh) {
    return fetch(request).then(function (res) {
      if (!res.ok) return res;
      // Drop the build *before* storing anything, and in that order deliberately: a
      // store that raced the delete would be wiped by it a moment later, leaving the
      // next open with no copy at all.
      return caches
        .delete(cacheName)
        .catch(function () {})
        .then(function () {
          // The worker may be the only thing holding the document; keep it for offline.
          if (isHtml(url)) return remember(caches.open(cacheName), request, res.clone());
          return res;
        });
    });
  }

  return caches.open(cacheName).then(function (cache) {
    if (!isHtml(url)) {
      return cache.match(request).then(function (hit) {
        if (hit) return hit;
        return fetch(request).then(function (res) {
          return remember(Promise.resolve(cache), request, res).then(function () {
            return res;
          });
        });
      });
    }

    // The wrapper document decides which build the rest of the set will be, so it is
    // always revalidated. The cached copy is a fallback, not an answer.
    return cache.match(request).then(function (stored) {
      return fetch(request)
        .then(function (res) {
          if (!res.ok) return stored || res;
          return res
            .clone()
            .text()
            .then(function (html) {
              var next = tokenIn(html);
              return stored
                ? stored.text().then(function (old) {
                    return { changed: tokenIn(old) !== "" && tokenIn(old) !== next };
                  })
                : { changed: false };
            })
            .then(function (state) {
              if (!state.changed) return remember(Promise.resolve(cache), request, res.clone());
              // A different build: the old one's untokened files must not be left behind.
              return caches.delete(cacheName).then(function () {
                return caches.open(cacheName).then(function (fresh2) {
                  return remember(Promise.resolve(fresh2), request, res.clone());
                });
              });
            })
            .then(function () {
              return res;
            });
        })
        .catch(function () {
          return (
            stored ||
            new Response(
              "Tutorly Consol: this game's build could not be reached and no copy of it is stored in this browser.",
              { status: 504, headers: { "content-type": "text/plain" } }
            )
          );
        });
    });
  });
}

/**
 * Store a response, when it is a whole one.
 *
 * A `206` cannot be put in the Cache API at all, and storing a partial body under a
 * whole-file URL is how a game ends up with half a `.wasm`.
 */
function remember(cachePromise, request, res) {
  if (!res || res.status !== 200 || res.type === "opaque") return Promise.resolve(res);
  var copy = res.clone();
  return cachePromise
    .then(function (cache) {
      return cache.put(request, copy);
    })
    .catch(function () {
      /* storage full or evicted mid-write: the network copy is still the answer */
    })
    .then(function () {
      return res;
    });
}
