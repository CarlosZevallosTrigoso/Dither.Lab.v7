/**
 * @file MetricsCalculator.js
 * @description Orquesta el cálculo de todas las métricas de calidad de imagen.
 */
import { eventBus } from '../core/EventBus.js';
import { store } from '../core/Store.js';
import { PSNR } from './PSNR.js';
import { SSIM } from './SSIM.js';
import { CompressionAnalyzer } from './CompressionAnalyzer.js';

export class MetricsCalculator {
  constructor() {
    this.psnr = new PSNR();
    this.ssim = new SSIM();
    this.compressionAnalyzer = new CompressionAnalyzer();
    this.p5 = null; // Se inyectará en la inicialización
    
    eventBus.subscribe('metrics:request-update', () => this.calculateAll());
  }

  init(p5) {
    this.p5 = p5;
  }

  async calculateAll() {
    const state = store.getState();
    if (!state.media.isLoaded || !this.p5) {
      eventBus.publish('ui:showToast', { message: 'Carga un medio para calcular las métricas.' });
      return;
    }
    
    eventBus.publish('ui:showToast', { message: 'Calculando métricas...' });
    
    // Crear buffers temporales para obtener los datos de los píxeles
    const { width, height } = this.p5;
    const originalBuffer = this.p5.createGraphics(width, height);
    originalBuffer.pixelDensity(1);
    originalBuffer.image(state.media.instance, 0, 0, width, height);
    originalBuffer.loadPixels();

    const processedBuffer = this.p5.get(); // Obtiene el canvas principal
    processedBuffer.loadPixels();

    const results = {
      psnr: this.psnr.calculate(originalBuffer.pixels, processedBuffer.pixels),
      ssim: this.ssim.calculate(originalBuffer.pixels, processedBuffer.pixels),
      compression: this.compressionAnalyzer.analyze(processedBuffer.pixels),
      paletteSize: state.config.colorCount,
      processTime: state.stats?.frameTime || 0 // Usar el último tiempo de frame conocido
    };

    eventBus.publish('metrics:updated', results);
    eventBus.publish('ui:showToast', { message: 'Métricas actualizadas.' });
    
    originalBuffer.remove();
  }
}
