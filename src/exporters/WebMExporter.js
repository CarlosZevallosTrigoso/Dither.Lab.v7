/**
 * @file WebMExporter.js
 * @description Módulo para grabar y exportar video en formato WebM.
 */
import { BaseExporter } from './BaseExporter.js';

class WebMExporter extends BaseExporter {
  constructor() {
    super('webm');
    this.recorder = null;
    this.chunks = [];
    this.isRecording = false;
    this.stopPromise = null;
    this.resolveStopPromise = null;
  }

  /**
   * Inicia la grabación del canvas.
   * @param {object} canvasManager - La instancia del gestor del canvas.
   * @param {object} options - Opciones de exportación (ej: useMarkers).
   */
  async export(canvasManager, options) {
    if (this.isRecording) {
      throw new Error('Ya hay una grabación en curso.');
    }
    
    const media = this.store.getState().media;
    if (media.type !== 'video') {
      throw new Error('La grabación WebM solo está disponible para videos.');
    }

    // Suscribirse al evento de detención
    const unsubscribe = this.eventBus.subscribe('export:stop', () => this.stop());
    
    this.isRecording = true;
    this.store.setKey('playback.isRecording', true);
    this.chunks = [];
    
    const stream = canvasManager.p5.canvas.captureStream(30);
    this.recorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: 12000000,
    });

    this.recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        this.chunks.push(e.data);
      }
    };
    
    this.recorder.onstop = () => {
      const blob = new Blob(this.chunks, { type: 'video/webm' });
      const fileName = this.generateFileName('webm');
      this.downloadBlob(blob, fileName);
      
      this.isRecording = false;
      this.store.setKey('playback.isRecording', false);
      if (this.resolveStopPromise) this.resolveStopPromise();
    };

    this.eventBus.publish('playback:start-recording', options);
    this.recorder.start();

    // Crear una promesa que se resolverá cuando se llame a stop()
    this.stopPromise = new Promise(resolve => {
        this.resolveStopPromise = resolve;
    });
    
    await this.stopPromise;
    unsubscribe(); // Limpiar el listener
  }
  
  /**
   * Detiene la grabación actual.
   */
  stop() {
    if (this.recorder && this.recorder.state === 'recording') {
      this.recorder.stop();
    }
  }
}

export default new WebMExporter();
