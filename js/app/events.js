/**
 * ============================================================================
 * DitherLab v7 - Bus de Eventos (EventEmitter)
 * ============================================================================
 * - Este módulo centraliza la comunicación entre los diferentes componentes
 * de la aplicación.
 * - Permite un bajo acoplamiento: los módulos emiten o escuchan eventos
 * sin necesidad de tener referencias directas entre ellos.
 *
 * Uso:
 * - import { events } from './events.js';
 * - events.on('nombre-evento', (datos) => { ... });
 * - events.emit('nombre-evento', datos);
 * ============================================================================
 */
class EventEmitter {
  constructor() {
    this.events = {};
  }

  /**
   * Se suscribe a un evento.
   * @param {string} eventName - El nombre del evento.
   * @param {Function} listener - La función a ejecutar cuando el evento se emita.
   */
  on(eventName, listener) {
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }
    this.events[eventName].push(listener);
  }

  /**
   * Emite un evento, ejecutando todos los listeners suscritos.
   * @param {string} eventName - El nombre del evento a emitir.
   * @param {*} data - Los datos a pasar a los listeners.
   */
  emit(eventName, data) {
    if (this.events[eventName]) {
      this.events[eventName].forEach(listener => listener(data));
    }
  }

  /**
   * Elimina un listener de un evento.
   * @param {string} eventName - El nombre del evento.
   * @param {Function} listenerToRemove - El listener específico a eliminar.
   */
  off(eventName, listenerToRemove) {
    if (!this.events[eventName]) return;

    this.events[eventName] = this.events[eventName].filter(
      listener => listener !== listenerToRemove
    );
  }
}

// Exportamos una única instancia para que toda la aplicación la comparta.
export const events = new EventEmitter();