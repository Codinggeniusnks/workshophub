/**
 * WorkshopHub Service Worker
 * Enables offline caching, offline app launches, and PWA installation.
 */

const CACHE_NAME = 'workshophub-cache-v10';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './js/safe.js',
  './js/store.js',
  './js/parser.js',
  './js/ai.js',
  './js/driveSync.js',
  './js/organiser.js',
  './js/calendar.js',
  './js/ui.js',
  './js/app.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/favicon.png',
  './icons/icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('Failed to cache some assets during install:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== 'workshophub-shared-files') {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. NEVER intercept any external/cross-origin requests (e.g. Google Generative AI, Google Drive, CDNs)
  if (url.origin !== self.location.origin) {
    return;
  }

  // 2. Web Share Target Level 2: ONLY intercept POST for incoming share target image submissions
  if (event.request.method === 'POST') {
    const isShareTarget = (url.pathname.endsWith('/index.html') || url.pathname.endsWith('/') || url.searchParams.has('shared_image')) &&
      (event.request.headers.get('content-type') || '').includes('multipart/form-data');

    if (isShareTarget) {
      event.respondWith(
        (async () => {
          try {
            const formData = await event.request.formData();
            const file = formData.get('shared_file');
            if (file) {
              const cache = await caches.open('workshophub-shared-files');
              await cache.put('last-shared-image', new Response(file, {
                headers: { 'Content-Type': file.type || 'image/png' }
              }));
              return Response.redirect('./index.html?shared_image=1', 303);
            }
          } catch (e) {
            console.warn('Share target POST handling error:', e);
          }
          return Response.redirect('./index.html', 303);
        })()
      );
      return;
    }

    // Pass through any other same-origin POST requests without redirecting
    return;
  }

  // Navigation requests (HTML documents): NETWORK-FIRST with cache fallback
  // This guarantees smartphones and PWAs always get fresh UI updates immediately!
  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', clone));
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match('./index.html').then(res => res || caches.match('./'));
        })
    );
    return;
  }

  // App assets (JS, CSS, JSON): NETWORK-FIRST with cache fallback
  // Guarantees all devices (PC & Phone) immediately run fresh code updates without stale cache
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          if (event.request.mode === 'navigate' || event.request.destination === 'document') {
            return caches.match('./index.html').then((doc) => doc || caches.match('./'));
          }
          return null;
        });
      })
  );
});
