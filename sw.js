/**
 * ============================================================================
 * DitherLab v7 - Service Worker
 * ============================================================================
 * - Se ejecuta en segundo plano para gestionar el caché y las peticiones de red.
 * - Permite que la aplicación funcione offline sirviendo los archivos cacheados.
 * - Gestiona la limpieza de cachés antiguas para mantener la app actualizada.
 * ============================================================================
 */

// Se recomienda cambiar la versión del caché cada vez que actualices los archivos.
const CACHE_NAME = 'ditherlab-v7-cache-20251007';

// Lista de archivos esenciales para que la aplicación funcione offline.
const urlsToCache = [
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
  'https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.js',
  'https://cdn.tailwindcss.com'
];

// Evento 'install': se dispara cuando el Service Worker se instala por primera vez.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache abierto. Almacenando archivos principales...');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting()) // Activa el nuevo SW inmediatamente.
  );
});

// Evento 'fetch': se dispara cada vez que la aplicación realiza una petición de red.
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Si el recurso está en caché, lo devolvemos desde el caché.
        if (response) {
          return response;
        }
        // Si no, realizamos la petición de red.
        return fetch(event.request);
      })
  );
});

// Evento 'activate': se dispara cuando el nuevo Service Worker se activa.
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        // Eliminamos los cachés antiguos que no coincidan con el CACHE_NAME actual.
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Eliminando caché antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Toma el control de la página inmediatamente.
  );
});