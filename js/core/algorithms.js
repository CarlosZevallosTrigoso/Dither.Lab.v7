/**
 * ============================================================================
 * DitherLab v7 - Algoritmos de Dithering
 * ============================================================================
 * - Contiene la lógica central para el procesamiento de píxeles.
 * - Incluye la aplicación de ajustes de imagen y las implementaciones
 * de los diferentes algoritmos de dithering.
 * ============================================================================
 */
import { KERNELS } from './constants.js';

/**
 * Aplica ajustes de Brillo, Contraste, Saturación y Curvas a un array de píxeles.
 * @param {Uint8ClampedArray} pixels - El array de píxeles del canvas (Ej: buffer.pixels).
 * @param {object} config - El objeto de configuración del estado de la aplicación.
 */
function applyImageAdjustments(pixels, config) {
    const { brightness, contrast, saturation, curvesLUTs } = config;

    const hasBasicAdjustments = brightness !== 0 || contrast !== 1.0 || saturation !== 1.0;
    const hasCurves = curvesLUTs && (curvesLUTs.rgb || curvesLUTs.r || curvesLUTs.g || curvesLUTs.b);
    
    if (!hasBasicAdjustments && !hasCurves) {
        return; // No hay nada que hacer, salimos para optimizar
    }

    const len = pixels.length;
    for (let i = 0; i < len; i += 4) {
        let r = pixels[i];
        let g = pixels[i + 1];
        let b = pixels[i + 2];

        // 1. Ajustes básicos
        if (hasBasicAdjustments) {
          r = (r - 127.5) * contrast + 127.5 + brightness;
          g = (g - 127.5) * contrast + 127.5 + brightness;
          b = (b - 127.5) * contrast + 127.5 + brightness;

          if (saturation !== 1.0) {
              const luma = r * 0.299 + g * 0.587 + b * 0.114;
              r = luma + (r - luma) * saturation;
              g = luma + (g - luma) * saturation;
              b = luma + (b - luma) * saturation;
          }
        }
        
        // Clamp (asegurar que los valores estén entre 0 y 255)
        r = Math.max(0, Math.min(255, r));
        g = Math.max(0, Math.min(255, g));
        b = Math.max(0, Math.min(255, b));
        
        // 2. Aplicar Curvas
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


export function drawPosterize(p, buffer, src, config, lumaLUT) {
  const { ditherScale, useOriginalColor } = config;
  const pw = buffer.width;
  const ph = buffer.height;
  
  buffer.image(src, 0, 0, pw, ph);
  buffer.loadPixels();
  
  const pixels = buffer.pixels;
  applyImageAdjustments(pixels, config);
  
  const len = pixels.length;

  if (useOriginalColor) {
    const levels = 4;
    const step = 255 / (levels - 1);
    for (let i = 0; i < len; i += 4) {
      pixels[i] = Math.round(pixels[i] / step) * step;
      pixels[i + 1] = Math.round(pixels[i + 1] / step) * step;
      pixels[i + 2] = Math.round(pixels[i + 2] / step) * step;
    }
  } else {
    for (let i = 0; i < len; i += 4) {
      const luma = pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114;
      const [r, g, b] = lumaLUT.map(luma);
      pixels[i] = r;
      pixels[i + 1] = g;
      pixels[i + 2] = b;
    }
  }
  
  buffer.updatePixels();
}

export function drawDither(p, buffer, src, config, lumaLUT, bayerLUT) {
  const { effect, serpentineScan, diffusionStrength, patternStrength, colorCount } = config;
  const pw = buffer.width;
  const ph = buffer.height;
  
  buffer.image(src, 0, 0, pw, ph);
  buffer.loadPixels();
  
  const pix = buffer.pixels;
  applyImageAdjustments(pix, config);

  if (effect === 'bayer') {
    const levels = colorCount;
    const baseStrength = 255 / levels;
    const ditherStrength = baseStrength * patternStrength * 2;
    
    for (let y = 0; y < ph; y++) {
      for (let x = 0; x < pw; x++) {
        const i = (y * pw + x) * 4;
        const ditherOffset = bayerLUT.get(x, y) * ditherStrength;
        const luma = pix[i] * 0.299 + pix[i + 1] * 0.587 + pix[i + 2] * 0.114;
        const adjustedLuma = Math.min(255, Math.max(0, luma + ditherOffset));
        const [r, g, b] = lumaLUT.map(adjustedLuma);
        pix[i] = r;
        pix[i + 1] = g;
        pix[i + 2] = b;
      }
    }
  } else {
    const kernel = KERNELS[effect];
    if (!kernel) return; // Algoritmo de difusión de error no encontrado
    
    const levels = colorCount;
    const step = 255 / (levels > 1 ? levels - 1 : 1);
    
    for (let y = 0; y < ph; y++) {
      const isReversed = serpentineScan && y % 2 === 1;
      const xStart = isReversed ? pw - 1 : 0;
      const xEnd = isReversed ? -1 : pw;
      const xStep = isReversed ? -1 : 1;
      
      for (let x = xStart; x !== xEnd; x += xStep) {
        const i = (y * pw + x) * 4;
        const oldLuma = pix[i] * 0.299 + pix[i + 1] * 0.587 + pix[i + 2] * 0.114;
        const newLuma = Math.round(oldLuma / step) * step;
        const [r, g, b] = lumaLUT.map(newLuma);
        
        pix[i] = r;
        pix[i + 1] = g;
        pix[i + 2] = b;
        
        const err = (oldLuma - newLuma) * diffusionStrength;
        
        for (const pt of kernel.points) {
          const dx = isReversed ? -pt.dx : pt.dx;
          const nx = x + dx;
          const ny = y + pt.dy;
          
          if (nx >= 0 && nx < pw && ny >= 0 && ny < ph) {
            const ni = (ny * pw + nx) * 4;
            const weight = pt.w / kernel.divisor;
            const adjustment = err * weight;
            pix[ni] += adjustment;
            pix[ni + 1] += adjustment;
            pix[ni + 2] += adjustment;
          }
        }
      }
    }
  }
  
  buffer.updatePixels();
}

export function drawBlueNoise(p, buffer, src, config, lumaLUT, blueNoiseLUT) {
    // Implementación similar a bayer, pero usando blueNoiseLUT
    // ... (código extraído del original algorithms.js)
}

export function drawVariableError(p, buffer, src, config, lumaLUT) {
    // ... (código extraído del original algorithms.js)
}