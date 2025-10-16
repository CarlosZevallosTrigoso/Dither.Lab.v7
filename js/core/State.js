// ============================================================================
// STATE MANAGER - Gestión centralizada del estado
// ============================================================================
// Maneja el estado de la aplicación de forma reactiva con dot notation

class State {
  constructor(eventBus) {
    this.eventBus = eventBus;
    
    // Estado inicial
    this.data = {
      // Media
      media: {
        file: null,
        type: null, // 'image' | 'video'
        isPlaying: false,
        duration: 0,
        currentTime: 0,
        playbackSpeed: 1
      },
      
      // Configuración de dithering
      config: {
        effect: 'floyd-steinberg',
        isMonochrome: false,
        useOriginalColor: false,
        colorCount: 4,
        colors: [],
        ditherScale: 2,
        serpentineScan: false,
        diffusionStrength: 1.0,
        patternStrength: 0.5,
        brightness: 0,
        contrast: 1.0,
        saturation: 1.0,
        curvesLUTs: null,
        algorithmParams: {}
      },
      
      // Timeline (solo para videos)
      timeline: {
        markerInTime: null,
        markerOutTime: null,
        loopSection: false
      },
      
      // Métricas
      metrics: {
        fps: 0,
        processTime: 0,
        psnr: 0,
        ssim: 0,
        compression: 0,
        paletteSize: 0
      }
    };
    
    // Listeners para cambios de estado
    this.listeners = new Map();
    
    console.log('📊 State Manager inicializado');
  }
  
  /**
   * Obtener valor usando dot notation
   * @param {string} path - Ruta con puntos (ej: 'media.type')
   * @returns {*}
   */
  get(path) {
    if (!path) return this.data;
    
    const keys = path.split('.');
    let value = this.data;
    
    for (const key of keys) {
      if (value === undefined || value === null) return undefined;
      value = value[key];
    }
    
    return value;
  }
  
  /**
   * Establecer valor usando dot notation
   * @param {string} path - Ruta con puntos (ej: 'media.type')
   * @param {*} value - Nuevo valor
   * @param {boolean} silent - Si es true, no emite eventos
   */
  set(path, value, silent = false) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    let target = this.data;
    
    // Navegar hasta el objeto padre
    for (const key of keys) {
      if (!(key in target)) {
        target[key] = {};
      }
      target = target[key];
    }
    
    const oldValue = target[lastKey];
    target[lastKey] = value;
    
    // Emitir evento de cambio
    if (!silent) {
      this.notifyChange(path, value, oldValue);
    }
  }
  
  /**
   * Establecer múltiples valores a la vez
   * @param {object} updates - Objeto con paths como keys y valores como values
   * @param {boolean} silent - Si es true, no emite eventos
   */
  setMultiple(updates, silent = false) {
    for (const [path, value] of Object.entries(updates)) {
      this.set(path, value, silent);
    }
  }
  
  /**
   * Actualizar parcialmente un objeto
   * @param {string} path - Ruta al objeto
   * @param {object} updates - Propiedades a actualizar
   */
  update(path, updates) {
    const current = this.get(path);
    if (typeof current !== 'object' || current === null) {
      console.warn(`[State] Cannot update non-object at path: ${path}`);
      return;
    }
    
    const updated = { ...current, ...updates };
    this.set(path, updated);
  }
  
  /**
   * Suscribirse a cambios de estado
   * @param {function} callback - Función que recibe (path, newValue, oldValue)
   * @returns {function} - Función para desuscribirse
   */
  subscribe(callback) {
    const id = Symbol();
    this.listeners.set(id, callback);
    
    return () => {
      this.listeners.delete(id);
    };
  }
  
  /**
   * Notificar a los listeners sobre un cambio
   * @param {string} path - Ruta que cambió
   * @param {*} newValue - Nuevo valor
   * @param {*} oldValue - Valor anterior
   */
  notifyChange(path, newValue, oldValue) {
    // Emitir evento en EventBus
    if (this.eventBus) {
      this.eventBus.emit('state:changed', { path, newValue, oldValue });
    }
    
    // Notificar a listeners directos
    for (const callback of this.listeners.values()) {
      try {
        callback(path, newValue, oldValue);
      } catch (error) {
        console.error('[State] Error en listener:', error);
      }
    }
  }
  
  /**
   * Resetear estado a valores iniciales
   * @param {string} path - Ruta a resetear (opcional, resetea todo si no se especifica)
   */
  reset(path = null) {
    if (path) {
      // Resetear solo una sección
      const initialValue = this.getInitialValue(path);
      if (initialValue !== undefined) {
        this.set(path, initialValue);
      }
    } else {
      // Resetear todo
      const oldData = this.data;
      this.data = this.getInitialState();
      this.notifyChange('', this.data, oldData);
    }
  }
  
  /**
   * Obtener estado inicial
   * @returns {object}
   */
  getInitialState() {
    return {
      media: {
        file: null,
        type: null,
        isPlaying: false,
        duration: 0,
        currentTime: 0,
        playbackSpeed: 1
      },
      config: {
        effect: 'floyd-steinberg',
        isMonochrome: false,
        useOriginalColor: false,
        colorCount: 4,
        colors: [],
        ditherScale: 2,
        serpentineScan: false,
        diffusionStrength: 1.0,
        patternStrength: 0.5,
        brightness: 0,
        contrast: 1.0,
        saturation: 1.0,
        curvesLUTs: null,
        algorithmParams: {}
      },
      timeline: {
        markerInTime: null,
        markerOutTime: null,
        loopSection: false
      },
      metrics: {
        fps: 0,
        processTime: 0,
        psnr: 0,
        ssim: 0,
        compression: 0,
        paletteSize: 0
      }
    };
  }
  
  /**
   * Obtener valor inicial de un path
   * @param {string} path - Ruta
   * @returns {*}
   */
  getInitialValue(path) {
    const initial = this.getInitialState();
    const keys = path.split('.');
    let value = initial;
    
    for (const key of keys) {
      if (value === undefined || value === null) return undefined;
      value = value[key];
    }
    
    return value;
  }
  
  /**
   * Exportar estado completo (útil para debugging o guardar)
   * @returns {object}
   */
  export() {
    return JSON.parse(JSON.stringify(this.data));
  }
  
  /**
   * Importar estado completo
   * @param {object} data - Estado a importar
   */
  import(data) {
    this.data = JSON.parse(JSON.stringify(data));
    this.notifyChange('', this.data, null);
  }
  
  /**
   * Imprimir estado en consola (debugging)
   */
  print() {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Estado actual de la aplicación');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(JSON.stringify(this.data, null, 2));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }
}

// Exportar
if (typeof window !== 'undefined') {
  window.State = State;
}
