// Bump this on every deployed build: `activate` deletes every other cache, which
// is what evicts the PREVIOUS build's content-hashed assets. Without a bump they
// linger forever in the browser's cache (each build brings new hashes, so nothing
// ever replaces the old ones).
const CACHE_NAME = 'tutorly-cspro-v2.0.1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/Tutomy_logo_192.png',
  '/Tutomy_logo_512.png',
  '/Tutor_Academy_logo_64.png',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Pre-cache non-fatal error:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // ── Never let the worker touch anything that decides who the user is or what
  //    they have paid for. ─────────────────────────────────────────────────
  // Cached auth responses caused stale "wrong password" errors and logins that
  // appeared to do nothing, and a cached tier mirror made a Premium/VIP grant
  // look like it never arrived. So: only same-origin GETs for static assets are
  // intercepted at all.
  const isApi = url.pathname.startsWith('/api/') || url.pathname.includes('/api/');
  const isPhp = url.pathname.endsWith('.php') || url.pathname.includes('auth.php');
  const isJson = url.pathname.endsWith('.json') && url.pathname !== '/manifest.json';
  const isDataMirror = /\/(data|learners)\/|tutors_db|site_content|_db\.json/i.test(url.pathname);
  const hasCacheBuster = url.search.includes('_t=');
  const isForeignOrigin = url.origin !== self.location.origin;
  const isAuthLike = /(login|register|signup|sign-in|verify|verification|resend|session|tier|status|premium|vip|account)/i.test(url.pathname);

  if (
    request.method !== 'GET' ||
    isForeignOrigin ||
    isApi ||
    isPhp ||
    isJson ||
    isDataMirror ||
    hasCacheBuster ||
    isAuthLike ||
    request.headers.has('authorization')
  ) {
    return;
  }

  // Stale-while-revalidate for static assets, network-first for documents/navigation
  // Documents are ALWAYS network-first, and the cached fallback is only used
  // when the device is genuinely offline (never to paper over a server error).
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request, { cache: 'no-store' }).catch(() =>
        caches.match('/index.html').then((cached) =>
          cached || new Response('Offline — reconnect to load Tutomy.', {
            status: 503,
            statusText: 'Offline',
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          })
        )
      )
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch in background to update cache
        fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseToCache);
              });
            }
          })
          .catch(() => {});
        return cachedResponse;
      }

      return fetch(request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'opaque') {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });

        return networkResponse;
      }).catch((fetchErr) => {
        console.warn('[SW] Fetch failed for:', request.url, fetchErr);
        // Fallback for document requests
        if (request.headers.get('accept')?.includes('text/html')) {
          return caches.match('/index.html');
        }
        return new Response('Offline resource unavailable', { status: 503, statusText: 'Offline' });
      });
    })
  );
});
