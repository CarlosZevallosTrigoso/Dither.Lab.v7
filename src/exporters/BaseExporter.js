/**
 * @file BaseExporter.js
 * @description Clase base para todos los módulos de exportación.
 * Define la interfaz común que deben implementar.
 */
import { store } from '../core/Store.js';
import { eventBus } from '../core/EventBus.js';

export class BaseExporter {
  /**
   * @param {string} formatId - El identificador único del formato (ej: 'png', 'webm').
   */
  constructor(formatId) {
    if (this.constructor === BaseExporter) {
      throw new Error("La clase base 'BaseExporter' no puede ser instanciada directamente.");
    }
    this.formatId = formatId;
    this.store = store;
    this.eventBus = eventBus;
  }

  /**
   * Método principal que ejecuta el proceso de exportación.
   * Debe ser implementado por las subclases.
   * @param {object} canvasManager - La instancia del gestor del canvas para acceder al p5.Canvas.
   * @param {object} options - Un objeto con opciones específicas para la exportación.
   * @returns {Promise<void>}
   */
  async export(canvasManager, options) {
    throw new Error(`El exportador '${this.formatId}' debe implementar el método 'export'.`);
  }

  /**
   * Genera un nombre de archivo estandarizado.
   * @param {string} extension - La extensión del archivo (ej: 'png', 'webm').
   * @returns {string} El nombre del archivo generado.
   */
  generateFileName(extension) {
    const effect = this.store.getState().config.effect;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `DitherLab_v7_${effect}_${timestamp}.${extension}`;
  }

  /**
   * Utilidad para forzar la descarga de un blob.
   * @param {Blob} blob - El blob a descargar.
   * @param {string} fileName - El nombre del archivo.
   */
  downloadBlob(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
