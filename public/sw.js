/* Bible Study Coach service worker.
 *
 * Strategies:
 *  - /api/*                → network-first (fresh when online, cached fallback offline)
 *  - /_next/static, images → cache-first (content-hashed / immutable)
 *  - /data, /packs, /plans → stale-while-revalidate (instant offline, refreshes in background)
 *  - page navigations      → network-first, falling back to the cached shell
 */

const CACHE_NAME = 'btc-v8';
const PRECACHE_URLS = [
  '/',
  '/play',
  '/read',
  '/levels',
  '/settings',
  '/manifest.webmanifest',
  '/bsc2.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    /\.(png|jpg|jpeg|gif|svg|ico|webp|woff2?)$/.test(url.pathname)
  );
}

function isDataFile(url) {
  return (
    url.pathname.startsWith('/data/') ||
    url.pathname.startsWith('/packs/') ||
    url.pathname.startsWith('/plans/') ||
    url.pathname.startsWith('/daily_quizzes_')
  );
}

async function networkFirst(request, fallbackUrls = []) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    for (const fallbackUrl of fallbackUrls) {
      const fallback = await cache.match(fallbackUrl);
      if (fallback) return fallback;
    }
    return Response.error();
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const refresh = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached || refresh;
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (isDataFile(url)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (request.mode === 'navigate') {
    // Offline fallback chain for deep links: the section's precached shell,
    // then the cached home page as a last resort for never-visited pages.
    const p = url.pathname;
    let section = '/play';
    if (p.startsWith('/read')) section = '/read';
    else if (p.startsWith('/levels')) section = '/levels';
    else if (p.startsWith('/settings')) section = '/settings';
    event.respondWith(networkFirst(request, [section, '/']));
    return;
  }
});
