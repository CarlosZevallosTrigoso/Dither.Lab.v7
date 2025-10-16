/**
 * variable-error.js
 * Implementación del algoritmo de dithering adaptativo "Variable Error".
 */
import { KERNELS } from '../../utils/constants.js';

/**
 * Aplica el dithering adaptativo a un array de píxeles.
 * @param {Uint8ClampedArray} pixels - El array de píxeles del canvas.
 * @param {number} w - El ancho de la imagen.
 * @param {number} h - La altura de la imagen.
 * @param {object} config - El objeto de configuración del estado.
 * @param {object} utils - Un objeto con utilidades necesarias (LumaLUT, etc.).
 */
export function applyVariableError(pixels, w, h, config, utils) {
  const { lumaLUT } = utils;
  const { diffusionStrength, colorCount } = config;
  const kernel = KERNELS['floyd-steinberg']; // Usa un kernel base

  // 1. Calcular gradientes para detectar bordes
  const gradients = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4;
      const lumaCenter = pixels[i] * 0.299 + pixels[i+1] * 0.587 + pixels[i+2] * 0.114;
      const lumaRight = pixels[i+4] * 0.299 + pixels[i+5] * 0.587 + pixels[i+6] * 0.114;
      const lumaDown = pixels[i + w * 4] * 0.299 + pixels[i + w * 4 + 1] * 0.587 + pixels[i + w * 4 + 2] * 0.114;
      
      const gx = Math.abs(lumaRight - lumaCenter);
      const gy = Math.abs(lumaDown - lumaCenter);
      gradients[y * w + x] = Math.sqrt(gx * gx + gy * gy) / 255;
    }
  }

  // 2. Aplicar difusión de error con fuerza adaptativa
  const levels = colorCount > 1 ? colorCount - 1 : 1;
  const step = 255 / levels;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const gradient = gradients[y * w + x] || 0;
      // En áreas con bordes (gradiente alto), la difusión es menor.
      const adaptiveStrength = diffusionStrength * (1 - gradient * 0.75);
      
      const oldLuma = pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114;
      const newLuma = Math.round(oldLuma / step) * step;
      const [r, g, b] = lumaLUT.map(newLuma);
      
      pixels[i] = r;
      pixels[i + 1] = g;
      pixels[i + 2] = b;
      
      const error = (oldLuma - newLuma) * adaptiveStrength;
      
      for (const pt of kernel.points) {
        const nx = x + pt.dx;
        const ny = y + pt.dy;
        
        if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
          const ni = (ny * w + nx) * 4;
          const weight = pt.w / kernel.divisor;
          const adjustment = error * weight;
          pixels[ni]     = Math.min(255, Math.max(0, pixels[ni]     + adjustment));
          pixels[ni + 1] = Math.min(255, Math.max(0, pixels[ni + 1] + adjustment));
          pixels[ni + 2] = Math.min(255, Math.max(0, pixels[ni + 2] + adjustment));
        }
      }
    }
  }
}