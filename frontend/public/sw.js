/* Eptomart VPB service worker — offline shell + static asset caching.
   Network-first everywhere: the cache is only ever a fallback for when the
   network is unavailable, never preferred over a fresh response. This avoids
   serving a stale JS bundle after a new deploy. */
const CACHE = 'vpbms-v4';
const PRECACHE = [
  '/login',
  '/manifest.json',
  '/eptomart-logo-transparent.png',
  '/icon-192.png',
  '/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const putInCache = (request, response) => {
  // Never cache non-OK responses (redirects, errors) — caching those causes
  // errors later and can poison the fallback path.
  if (!response || !response.ok) return;
  caches.open(CACHE).then((c) => c.put(request, response)).catch(() => {});
};

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Never cache API calls or cross-origin requests.
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api')) return;

  // Navigations: always try the network first so you get the latest deploy.
  // Only fall back to a cached page if the network is genuinely unreachable,
  // and always resolve to a real Response — never undefined.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          putInCache(request, res.clone());
          return res;
        })
        .catch(async () => {
          const cached = (await caches.match(request)) || (await caches.match('/login'));
          return cached || new Response('You appear to be offline.', {
            status: 503,
            statusText: 'Offline',
            headers: { 'Content-Type': 'text/plain' },
          });
        })
    );
    return;
  }

  // Static assets (Next chunks, images, fonts): network-first too, so a new
  // deploy's chunk hashes are always picked up immediately. Cache is only used
  // if the network request fails outright (offline).
  event.respondWith(
    fetch(request)
      .then((res) => {
        putInCache(request, res.clone());
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        return cached || Response.error();
      })
  );
});
