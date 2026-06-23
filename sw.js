const CACHE_NAME = 'controlbanquete-cache-v2';
const ASSETS = [
  './',
  './index.html',
  './login.html',
  './css/styles.css?v=2026_v2',
  './js/app.js?v=2026_v2',
  './js/auth.js?v=2026_v2',
  './js/config.js?v=2026_v2',
  './js/db.js?v=2026_v2',
  './js/seed.js?v=2026_v2',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable.png'
];

// Instalar y almacenar en caché recursos estáticos
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[Service Worker] Almacenando recursos estáticos en caché...');
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activar y purgar cachés antiguas
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Eliminando caché antigua...', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Interceptar peticiones y servir desde caché si está fuera de línea
self.addEventListener('fetch', event => {
  // Ignorar peticiones de la API del servidor, Firebase, APIs externas y peticiones no-GET
  if (event.request.method !== 'GET' || 
      event.request.url.includes('/api/') ||
      event.request.url.includes('firestore.googleapis.com') ||
      event.request.url.includes('firebaseio') ||
      event.request.url.includes('firebase') ||
      event.request.url.includes('googleapis') ||
      event.request.url.includes('chrome-extension')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        // En segundo plano, refrescar la caché si hay conexión (Stale-While-Revalidate)
        fetch(event.request).then(networkResponse => {
          if (networkResponse.status === 200) {
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, networkResponse));
          }
        }).catch(() => {/* Silenciar errores de red fuera de línea */});
        
        return cachedResponse;
      }

      // Si no está en caché, traer de la red
      return fetch(event.request).then(networkResponse => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        
        // Cachear nuevo recurso estático local encontrado
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });
        
        return networkResponse;
      }).catch(err => {
        console.log('[Service Worker] Error al recuperar recurso offline:', err);
      });
    })
  );
});
