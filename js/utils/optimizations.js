/**
 * ============================================================================
 * DitherLab v7 - Clases de Optimización
 * ============================================================================
 * - Contiene clases auxiliares diseñadas para mejorar el rendimiento,
 * como la gestión de buffers, caché de colores y tablas de búsqueda (LUTs).
 * ============================================================================
 */

/**
 * Gestiona un pool de "graphics buffers" de p5.js para evitar crearlos y
 * destruirlos constantemente en cada frame, reduciendo la carga en el GC.
 */
export class BufferPool {
  constructor() {
    this.buffers = new Map();
    this.lastUsed = new Map(); // Para limpiar buffers viejos
  }

  get(width, height, p) {
    const key = `${width}x${height}`;
    this.lastUsed.set(key, Date.now());

    if (!this.buffers.has(key)) {
      const buffer = p.createGraphics(width, height);
      buffer.elt.getContext('2d', {
        willFrequently: true,
        alpha: false // No necesitamos transparencia para el dithering
      });
      buffer.pixelDensity(1);
      buffer.elt.style.imageRendering = 'pixelated';
      this.buffers.set(key, buffer);
    }
    return this.buffers.get(key);
  }

  // Limpia buffers que no se han usado en un tiempo (ej. 1 minuto)
  cleanup(maxAge = 60000) {
    const now = Date.now();
    for (const [key, time] of this.lastUsed) {
      if (now - time > maxAge) {
        this.buffers.get(key)?.remove();
        this.buffers.delete(key);
        this.lastUsed.delete(key);
      }
    }
  }
}

/**
 * Crea una Tabla de Búsqueda (Look-Up Table) para mapear rápidamente
 * un valor de luminancia (0-255) a un color de la paleta actual.
 */
export class LumaLUT {
  constructor() {
    this.lut = null;
    this.cachedColors = null;
  }

  build(p5colors, p) {
    const count = p5colors.length;
    this.lut = new Uint8Array(256 * 3);

    for (let i = 0; i < 256; i++) {
      const index = count === 0 ? 0 : Math.min(Math.floor(i / 255 * count), count - 1);
      const color = p5colors[index] || p.color(i);
      this.lut[i * 3] = p.red(color);
      this.lut[i * 3 + 1] = p.green(color);
      this.lut[i * 3 + 2] = p.blue(color);
    }
    this.cachedColors = p5colors;
  }

  map(luma) {
    const index = Math.max(0, Math.min(Math.floor(luma), 255));
    const pos = index * 3;
    return [this.lut[pos], this.lut[pos + 1], this.lut[pos + 2]];
  }

  needsRebuild(p5colors) {
    return !this.cachedColors || this.cachedColors.length !== p5colors.length;
  }
}

/**
 * LUT para la matriz de umbrales del dithering ordenado de Bayer (4x4).
 */
export class BayerLUT {
  constructor() {
    const BAYER_4x4 = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
    this.matrix = new Float32Array(16);
    for (let i = 0; i < 16; i++) {
      this.matrix[i] = (BAYER_4x4[Math.floor(i / 4)][i % 4] / 16.0 - 0.5);
    }
  }

  get(x, y) {
    const index = (y % 4) * 4 + (x % 4);
    return this.matrix[index];
  }
}

/**
 * LUT pre-calculada de ruido azul para un dithering ordenado de alta calidad.
 */
export class BlueNoiseLUT {
  constructor() {
    this.noise = new Float32Array([
      0.53, 0.18, 0.71, 0.41, 0.94, 0.24, 0.82, 0.47,
      0.12, 0.65, 0.29, 0.88, 0.06, 0.59, 0.35, 0.76,
      0.76, 0.35, 0.94, 0.18, 0.71, 0.12, 0.88, 0.24,
      0.24, 0.82, 0.47, 0.65, 0.29, 0.94, 0.41, 0.59,
      0.88, 0.06, 0.71, 0.35, 0.82, 0.18, 0.65, 0.12,
      0.41, 0.59, 0.12, 0.76, 0.24, 0.47, 0.94, 0.29,
      0.65, 0.29, 0.88, 0.06, 0.59, 0.71, 0.35, 0.82,
      0.18, 0.94, 0.24, 0.53, 0.12, 0.76, 0.47, 0.41
    ]);
  }

  get(x, y) {
    const index = (y % 8) * 8 + (x % 8);
    return this.noise[index] - 0.5;
  }
}
