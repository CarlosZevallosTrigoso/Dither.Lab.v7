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
    
    // Validación de frameCount
    if (frameCount <= 0 || !isFinite(frameCount)) {
      throw new Error('No se puede exportar GIF: duración inválida o sin frames');
    }
    
    console.log(`GIFExporter: Exportando ${frameCount} frames a ${fps} FPS`);
    
    const wasPlaying = !mediaInstance.elt.paused;
    if (wasPlaying) this.eventBus.publish('playback:pause');

    return new Promise((resolve, reject) => {
      // 🔥 CORRECCIÓN: Ruta relativa explícita al worker
      const gif = new GIF({
        workers: 2,
        quality: quality,
        width: canvasManager.p5.width,
        height: canvasManager.p5.height,
        workerScript: './src/workers/gif.worker.js', // ✅ Ruta corregida con ./
        debug: false // Desactivar logs del worker en producción
      });

      gif.on('finished', (blob) => {
        const fileName = this.generateFileName('gif');
        this.downloadBlob(blob, fileName);
        if (wasPlaying) this.eventBus.publish('playback:play');
        console.log(`GIFExporter: GIF exportado exitosamente (${fileName})`);
        resolve();
      });
      
      gif.on('progress', (prog) => {
          // El progreso de renderizado es la segunda mitad del proceso
          this.eventBus.publish('export:progress', { 
            format: 'gif', 
            progress: 0.5 + prog * 0.5,
            message: `Renderizando GIF: ${Math.round(prog * 100)}%`
          });
      });
      
      gif.on('abort', () => {
        console.warn('GIFExporter: Exportación abortada');
        if (wasPlaying) this.eventBus.publish('playback:play');
        reject(new Error('Exportación de GIF abortada'));
      });

      (async () => {
        try {
          for (let i = 0; i < frameCount; i++) {
            const time = startTime + (i / fps);
            
            // Validar que el tiempo está dentro del rango
            if (time > endTime) {
              console.warn(`GIFExporter: Tiempo ${time}s excede endTime ${endTime}s, ajustando`);
              break;
            }
            
            this.eventBus.publish('playback:seek-time', time);
            
            // Esperar a que el frame se cargue y se redibuje
            canvasManager.requestRedraw();
            await new Promise(r => setTimeout(r, 100)); // Dar tiempo para el renderizado

            // La opción 'copy: true' es crucial para evitar que todos los frames sean el mismo
            gif.addFrame(canvasManager.p5.canvas, { copy: true, delay: frameDelay });
            
            // El progreso de captura es la primera mitad
            const captureProgress = ((i + 1) / frameCount) * 0.5;
            this.eventBus.publish('export:progress', { 
              format: 'gif', 
              progress: captureProgress,
              message: `Capturando frames: ${i + 1}/${frameCount}`
            });
          }
          
          console.log('GIFExporter: Todos los frames capturados, iniciando renderizado...');
          this.eventBus.publish('export:progress', { 
            format: 'gif', 
            progress: 0.5,
            message: 'Renderizando GIF...'
          });
          
          gif.render();
        } catch (error) {
          console.error('GIFExporter: Error durante la captura de frames:', error);
          if (wasPlaying) this.eventBus.publish('playback:play');
          reject(error);
        }
      })();
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
    
    // Validación adicional
    if (startTime >= endTime) {
      console.warn(`GIFExporter: startTime (${startTime}) >= endTime (${endTime}), ajustando`);
      startTime = 0;
      endTime = media.duration;
    }
    
    return { startTime, endTime };
  }
}

export default new GIFExporter();
