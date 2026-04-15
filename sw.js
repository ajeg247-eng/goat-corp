const CACHE_NAME = 'procreator-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap',
  'https://unpkg.com/@phosphor-icons/web',
  'https://html2canvas.hertzen.com/dist/html2canvas.min.js',
  'https://assets.mixkit.co/sfx/preview/mixkit-modern-technology-select-3124.mp3',
  'https://assets.mixkit.co/sfx/preview/mixkit-alarm-digital-clock-beep-989.mp3'
];

// === INSTALL ===
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Caché abierto:', CACHE_NAME);
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.warn('[SW] Error cacheando algunos assets:', err);
      });
    })
  );
  self.skipWaiting();
});

// === ACTIVATE ===
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => {
          console.log('[SW] Eliminando caché viejo:', key);
          return caches.delete(key);
        })
      );
    })
  );
  self.clients.claim();
});

// === FETCH (Offline First) ===
self.addEventListener('fetch', event => {
  // No cachear solicitudes que no sean GET
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      // Si está en caché, devolverlo
      if (cached) {
        console.log('[SW] Sirviendo desde caché:', event.request.url);
        return cached;
      }

      // Si no, ir a red y cachear
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200) return response;

        // Solo cachear respuestas HTTP/HTTPS del mismo origen o de CDNs conocidos
        const url = new URL(event.request.url);
        const allowedOrigins = ['fonts.googleapis.com', 'unpkg.com', 'html2canvas.hertzen.com', 'assets.mixkit.co'];
        if (url.origin === self.location.origin || allowedOrigins.includes(url.hostname)) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }

        return response;
      }).catch(() => {
        // Si falla todo, devolver página offline
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
      });
    })
  );
});

// === BACKGROUND SYNC (para cuando recupere conexión) ===
self.addEventListener('sync', event => {
  if (event.tag === 'sync-data') {
    console.log('[SW] Background sync activado');
  }
});

// === PUSH NOTIFICATIONS (preparado para futuro) ===
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : { title: 'ProCreator', body: 'Nueva notificación' };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: './logo.png',
      badge: './logo.png'
    })
  );
});