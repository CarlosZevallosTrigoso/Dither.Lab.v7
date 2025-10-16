/**
 * export.js
 * Servicio para manejar la exportación a diferentes formatos (GIF, WebM, PNG, etc.).
 */
import { eventBus } from '../event-bus.js';

let p5Instance; // Se recibirá desde el renderer
let state;

// La lógica interna de exportGifCore, etc., se mantiene similar a la original
async function exportGif(options) {
  const { media, config, startTime, endTime, fps, quality, width, height } = options;
  const duration = endTime - startTime;
  const frameCount = Math.ceil(duration * fps);
  const frameDelay = 1000 / fps;

  return new Promise((resolve, reject) => {
    const gif = new GIF({
      workers: 2,
      quality: quality,
      width: width,
      height: height,
      workerScript: 'https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.worker.js'
    });

    gif.on('finished', blob => resolve(blob));
    gif.on('progress', prog => {
      eventBus.publish('export:progress', { format: 'gif', progress: prog });
    });
    
    (async () => {
      const wasPlaying = media.elt && !media.elt.paused;
      if (wasPlaying) media.pause();

      for (let i = 0; i < frameCount; i++) {
        const time = startTime + (i / fps);
        media.time(time);
        await new Promise(r => setTimeout(r, 50));
        
        // Forzar un redibujado síncrono para capturar el frame
        p5Instance.redraw();
        await new Promise(r => setTimeout(r, 50));

        gif.addFrame(p5Instance.canvas, { copy: true, delay: frameDelay });
        
        // Publicar progreso de captura (la librería solo notifica el renderizado)
        eventBus.publish('export:progress', { format: 'gif', progress: (i + 1) / frameCount * 0.5 });
      }

      if (wasPlaying) media.loop();
      gif.render();
    })().catch(reject);
  });
}

function saveCanvasFrame(filename) {
    p5Instance.saveCanvas(filename, 'png');
}

// Inicialización del servicio
export function initializeExportService(appState, bus) {
  state = appState;
  
  bus.subscribe('renderer:ready', (p5) => {
    p5Instance = p5;
  });

  bus.subscribe('export:start-gif', async (options) => {
    try {
      const currentState = state.get();
      const exportOptions = {
        ...options,
        media: currentState.media,
        config: currentState.config,
        width: p5Instance.width,
        height: p5Instance.height,
      };
      
      const blob = await exportGif(exportOptions);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ditherlab-v7-${Date.now()}.gif`;
      a.click();
      URL.revokeObjectURL(url);

      bus.publish('export:finished', { format: 'gif', success: true });
      bus.publish('ui:showToast', { message: 'GIF exportado con éxito' });

    } catch (error) {
      console.error("Error al exportar GIF:", error);
      bus.publish('export:finished', { format: 'gif', success: false, error });
      bus.publish('ui:showToast', { message: 'Error al exportar GIF', type: 'error' });
    }
  });

  bus.subscribe('export:frame', (options) => {
    const filename = `ditherlab-v7-frame-${Date.now()}`;
    saveCanvasFrame(filename);
    bus.publish('ui:showToast', { message: 'Frame exportado como PNG' });
  });
}