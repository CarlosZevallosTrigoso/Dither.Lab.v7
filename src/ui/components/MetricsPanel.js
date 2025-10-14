/**
 * @file MetricsPanel.js
 * @description Componente de UI para mostrar las métricas de calidad de imagen.
 */
import { BasePanel } from './BasePanel.js';
import { $ } from '../utils/DOMHelpers.js';

export class MetricsPanel extends BasePanel {
  constructor() {
    super('metricsModal'); // El panel está dentro del modal
    this.elements = {
      updateBtn: $('#updateMetricsBtn'),
      psnr: $('#metricPSNR'),
      ssim: $('#metricSSIM'),
      compression: $('#metricCompression'),
      paletteSize: $('#metricPaletteSize'),
      processTime: $('#metricProcessTime'),
    };
  }

  bindEvents() {
    this.elements.updateBtn.addEventListener('click', () => {
      this.eventBus.publish('metrics:request-update');
    });
  }
  
  render(state) {
    // Este panel también se actualiza principalmente a través de eventos,
    // pero podemos suscribirnos al evento 'metrics:updated' aquí.
    // Por simplicidad, lo haremos en UIController, pero esta es otra opción.
  }
  
  updateMetrics(metrics) {
      this.elements.psnr.textContent = metrics.psnr === Infinity ? '∞ dB' : `${metrics.psnr.toFixed(2)} dB`;
      this.elements.ssim.textContent = metrics.ssim.toFixed(4);
      this.elements.compression.textContent = `${metrics.compression.ratio.toFixed(2)}% (${metrics.compression.unique} colores)`;
      this.elements.paletteSize.textContent = `${metrics.paletteSize} colores`;
      this.elements.processTime.textContent = `${metrics.processTime.toFixed(2)} ms`;
  }
}
