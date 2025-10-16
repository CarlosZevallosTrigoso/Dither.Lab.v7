// ============================================================================
// ALGORITHM BASE - Clase base abstracta para algoritmos de dithering
// ============================================================================
// Todos los algoritmos deben extender esta clase e implementar el método process()

class AlgorithmBase {
  // Propiedades estáticas que DEBEN ser sobrescritas por las subclases
  static displayName = 'Base Algorithm';
  static description = 'Clase base abstracta para algoritmos';
  static category = 'base';
  
  // Parámetros específicos del algoritmo (opcional)
  // Formato: [{ id, label, type, min, max, default, description }]
  static parameters = [];
  
  /**
   * Constructor
   * @param {object} config - Configuración del algoritmo
   */
  constructor(config = {}) {
    // Configuración general de la aplicación
    this.config = config;
    
    // Parámetros específicos del algoritmo
    this.params = this.getDefaultParams();
    
    // Helpers comunes
    this.colorCache = new Map();
    
    // Estadísticas de rendimiento
    this.lastProcessTime = 0;
  }
  
  /**
   * Método principal - DEBE ser implementado por cada algoritmo
   * @param {p5.Graphics} buffer - Buffer donde se dibujará el resultado
   * @param {p5.Image|p5.MediaElement} source - Fuente (imagen o video)
   * @param {number} width - Ancho del canvas
   * @param {number} height - Alto del canvas
   */
  process(buffer, source, width, height) {
    throw new Error(`El algoritmo "${this.constructor.name}" debe implementar el método process()`);
  }
  
  /**
   * Obtener parámetros por defecto del algoritmo
   * @returns {object}
   */
  getDefaultParams() {
    const params = {};
    const paramDefs = this.constructor.parameters || [];
    
    for (const param of paramDefs) {
      params[param.id] = param.default;
    }
    
    return params;
  }
  
  /**
   * Actualizar un parámetro del algoritmo
   * @param {string} paramId - ID del parámetro
   * @param {*} value - Nuevo valor
   */
  setParam(paramId, value) {
    if (paramId in this.params) {
      this.params[paramId] = value;
    } else {
      console.warn(`[${this.constructor.name}] Parámetro desconocido: ${paramId}`);
    }
  }
  
  /**
   * Actualizar múltiples parámetros
   * @param {object} params - Objeto con parámetros a actualizar
   */
  setParams(params) {
    for (const [key, value] of Object.entries(params)) {
      this.setParam(key, value);
    }
  }
  
  /**
   * Obtener valor de un parámetro
   * @param {string} paramId - ID del parámetro
   * @returns {*}
   */
  getParam(paramId) {
    return this.params[paramId];
  }
  
  /**
   * Obtener todos los parámetros
   * @returns {object}
   */
  getParams() {
    return { ...this.params };
  }
  
  /**
   * Resetear parámetros a valores por defecto
   */
  resetParams() {
    this.params = this.getDefaultParams();
  }
  
  // ============================================================================
  // MÉTODOS AUXILIARES COMUNES
  // ============================================================================
  
