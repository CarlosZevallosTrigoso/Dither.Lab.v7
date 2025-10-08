/**
 * ============================================================================
 * DitherLab v7 - Service Worker
 * ============================================================================
 * - Se ejecuta en segundo plano para gestionar el caché y las peticiones de red.
 * - Permite que la aplicación funcione offline sirviendo los archivos cacheados.
 * - Gestiona la limpieza de cachés antiguas para mantener la app actualizada.
 * ============================================================================
 */

const CACHE_NAME = 'ditherlab-v7-cache-20251008'; // Versión actualizada

// ✅ SEPARADO: URLs locales y de terceros
const localUrlsToCache = [
  './',
  './index.html',
  './css/styles.css',
  './manifest.json',
  './js/app/main.js',
  './js/app/pwa.js',
  './js/app/events.js',
  './js/app/state.js',
  './js/core/renderer.js',
  './js/core/algorithms.js',
  './js/core/constants.js',
  './js/core/metrics.js',
  './js/modules/ui.js',
  './js/modules/curvesEditor.js',
  './js/modules/fileHandler.js',
  './js/modules/timeline.js',
  './js/modules/presets.js',
  './js/modules/keyboard.js',
  './js/modules/exporter.js',
  './js/utils/helpers.js',
  './js/utils/optimizations.js',
  './js/gif.worker.js',
];

const cdnUrlsToCache = [
  'https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.js',
  'https://cdn.tailwindcss.com'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache abierto. Almacenando archivos...');
        
        // ✅ MEJORADO: Cachear URLs de CDN con 'no-cors'
        const cdnPromises = cdnUrlsToCache.map(url => {
          const request = new Request(url, { mode: 'no-cors' });
          return fetch(request).then(response => cache.put(request, response));
        });

        // Cachear URLs locales
        const localPromise = cache.addAll(localUrlsToCache);

        return Promise.all([...cdnPromises, localPromise]);
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request);
      })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Eliminando caché antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});
