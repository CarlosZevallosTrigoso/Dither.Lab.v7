const CACHE_NAME = 'ditherlab-v7-20250116'; // Actualizado fecha
const urlsToCache = [
  './',
  './index.html',
  './css/styles.css',
  
  // Constantes
  './js/constants.js',
  
  // Core v7
  './js/core/EventBus.js',
  './js/core/State.js',
  
  // Algoritmos
  './js/algorithms.js',
  
  // Utilidades
  './js/metrics.js',
  './js/export.js',
  './js/ui.js',
  
  // Processing
  './js/processing/AlgorithmRegistry.js',
  './js/processing/AlgorithmBase.js',
  
  // Managers v7
  './js/media/MediaManager.js',
  './js/export/ExportManager.js',
  './js/ui/UIController.js',
  
  // 🆕 NUEVOS MÓDULOS DE REFACTORIZACIÓN
  './js/palette/PaletteGenerator.js',
  './js/input/KeyboardManager.js',
  './js/timeline/TimelineManager.js',
  
  // App principal
  './js/app.js',
  './js/pwa.js',
  './js/main.js',
  
  // Assets
  './manifest.json',
  './js/gif.worker.js',
  
  // CDN (externos)
  'https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.js'
];

self.addEventListener('install', event => {
  console.log('[Service Worker] Instalando v7 (refactorizado)...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Cacheando archivos');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('[Service Worker] Instalación completa');
        return self.skipWaiting();
      })
      .catch(err => {
        console.error('[Service Worker] Error en instalación:', err);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          // console.log('[Service Worker] Sirviendo desde caché:', event.request.url);
          return response;
        }
        // console.log('[Service Worker] Fetch desde red:', event.request.url);
        return fetch(event.request);
      })
      .catch(err => {
        console.error('[Service Worker] Error en fetch:', err);
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
      console.log('[Service Worker] Activación completa');
      return self.clients.claim();
    })
  );
});
