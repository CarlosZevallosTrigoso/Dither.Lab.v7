/**
 * @file SequenceExporter.js
 * @description Módulo para exportar una secuencia de frames como archivos PNG individuales.
 */
import { BaseExporter } from './BaseExporter.js';

class SequenceExporter extends BaseExporter {
  constructor() {
    super('sequence');
  }

  async export(canvasManager, options) {
    const { media } = this.store.getState();
    if (media.type !== 'video') {
      throw new Error('La exportación de secuencia solo está disponible para videos.');
    }

    const { instance: mediaInstance } = media;
    const p5 = canvasManager.p5;
    const fps = options?.fps || 15;
    
    let { startTime, endTime } = this.getStartEndTimes(true); // Siempre usa marcadores si existen
    const duration = endTime - startTime;
    const frameCount = Math.ceil(duration * fps);

    const wasPlaying = !mediaInstance.elt.paused;
    if (wasPlaying) this.eventBus.publish('playback:pause');
    
    this.eventBus.publish('export:progress', { format: 'sequence', message: 'Exportando secuencia PNG...' });

    for (let i = 0; i < frameCount; i++) {
      const time = startTime + (i / fps);
      this.eventBus.publish('playback:seek-time', time);
      canvasManager.requestRedraw();
      await new Promise(r => setTimeout(r, 100));
      
      const frameNumber = String(i).padStart(4, '0');
      const effect = this.store.getState().config.effect;
      p5.saveCanvas(`frame_${effect}_${frameNumber}`, 'png');
      
      // Pequeña pausa para permitir que el navegador procese la descarga
      await new Promise(r => setTimeout(r, 50));

      this.eventBus.publish('export:progress', { format: 'sequence', progress: (i + 1) / frameCount });
    }

    if (wasPlaying) this.eventBus.publish('playback:play');
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

export default new SequenceExporter();