  /**
   * Aplicar ajustes de imagen (brillo, contraste, saturación, curvas)
   * @param {Uint8ClampedArray} pixels - Array de píxeles
   * @param {object} config - Configuración con ajustes
   */
  applyImageAdjustments(pixels, config) {
    const brightness = config.brightness || 0;
    const contrast = config.contrast || 1.0;
    const saturation = config.saturation || 1.0;
    const curvesLUTs = config.curvesLUTs;
    
    // Verificar si hay ajustes que aplicar
    const hasBasicAdjustments = brightness !== 0 || contrast !== 1.0 || saturation !== 1.0;
    const hasCurves = curvesLUTs && (
      curvesLUTs.rgb || curvesLUTs.r || curvesLUTs.g || curvesLUTs.b
    );
    
    if (!hasBasicAdjustments && !hasCurves) {
      return;
    }
    
    const len = pixels.length;
    
    for (let i = 0; i < len; i += 4) {
      let r = pixels[i];
      let g = pixels[i + 1];
      let b = pixels[i + 2];
      
      // 1. Aplicar brillo y contraste
      if (hasBasicAdjustments) {
        r = (r - 127.5) * contrast + 127.5 + brightness;
        g = (g - 127.5) * contrast + 127.5 + brightness;
        b = (b - 127.5) * contrast + 127.5 + brightness;
        
        // 2. Aplicar saturación
        if (saturation !== 1.0) {
          const luma = r * 0.299 + g * 0.587 + b * 0.114;
          r = luma + (r - luma) * saturation;
          g = luma + (g - luma) * saturation;
          b = luma + (b - luma) * saturation;
        }
      }
      
      // Clamp antes de curvas
      r = Math.max(0, Math.min(255, r));
      g = Math.max(0, Math.min(255, g));
      b = Math.max(0, Math.min(255, b));
      
      // 3. Aplicar curvas
      if (hasCurves) {
        // Primero curva RGB (master)
        if (curvesLUTs.rgb) {
          r = curvesLUTs.rgb[Math.round(r)];
          g = curvesLUTs.rgb[Math.round(g)];
          b = curvesLUTs.rgb[Math.round(b)];
        }
        
        // Luego curvas individuales por canal
        if (curvesLUTs.r) r = curvesLUTs.r[Math.round(r)];
        if (curvesLUTs.g) g = curvesLUTs.g[Math.round(g)];
        if (curvesLUTs.b) b = curvesLUTs.b[Math.round(b)];
      }
      
      // Asegurar rango final
      pixels[i] = Math.max(0, Math.min(255, r));
      pixels[i + 1] = Math.max(0, Math.min(255, g));
      pixels[i + 2] = Math.max(0, Math.min(255, b));
    }
  }
  
  /**
   * Calcular luminancia de un píxel RGB
   * @param {number} r - Rojo (0-255)
   * @param {number} g - Verde (0-255)
   * @param {number} b - Azul (0-255)
   * @returns {number} - Luminancia (0-255)
   */
  calculateLuma(r, g, b) {
    return r * 0.299 + g * 0.587 + b * 0.114;
  }
  
  /**
   * Encontrar el color más cercano en una paleta
   * @param {number} r - Rojo (0-255)
   * @param {number} g - Verde (0-255)
   * @param {number} b - Azul (0-255)
   * @param {array} palette - Array de colores [r, g, b, r, g, b, ...]
   * @returns {object} - { r, g, b, index }
   */
  findClosestColor(r, g, b, palette) {
    let minDistance = Infinity;
    let closestIndex = 0;
    let closestR = 0;
    let closestG = 0;
    let closestB = 0;
    
    for (let i = 0; i < palette.length; i += 3) {
      const pr = palette[i];
      const pg = palette[i + 1];
      const pb = palette[i + 2];
      
      // Distancia euclidiana en espacio RGB
      const dr = r - pr;
      const dg = g - pg;
      const db = b - pb;
      const distance = dr * dr + dg * dg + db * db;
      
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = i / 3;
        closestR = pr;
        closestG = pg;
        closestB = pb;
      }
    }
    
