/**
 * @file BasePanel.js
 * @description Clase base abstracta para todos los componentes de panel de la UI.
 * Proporciona una estructura común para inicialización, renderizado y vinculación de eventos.
 */
import { eventBus } from '../../core/EventBus.js';
import { store } from '../../core/Store.js';
import { $ } from '../utils/DOMHelpers.js';

export class BasePanel {
  /**
   * @param {string} panelId - El ID del elemento contenedor del panel.
   */
  constructor(panelId) {
    this.panelElement = $(`#${panelId}`);
    if (!this.panelElement) {
      throw new Error(`Elemento de panel no encontrado: #${panelId}`);
    }
    this.eventBus = eventBus;
    this.store = store;

    // Suscribirse a los cambios de estado para volver a renderizar
    this.eventBus.subscribe('state:updated', (state) => this.render(state));
  }

  /**
   * Vincula los listeners de eventos del DOM. Debe ser implementado por las subclases.
   */
  bindEvents() {
    throw new Error(`El panel '${this.constructor.name}' debe implementar el método 'bindEvents'.`);
  }

  /**
   * Actualiza el DOM del panel en función del estado de la aplicación.
   * Debe ser implementado por las subclases.
   * @param {object} state - El estado completo de la aplicación.
   */
  render(state) {
    throw new Error(`El panel '${this.constructor.name}' debe implementar el método 'render'.`);
  }

  /**
   * Inicializa el panel llamando a bindEvents y renderizando por primera vez.
   */
  init() {
    this.bindEvents();
    this.render(this.store.getState());
  }
}
