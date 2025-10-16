/**
 * helpers.js
 * Funciones de utilidad y clases auxiliares para la aplicación.
 */

// --- FUNCIONES GENERALES ---

export function formatTime(seconds) {
  if (isNaN(seconds) || seconds === Infinity) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

// --- CLASES AUXILIARES PARA ALGORITMOS ---

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
    const index = Math.min(Math.max(Math.floor(luma), 0), 255);
    return [
      this.lut[index * 3],
      this.lut[index * 3 + 1],
      this.lut[index * 3 + 2]
    ];
  }
  
  needsRebuild(p5colors) {
    if (!this.cachedColors) return true;
    if (this.cachedColors.length !== p5colors.length) return true;
    return false;
  }
}

export class BayerLUT {
  constructor() {
    const BAYER_4x4 = [[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]];
    this.matrix = new Float32Array(16);
    
    for (let i = 0; i < 16; i++) {
      const y = Math.floor(i / 4);
      const x = i % 4;
      this.matrix[i] = (BAYER_4x4[y][x] / 16.0 - 0.5);
    }
  }
  
  get(x, y) {
    const index = (y % 4) * 4 + (x % 4);
    return this.matrix[index];
  }
}

export class BlueNoiseLUT {
  constructor() {
    // Pre-calculado usando void-and-cluster (8x8)
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


/**
 * Aplica ajustes de imagen (brillo, contraste, saturación, curvas) a un array de píxeles.
 * @param {Uint8ClampedArray} pixels - El array de píxeles del canvas.
 * @param {object} config - La configuración de ajustes del estado.
 */
export function applyImageAdjustments(pixels, config) {
  const { brightness, contrast, saturation, curvesLUTs } = config;

  const hasBasicAdjustments = brightness !== 0 || contrast !== 1.0 || saturation !== 1.0;
  const hasCurves = curvesLUTs && (curvesLUTs.rgb || curvesLUTs.r || curvesLUTs.g || curvesLUTs.b);
  
  if (!hasBasicAdjustments && !hasCurves) {
      return;
  }

  for (let i = 0; i < pixels.length; i += 4) {
      let r = pixels[i];
      let g = pixels[i + 1];
      let b = pixels[i + 2];

      // 1. Contraste y Brillo
      if (hasBasicAdjustments) {
        r = (r - 127.5) * contrast + 127.5 + brightness;
        g = (g - 127.5) * contrast + 127.5 + brightness;
        b = (b - 127.5) * contrast + 127.5 + brightness;

        // 2. Saturación
        if (saturation !== 1.0) {
            const luma = r * 0.299 + g * 0.587 + b * 0.114;
            r = luma + (r - luma) * saturation;
            g = luma + (g - luma) * saturation;
            b = luma + (b - luma) * saturation;
        }
      }
      
      r = Math.max(0, Math.min(255, r));
      g = Math.max(0, Math.min(255, g));
      b = Math.max(0, Math.min(255, b));
      
      // 3. Curvas
      if (hasCurves) {
        if (curvesLUTs.rgb) {
          r = curvesLUTs.rgb[Math.round(r)];
          g = curvesLUTs.rgb[Math.round(g)];
          b = curvesLUTs.rgb[Math.round(b)];
        }
        if (curvesLUTs.r) r = curvesLUTs.r[Math.round(r)];
        if (curvesLUTs.g) g = curvesLUTs.g[Math.round(g)];
        if (curvesLUTs.b) b = curvesLUTs.b[Math.round(b)];
      }
      
      pixels[i] = Math.max(0, Math.min(255, r));
      pixels[i + 1] = Math.max(0, Math.min(255, g));
      pixels[i + 2] = Math.max(0, Math.min(255, b));
  }
}