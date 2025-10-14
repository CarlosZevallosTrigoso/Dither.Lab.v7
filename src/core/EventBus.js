/**
 * @file EventBus.js
 * @description Sistema de publicación/suscripción para comunicación desacoplada.
 * Permite que los módulos se suscriban a eventos y reaccionen a ellos
 * sin tener conocimiento directo unos de otros.
 */

class EventBus {
  constructor() {
    this.events = {};
  }

  /**
   * Se suscribe a un evento.
   * @param {string} eventName - El nombre del evento.
   * @param {Function} listener - La función a ejecutar cuando el evento es emitido.
   * @returns {Function} - Una función para desuscribirse.
   */
  subscribe(eventName, listener) {
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }
    this.events[eventName].push(listener);

    // Devuelve una función para facilitar la desuscripción
    return () => {
      this.unsubscribe(eventName, listener);
    };
  }

  /**
   * Se desuscribe de un evento.
   * @param {string} eventName - El nombre del evento.
   * @param {Function} listenerToRemove - La función a eliminar.
   */
  unsubscribe(eventName, listenerToRemove) {
    if (!this.events[eventName]) {
      return;
    }
    this.events[eventName] = this.events[eventName].filter(
      (listener) => listener !== listenerToRemove
    );
  }

  /**
   * Emite un evento, ejecutando todos los listeners suscritos.
   * @param {string} eventName - El nombre del evento a emitir.
   * @param {*} [payload] - Datos opcionales para pasar a los listeners.
   */
  publish(eventName, payload) {
    if (!this.events[eventName]) {
      return;
    }
    this.events[eventName].forEach((listener) => listener(payload));
  }
}

// Exportamos una única instancia para que sea un Singleton en toda la app.
export const eventBus = new EventBus();
