/**
 * @file ExporterRegistry.js
 * @description Registro central para todos los módulos de exportación.
 * Escucha los eventos de exportación y delega la tarea al módulo correcto.
 */
import { store } from '../core/Store.js';
import { eventBus } from '../core/EventBus.js';
import { BaseExporter } from './BaseExporter.js';

class ExporterRegistry {
  constructor() {
    this.exporters = new Map();
    this.isExporting = false;
    this.canvasManager = null; // Se inyectará en la inicialización
  }

  /**
   * Inicializa el registro y se suscribe al evento de exportación.
   * @param {object} canvasManager - La instancia del gestor del canvas.
   */
  init(canvasManager) {
    this.canvasManager = canvasManager;
    eventBus.subscribe('export:start', this.handleExportRequest.bind(this));
  }

  /**
   * Registra un nuevo módulo de exportación.
   * @param {BaseExporter} exporter - Una instancia de una subclase de BaseExporter.
   */
  register(exporter) {
    this.exporters.set(exporter.formatId, exporter);
  }

  /**
   * Maneja una solicitud de exportación recibida desde el EventBus.
   * @param {object} payload - El objeto con los detalles de la exportación.
   * @param {string} payload.format - El formato a exportar (ej: 'png').
   * @param {object} [payload.options] - Opciones adicionales para el exportador.
   */
  async handleExportRequest({ format, options }) {
    if (this.isExporting) {
      eventBus.publish('ui:showToast', { message: 'Ya hay un proceso de exportación en curso.' });
      return;
    }

    const exporter = this.exporters.get(format);
    if (!exporter) {
      console.error(`No se encontró un exportador para el formato: ${format}`);
      eventBus.publish('ui:showToast', { message: `Exportación para '${format}' no soportada.` });
      return;
    }

    this.isExporting = true;
    eventBus.publish('export:progress', { format, progress: 0, message: `Iniciando exportación ${format.toUpperCase()}...` });

    try {
      await exporter.export(this.canvasManager, options);
      eventBus.publish('ui:showToast', { message: `${format.toUpperCase()} exportado con éxito.` });
      eventBus.publish('export:progress', { format, progress: 1, message: '¡Listo!' });
    } catch (error) {
      console.error(`Error durante la exportación de ${format}:`, error);
      eventBus.publish('ui:showToast', { message: `Error al exportar ${format.toUpperCase()}.` });
      eventBus.publish('export:progress', { format, progress: 0, message: 'Error' });
    } finally {
      this.isExporting = false;
      // Ocultar barras de progreso después de un tiempo
      if(format === 'gif') {
          setTimeout(() => {
              eventBus.publish('export:progress', { format: 'gif', progress: 0, message: ''});
          }, 3000);
      }
    }
  }
}

export const exporterRegistry = new ExporterRegistry();
