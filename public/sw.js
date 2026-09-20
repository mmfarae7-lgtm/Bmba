const CACHE = 'bomba-v2';
const APP_SHELL = ['/', '/onboarding', '/manifest.json', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first for API + pages, cache-first for static assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET') return;

  // APIs always hit network
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(event.request).then((res) => {
      const clone = res.clone();
      caches.open(CACHE).then((cache) => cache.put(event.request, clone));
      return res;
    }).catch(() => caches.match(event.request)));
    return;
  }

  // Pages: network-first with cache fallback (offline support)
  if (url.origin === self.location.origin && url.pathname !== '/manifest.json') {
    event.respondWith(
      fetch(event.request).then((res) => {
        const clone = res.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, clone));
        return res;
      }).catch(() => caches.match(event.request).then((cached) => cached || caches.match('/')))
    );
    return;
  }

  // Static assets: cache-first
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((res) => {
        const clone = res.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, clone));
        return res;
      });
    })
  );
});