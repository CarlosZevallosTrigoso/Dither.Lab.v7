/**
 * @file GIFExporter.js
 * @description Módulo para exportar animaciones en formato GIF.
 */
import { BaseExporter } from './BaseExporter.js';

class GIFExporter extends BaseExporter {
  constructor() {
    super('gif');
  }

  /**
   * Crea y exporta un GIF animado.
   * @param {object} canvasManager - La instancia del gestor del canvas.
   * @param {object} options - Opciones como fps, quality, useMarkers.
   */
  async export(canvasManager, options) {
    const { media } = this.store.getState();
    const { instance: mediaInstance, duration: mediaDuration } = media;

    if (media.type !== 'video') {
      throw new Error('La exportación a GIF solo está disponible para videos.');
    }

    const { fps, quality, useMarkers } = options;
    const frameDelay = 1000 / fps;

    let { startTime, endTime } = this.getStartEndTimes(useMarkers);
    const duration = endTime - startTime;
    const frameCount = Math.ceil(duration * fps);
    
    const wasPlaying = !mediaInstance.elt.paused;
    if (wasPlaying) this.eventBus.publish('playback:pause');

    return new Promise((resolve, reject) => {
      const gif = new GIF({
        workers: 2,
        quality: quality,
        width: canvasManager.p5.width,
        height: canvasManager.p5.height,
        workerScript: 'js/gif.worker.js', // Asumimos que el worker está en la raíz
      });

      gif.on('finished', (blob) => {
        const fileName = this.generateFileName('gif');
        this.downloadBlob(blob, fileName);
        if (wasPlaying) this.eventBus.publish('playback:play');
        resolve();
      });
      
      gif.on('progress', (prog) => {
          // El progreso de renderizado es la segunda mitad del proceso
          this.eventBus.publish('export:progress', { format: 'gif', progress: 0.5 + prog * 0.5 });
      });

      (async () => {
        for (let i = 0; i < frameCount; i++) {
          const time = startTime + (i / fps);
          this.eventBus.publish('playback:seek-time', time);
          
          // Esperar a que el frame se cargue y se redibuje
          canvasManager.requestRedraw();
          await new Promise(r => setTimeout(r, 100)); // Dar tiempo para el renderizado

          // La opción 'copy: true' es crucial
          gif.addFrame(canvasManager.p5.canvas, { copy: true, delay: frameDelay });
          
          // El progreso de captura es la primera mitad
          this.eventBus.publish('export:progress', { format: 'gif', progress: ((i + 1) / frameCount) * 0.5 });
        }
        
        gif.render();
      })().catch(reject);
    });
  }

  getStartEndTimes(useMarkers) {
    const { timeline, media } = this.store.getState();
    let startTime = 0;
    let endTime = media.duration;

    if (useMarkers) {
      startTime = timeline.markerInTime ?? 0;
      endTime = timeline.markerOutTime ?? media.duration;
    }
    return { startTime, endTime };
  }
}

export default new GIFExporter();
