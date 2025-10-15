/**
 * @file sw.js
 * @description Service Worker para DitherLab v7.
 * Gestiona el cacheo de los assets de la aplicación para permitir
 * la funcionalidad offline (Progressive Web App - PWA).
 */

// Se utiliza una fecha en el nombre de la caché para forzar la actualización
// del Service Worker cuando se despliegan nuevos cambios.
const CACHE_NAME = 'ditherlab-v7-cache-20250115-v2'; // ✅ Actualizada la versión

// Lista de todos los archivos esenciales para que la aplicación funcione offline.
const urlsToCache = [
  './',
  './index.html',
  './css/style.css', // ✅ CORREGIDO: era 'styles.css', ahora es 'style.css'
  './manifest.json',

  // --- Dependencias Externas Clave ---
  'https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.js',

  // --- Punto de Entrada y Worker de GIF ---
  './src/main.js',
  './src/workers/gif.worker.js',

  // --- Módulos del Núcleo (Core) ---
  './src/core/EventBus.js',
  './src/core/Store.js',
  './src/core/CanvasManager.js',
  './src/core/MediaLoader.js',
  './src/core/ConfigValidator.js',

  // --- Módulos de la Interfaz de Usuario (UI) ---
  './src/ui/UIController.js',
  './src/ui/components/BasePanel.js',
  './src/ui/components/MediaPanel.js',
  './src/ui/components/TimelinePanel.js',
  './src/ui/components/AlgorithmPanel.js',
  './src/ui/components/PalettePanel.js',
  './src/ui/components/ImageAdjustmentsPanel.js',
  './src/ui/components/CurvesEditor.js',
  './src/ui/components/PresetsPanel.js',
  './src/ui/components/StatsPanel.js',
  './src/ui/components/ExportPanel.js',
  './src/ui/components/MetricsPanel.js',
  './src/ui/utils/DOMHelpers.js',
  './src/ui/utils/Modal.js',
  './src/ui/utils/Toast.js',

  // --- Módulos de Procesamiento ---
  './src/processors/ImageProcessor.js',
  './src/processors/PaletteGenerator.js',
  './src/processors/ImageAdjustments.js',
  './src/processors/CurveProcessor.js',

  // --- Módulos de la Línea de Tiempo y Reproducción ---
  './src/timeline/PlaybackManager.js',
  './src/timeline/TimelineController.js',

  // --- Módulos de Presets y Métricas ---
  './src/presets/PresetManager.js',
  './src/presets/PresetStorage.js',
  './src/metrics/MetricsCalculator.js',
  './src/metrics/PSNR.js',
  './src/metrics/SSIM.js',
  './src/metrics/CompressionAnalyzer.js',

  // --- Módulos de Exportación ---
  './src/exporters/ExporterRegistry.js',
  './src/exporters/BaseExporter.js',
  './src/exporters/PNGExporter.js',
  './src/exporters/WebMExporter.js',
  './src/exporters/GIFExporter.js',
  './src/exporters/SpriteSheetExporter.js',
  './src/exporters/SequenceExporter.js',

  // --- Algoritmos y sus Dependencias ---
  './src/algorithms/AlgorithmRegistry.js',
  './src/algorithms/BaseAlgorithm.js',
  './src/algorithms/ErrorDiffusion/BaseErrorDiffusionAlgorithm.js',
  './src/algorithms/ErrorDiffusion/FloydSteinberg.js',
  './src/algorithms/ErrorDiffusion/Atkinson.js',
  './src/algorithms/ErrorDiffusion/Stucki.js',
  './src/algorithms/ErrorDiffusion/JarvisJudiceNinke.js',
  './src/algorithms/ErrorDiffusion/Sierra.js',
  './src/algorithms/ErrorDiffusion/SierraLite.js',
  './src/algorithms/ErrorDiffusion/Burkes.js',
  './src/algorithms/OrderedDithering/Bayer.js',
  './src/algorithms/OrderedDithering/BlueNoise.js',
  './src/algorithms/Advanced/VariableError.js',
  './src/algorithms/Advanced/Posterize.js',
  './src/algorithms/utils/ColorCache.js',
  './src/algorithms/utils/LumaLUT.js',
  './src/algorithms/utils/BayerLUT.js',
  './src/algorithms/utils/BlueNoiseLUT.js',

  // --- Constantes y Utilidades ---
  './src/constants/algorithms.js',
  './src/constants/defaults.js',
  './src/constants/kernels.js',
  './src/utils/objectUtils.js',
  './src/utils/formatters.js',
  './src/utils/debounce.js',
  './src/utils/throttle.js',
  './src/utils/BufferPool.js',
  './src/utils/CircularBuffer.js',
];

// Evento 'install': Se dispara cuando el Service Worker se instala por primera vez.
self.addEventListener('install', event => {
  console.log('[Service Worker] Instalando DitherLab v7...');
  
  // Espera a que la promesa se resuelva antes de finalizar la instalación.
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Cache abierto, añadiendo assets...');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('[Service Worker] Todos los assets cacheados exitosamente');
        // Forza al nuevo Service Worker a activarse inmediatamente.
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[Service Worker] Error al cachear assets:', error);
      })
  );
});

// Evento 'fetch': Se dispara cada vez que la aplicación realiza una petición de red.
self.addEventListener('fetch', event => {
  // Ignorar peticiones que no son HTTP/HTTPS (como chrome-extension://)
  if (!event.request.url.startsWith('http')) {
    return;
  }

  // Responde a la petición, ya sea desde la caché o desde la red.
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Si la respuesta se encuentra en la caché, la devuelve.
        if (response) {
          // console.log('[Service Worker] Sirviendo desde caché:', event.request.url);
          return response;
        }
        
        // Si no, realiza la petición de red.
        // console.log('[Service Worker] Fetching desde red:', event.request.url);
        return fetch(event.request).then(fetchResponse => {
          // Cachear dinámicamente las respuestas exitosas
          if (fetchResponse && fetchResponse.status === 200) {
            // Clonar la respuesta porque solo se puede usar una vez
            const responseToCache = fetchResponse.clone();
            
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
          }
          
          return fetchResponse;
        }).catch(error => {
          console.error('[Service Worker] Fetch falló:', error);
          // Aquí podrías retornar una página offline por defecto
          // return caches.match('./offline.html');
        });
      })
  );
});

// Evento 'activate': Se dispara cuando el nuevo Service Worker se activa.
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activando...');
  
  // Espera a que la promesa se resuelva antes de finalizar la activación.
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        // Elimina todas las cachés antiguas que no coincidan con la actual.
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Limpiando caché antigua:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[Service Worker] Activado y listo');
      // Permite que el Service Worker activo tome el control de la página inmediatamente.
      return self.clients.claim();
    })
  );
});

// 🔥 NUEVO: Manejo de mensajes desde la aplicación
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[Service Worker] Forzando activación inmediata');
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    console.log('[Service Worker] Limpiando toda la caché');
    event.waitUntil(
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      })
    );
  }
});

// 🔥 NUEVO: Log de errores del Service Worker
self.addEventListener('error', event => {
  console.error('[Service Worker] Error:', event.error);
});

self.addEventListener('unhandledrejection', event => {
  console.error('[Service Worker] Promesa rechazada no manejada:', event.reason);
});
