/**
 * ============================================================================
 * DitherLab v7 - Service Worker (VERSIÓN CORREGIDA Y COMPLETA)
 * ============================================================================
 * - Se ejecuta en segundo plano para gestionar el caché y las peticiones de red.
 * - Permite que la aplicación funcione offline sirviendo los archivos cacheados.
 * - Gestiona la limpieza de cachés antiguas para mantener la app actualizada.
 * ============================================================================
 */

const CACHE_NAME = 'ditherlab-v7-cache-20251013'; // Versión actualizada

const localUrlsToCache = [
  './',
  './index.html',
  './css/styles.css',
  './manifest.json',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
  './js/app/main.js',
  './js/app/pwa.js',
  './js/app/events.js',
  './js/app/state.js',
  './js/core/renderer.js',
  './js/core/algorithms.js',
  './js/core/constants.js',
  './js/core/metrics.js',
  './js/core/dither.worker.js', // ✅ AÑADIDO: Worker faltante
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
  console.log('[Service Worker] Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Cache abierto. Almacenando archivos...');
        
        // Cachear CDN con modo no-cors
        const cdnPromises = cdnUrlsToCache.map(url => {
          const request = new Request(url, { mode: 'no-cors' });
          return fetch(request)
            .then(response => cache.put(request, response))
            .catch(err => console.warn(`[Service Worker] No se pudo cachear: ${url}`, err));
        });

        // Cachear archivos locales
        const localPromise = cache.addAll(localUrlsToCache)
          .catch(err => {
            console.error('[Service Worker] Error al cachear archivos locales:', err);
            throw err;
          });

        return Promise.all([...cdnPromises, localPromise]);
      })
      .then(() => {
        console.log('[Service Worker] Instalación completada');
        return self.skipWaiting();
      })
      .catch(err => {
        console.error('[Service Worker] Error durante la instalación:', err);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response; // Servir desde caché
        }
        
        // Si no está en caché, intentar fetchear de la red
        return fetch(event.request)
          .then(fetchResponse => {
            // Opcionalmente, agregar a caché recursos nuevos
            if (fetchResponse && fetchResponse.status === 200 && fetchResponse.type === 'basic') {
              const responseToCache = fetchResponse.clone();
              caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, responseToCache);
              });
            }
            return fetchResponse;
          })
          .catch(err => {
            console.warn('[Service Worker] Fetch falló:', event.request.url, err);
            // Podrías devolver una página offline aquí
          });
      })
  );
});

self.addEventListener('activate', event => {
  console.log('[Service Worker] Activando...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Eliminando caché antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[Service Worker] Activación completada');
      return self.clients.claim();
    })
  );
});
