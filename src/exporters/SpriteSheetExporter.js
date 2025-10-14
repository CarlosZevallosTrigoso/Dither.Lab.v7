/**
 * @file SpriteSheetExporter.js
 * @description Módulo para exportar una secuencia de frames como un sprite sheet.
 */
import { BaseExporter } from './BaseExporter.js';

class SpriteSheetExporter extends BaseExporter {
  constructor() {
    super('sprite');
  }

  async export(canvasManager, options) {
    const { media } = this.store.getState();
    if (media.type !== 'video') {
      throw new Error('La exportación a Sprite Sheet solo está disponible para videos.');
    }
    
    const { cols, frameCount } = options;
    const { instance: mediaInstance, duration } = media;
    const p5 = canvasManager.p5;
    const frameWidth = p5.width;
    const frameHeight = p5.height;
    const rows = Math.ceil(frameCount / cols);

    const sheet = p5.createGraphics(frameWidth * cols, frameHeight * rows);
    sheet.pixelDensity(1);

    const wasPlaying = !mediaInstance.elt.paused;
    if (wasPlaying) this.eventBus.publish('playback:pause');
    
    this.eventBus.publish('export:progress', { format: 'sprite', message: 'Generando Sprite Sheet...' });

    for (let i = 0; i < frameCount; i++) {
      const time = (i / (frameCount - 1)) * duration;
      this.eventBus.publish('playback:seek-time', time);
      canvasManager.requestRedraw();
      await new Promise(r => setTimeout(r, 100));

      const col = i % cols;
      const row = Math.floor(i / cols);
      sheet.image(p5.canvas, col * frameWidth, row * frameHeight);
      this.eventBus.publish('export:progress', { format: 'sprite', progress: (i + 1) / frameCount });
    }

    const fileName = this.generateFileName('png');
    sheet.save(fileName);
    sheet.remove();

    if (wasPlaying) this.eventBus.publish('playback:play');
  }
}

export default new SpriteSheetExporter();
