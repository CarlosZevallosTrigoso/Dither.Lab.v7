/**
 * @file sw.js
 * @description Service Worker para DitherLab v7.
 * Gestiona el cacheo de los assets de la aplicación para permitir
 * la funcionalidad offline (Progressive Web App - PWA).
 */

// Se utiliza una fecha en el nombre de la caché para forzar la actualización
// del Service Worker cuando se despliegan nuevos cambios.
const CACHE_NAME = 'ditherlab-v7-cache-20250115';

// Lista de todos los archivos esenciales para que la aplicación funcione offline.
const urlsToCache = [
  './',
  './index.html',
  './css/styles.css',
  './src/main.js', // El punto de entrada es crucial
  './manifest.json',
  './js/gif.worker.js', // El worker de GIF.js se mantiene en una ruta accesible

  // Dependencias externas clave
  'https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.js',
];

// Evento 'install': Se dispara cuando el Service Worker se instala por primera vez.
self.addEventListener('install', event => {
  console.log('Service Worker: Instalando...');
  // Espera a que la promesa se resuelva antes de finalizar la instalación.
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Cache abierto, añadiendo assets...');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        // Forza al nuevo Service Worker a activarse inmediatamente.
        self.skipWaiting();
      })
  );
});

// Evento 'fetch': Se dispara cada vez que la aplicación realiza una petición de red.
self.addEventListener('fetch', event => {
  // Responde a la petición, ya sea desde la caché o desde la red.
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Si la respuesta se encuentra en la caché, la devuelve.
        if (response) {
          return response;
        }
        // Si no, realiza la petición de red.
        return fetch(event.request);
      })
  );
});

// Evento 'activate': Se dispara cuando el nuevo Service Worker se activa.
self.addEventListener('activate', event => {
  console.log('Service Worker: Activando...');
  // Espera a que la promesa se resuelva antes de finalizar la activación.
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        // Elimina todas las cachés antiguas que no coincidan con la actual.
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Limpiando caché antigua:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Permite que el Service Worker activo tome el control de la página inmediatamente.
      return self.clients.claim();
    })
  );
});