    return { r: closestR, g: closestG, b: closestB, index: closestIndex };
  }
  
  /**
   * Cuantizar un valor a niveles discretos
   * @param {number} value - Valor a cuantizar (0-255)
   * @param {number} levels - Número de niveles
   * @returns {number} - Valor cuantizado
   */
  quantize(value, levels) {
    const step = 255 / (levels - 1);
    return Math.round(value / step) * step;
  }
  
  /**
   * Clampar valor entre 0 y 255
   * @param {number} value - Valor a clampar
   * @returns {number}
   */
  clamp(value) {
    return Math.max(0, Math.min(255, value));
  }
  
  /**
   * Crear LUT (Look-Up Table) de luminancia
   * @param {array} colors - Array de colores p5.js
   * @param {object} p5Instance - Instancia de p5.js
   * @returns {Uint8Array} - LUT con 256 * 3 valores (r, g, b)
   */
  createLumaLUT(colors, p5Instance) {
    const count = colors.length;
    const lut = new Uint8Array(256 * 3);
    
    for (let i = 0; i < 256; i++) {
      const index = count === 0 ? 0 : Math.min(Math.floor(i / 255 * count), count - 1);
      const color = colors[index] || p5Instance.color(i);
      
      lut[i * 3] = p5Instance.red(color);
      lut[i * 3 + 1] = p5Instance.green(color);
      lut[i * 3 + 2] = p5Instance.blue(color);
    }
    
    return lut;
  }
  
  /**
   * Obtener color de una LUT
   * @param {Uint8Array} lut - Look-Up Table
   * @param {number} luma - Valor de luminancia (0-255)
   * @returns {array} - [r, g, b]
   */
  getLUTColor(lut, luma) {
    const index = Math.min(Math.max(Math.floor(luma), 0), 255);
    return [
      lut[index * 3],
      lut[index * 3 + 1],
      lut[index * 3 + 2]
    ];
  }
  
  /**
   * Medir tiempo de procesamiento
   * @param {function} fn - Función a ejecutar
   * @returns {*} - Resultado de la función
   */
  measureTime(fn) {
    const start = performance.now();
    const result = fn();
    this.lastProcessTime = performance.now() - start;
    return result;
  }
  
  /**
   * Obtener último tiempo de procesamiento
   * @returns {number} - Tiempo en milisegundos
   */
  getLastProcessTime() {
    return this.lastProcessTime;
  }
  
  /**
   * Verificar si el algoritmo requiere un kernel de error
   * @returns {boolean}
   */
  requiresErrorKernel() {
    return false;
  }
  
  /**
   * Verificar si el algoritmo soporta escaneo serpentino
   * @returns {boolean}
   */
  supportsSerpentineScan() {
    return false;
  }
  
  /**
   * Verificar si el algoritmo soporta ajuste de fuerza
   * @returns {boolean}
   */
  supportsStrengthAdjustment() {
    return false;
  }
  
  /**
   * Obtener información del algoritmo
   * @returns {object}
   */
  getInfo() {
    return {
      name: this.constructor.displayName,
      description: this.constructor.description,
      category: this.constructor.category,
      parameters: this.constructor.parameters,
      currentParams: this.getParams(),
      capabilities: {
        requiresErrorKernel: this.requiresErrorKernel(),
        supportsSerpentineScan: this.supportsSerpentineScan(),
        supportsStrengthAdjustment: this.supportsStrengthAdjustment()
      },
      performance: {
        lastProcessTime: this.lastProcessTime
      }
    };
  }
  
  /**
   * Validar configuración antes de procesar
   * @param {object} config - Configuración a validar
   * @returns {object} - { valid: boolean, errors: array }
   */
  validateConfig(config) {
    const errors = [];
    
    // Validaciones básicas
    if (!config) {
      errors.push('Configuración no proporcionada');
    }
    
    if (config.colorCount < 2) {
      errors.push('colorCount debe ser al menos 2');
    }
    
    if (config.ditherScale < 1) {
      errors.push('ditherScale debe ser al menos 1');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Hook que se ejecuta antes de process() (opcional)
   * Las subclases pueden sobrescribir esto para preparación
   */
  beforeProcess(buffer, source, width, height) {
    // Override en subclases si es necesario
  }
  
  /**
   * Hook que se ejecuta después de process() (opcional)
   * Las subclases pueden sobrescribir esto para limpieza
   */
  afterProcess(buffer, source, width, height) {
    // Override en subclases si es necesario
  }
  
  /**
   * Cleanup - liberar recursos si es necesario
   */
  dispose() {
    this.colorCache.clear();
  }
}

// Exportar
if (typeof window !== 'undefined') {
  window.AlgorithmBase = AlgorithmBase;
}