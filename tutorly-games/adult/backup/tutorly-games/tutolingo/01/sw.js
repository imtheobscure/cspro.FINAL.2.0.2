/*
 * Tutolingo service worker — offline-first.
 *
 * The whole course is static, so the worker pre-caches the app shell for every
 * route at install time (each route's HTML plus the hashed chunks it loads), and
 * then serves navigations cache-first with a background refresh. Lesson content
 * is network-first while online so a freshly generated pack shows up right away,
 * and falls back to the cached copy on a plane.
 *
 * Deployed next to the app (e.g. /tutolingo/sw.js), so the scope is derived from
 * this file's own URL instead of being hard-coded. A hard-coded prefix meant that
 * if the app was ever served from a differently named folder the worker silently
 * cached nothing — and, worse, its navigation strategy could report
 * "Failed to fetch" for a page that was actually fine.
 */
const BASE = new URL("./", self.location).pathname;
const VERSION = "tutolingo-v2";
const SHELL = `${VERSION}-shell`;

const ROUTES = [
  "",
  "lesson/",
  "references/",
  "words/",
  "grammar/",
  "conversation/",
  "idioms/",
  "practice/",
  "mistakes/",
  "leaderboard/",
  "profile/",
  "prompt/",
  "check/",
  "404/",
];

const EXTRAS = [
  "manifest.webmanifest",
  "icon-192.png",
  "icon-512.png",
  "icon-maskable-512.png",
  "apple-touch-icon.png",
  "content/tutolingo-content.json",
  "content/tutolingo-content.mock.json",
];

const ASSET_RE = /\.(?:js|css|png|jpe?g|gif|svg|webp|ico|woff2?|txt|webmanifest)$/i;

/**
 * Write to the cache without ever letting the write reject.
 *
 * `Cache.put()` throws a NetworkError for aborted/opaque/partial responses and a
 * QuotaExceededError when the origin is full. Both are non-fatal for the app, but
 * an un-awaited rejection surfaces in the console as
 * "Uncaught (in promise) NetworkError: Failed to execute 'put' on 'Cache'".
 */
const safePut = async (cache, key, response) => {
  try {
    if (!response || response.status === 0) return; // opaque/cross-origin error page
    await cache.put(key, response.clone());
  } catch {
    /* never let caching break the page */
  }
};

const putIfOk = async (cache, url) => {
  try {
    const res = await fetch(url, { cache: "reload" });
    if (res && res.ok) await safePut(cache, url, res);
    return res;
  } catch {
    return null;
  }
};

/** Cache every route's HTML, then every hashed asset those pages reference. */
const prewarm = async (cache) => {
  const assets = new Set();
  for (const route of ROUTES) {
    const res = await putIfOk(cache, BASE + route);
    if (!res) continue;
    try {
      const html = await res.text();
      const re = /(?:src|href)="([^"]+)"/g;
      let m;
      while ((m = re.exec(html)) !== null) {
        const url = m[1];
        // Reuse the shared asset matcher so this scan and the fetch handler never drift.
        if (url.startsWith(BASE) && ASSET_RE.test(url)) assets.add(url);
      }
    } catch {
      /* non-HTML route output — nothing to scan */
    }
  }
  EXTRAS.forEach((p) => assets.add(BASE + p));
  const list = [...assets];
  for (let i = 0; i < list.length; i += 8) {
    await Promise.all(list.slice(i, i + 8).map((url) => putIfOk(cache, url)));
  }
};

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL);
      await prewarm(cache);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k.startsWith("tutolingo-") && k !== SHELL).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
  if (event.data === "CLEAR_OFFLINE_CACHE") {
    event.waitUntil(caches.delete(SHELL));
  }
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // CDN media/audio go straight out
  if (!url.pathname.startsWith(BASE)) return;
  if (url.pathname.startsWith(`${BASE}api/`)) return; // voice proxy is always live

  // The content pack: network first, so editing the JSON shows up immediately.
  if (url.pathname.includes("/content/")) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(SHELL);
        try {
          const res = await fetch(req);
          if (res && res.ok) await safePut(cache, req, res);
          return res;
        } catch {
          const cached = await cache.match(req, { ignoreSearch: true });
          return cached || Response.error();
        }
      })(),
    );
    return;
  }

  // Navigations: instant from cache when we have it, refreshed in the background.
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(SHELL);
        const cached =
          (await cache.match(req, { ignoreSearch: true })) || (await cache.match(BASE));
        const network = fetch(req)
          .then(async (res) => {
            if (res && res.ok) await safePut(cache, req, res);
            return res;
          })
          .catch(() => null);
        if (cached) {
          event.waitUntil(network);
          return cached;
        }
        return (await network) || Response.error();
      })(),
    );
    return;
  }

  if (!ASSET_RE.test(url.pathname)) return;

  // Hashed assets: cache-first (they never change), revalidate in the background.
  event.respondWith(
    (async () => {
      const cache = await caches.open(SHELL);
      const cached = await cache.match(req, { ignoreSearch: true });
      if (cached) {
        event.waitUntil(
          fetch(req)
            .then((res) => (res && res.ok ? safePut(cache, req, res) : undefined))
            .catch(() => undefined),
        );
        return cached;
      }
      try {
        const res = await fetch(req);
        if (res && res.ok) await safePut(cache, req, res);
        return res;
      } catch {
        return Response.error();
      }
    })(),
  );
});
