// ============================================================================
// EVENT BUS - Sistema de comunicación desacoplado
// ============================================================================
// Permite que los módulos se comuniquen sin conocerse directamente
// Ejemplo: MediaManager emite 'media:loaded' y varios componentes escuchan

class EventBus {
  constructor() {
    // Mapa de eventos -> array de callbacks
    this.listeners = new Map();
    
    // Para debugging (opcional)
    this.debug = false;
  }

  /**
   * Registrar un listener para un evento
   * @param {string} event - Nombre del evento (ej: 'media:loaded')
   * @param {function} callback - Función a ejecutar cuando ocurra el evento
   * @returns {function} - Función para desuscribirse
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    
    this.listeners.get(event).push(callback);
    
    if (this.debug) {
      console.log(`[EventBus] Listener registrado: ${event}`);
    }
    
    // Retornar función para desuscribirse fácilmente
    return () => this.off(event, callback);
  }

  /**
   * Emitir un evento
   * @param {string} event - Nombre del evento
   * @param {*} data - Datos a pasar a los listeners
   */
  emit(event, data) {
    const callbacks = this.listeners.get(event);
    
    if (!callbacks || callbacks.length === 0) {
      if (this.debug) {
        console.log(`[EventBus] Evento emitido sin listeners: ${event}`);
      }
      return;
    }
    
    if (this.debug) {
      console.log(`[EventBus] Emitiendo: ${event}`, data);
    }
    
    // Ejecutar todos los callbacks
    callbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`[EventBus] Error en listener de "${event}":`, error);
      }
    });
  }

  /**
   * Desuscribirse de un evento
   * @param {string} event - Nombre del evento
   * @param {function} callback - Callback a remover
   */
  off(event, callback) {
    const callbacks = this.listeners.get(event);
    
    if (!callbacks) return;
    
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
      
      if (this.debug) {
        console.log(`[EventBus] Listener removido: ${event}`);
      }
    }
    
    // Limpiar el array si está vacío
    if (callbacks.length === 0) {
      this.listeners.delete(event);
    }
  }

  /**
   * Remover todos los listeners de un evento
   * @param {string} event - Nombre del evento
   */
  clear(event) {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Obtener número de listeners para un evento (útil para debugging)
   * @param {string} event - Nombre del evento
   * @returns {number}
   */
  listenerCount(event) {
    const callbacks = this.listeners.get(event);
    return callbacks ? callbacks.length : 0;
  }

  /**
   * Activar/desactivar modo debug
   * @param {boolean} enabled
   */
  setDebug(enabled) {
    this.debug = enabled;
  }
}

// Exportar instancia singleton
const eventBus = new EventBus();

// Hacer disponible globalmente
if (typeof window !== 'undefined') {
  window.EventBus = EventBus;
  window.eventBus = eventBus;
}