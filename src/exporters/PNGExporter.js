/**
 * @file PNGExporter.js
 * @description Módulo para exportar el frame actual del canvas como un archivo PNG.
 */
import { BaseExporter } from './BaseExporter.js';

class PNGExporter extends BaseExporter {
  constructor() {
    super('png');
  }

  /**
   * Guarda el canvas actual como un archivo PNG.
   * @param {object} canvasManager - La instancia del gestor del canvas.
   */
  async export(canvasManager) {
    if (!canvasManager || !canvasManager.p5) {
      throw new Error('El gestor de canvas no está disponible.');
    }
    // Forzar un redibujado para asegurar que el canvas esté actualizado
    canvasManager.requestRedraw();
    
    // Esperar un frame para que el redibujado se complete
    await new Promise(resolve => setTimeout(resolve, 50));

    const fileName = this.generateFileName('png');
    canvasManager.p5.saveCanvas(fileName);
  }
}

export default new PNGExporter();
