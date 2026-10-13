const CACHE = 'campushub-static-v2';
const PRECACHE = ['/', '/index.html', '/offline.html', '/css/styles.css', '/js/api.js', '/js/app.js', '/manifest.json', '/icons/icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET') return;
  if (url.pathname.startsWith('/api')) return;
  if (request.headers.get('authorization')) return;
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((res) => {
          if (res.ok && (url.origin === location.origin)) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
          }
          return res;
        })
        .catch(() => cached || caches.match('/offline.html'));
      return cached || fetchPromise;
    })
  );
});
