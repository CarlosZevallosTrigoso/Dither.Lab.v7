// src/core/imageAdjustments.js

/**
 * Aplica ajustes de brillo, contraste, saturación y curvas a un array de píxeles.
 * @param {Uint8ClampedArray} pixels - El array de píxeles del canvas (ej: buffer.pixels).
 * @param {object} config - El objeto de configuración del estado que contiene los ajustes.
 */
export function applyImageAdjustments(pixels, config) {
    const { brightness, contrast, saturation, curvesLUTs } = config;
    const hasBasicAdjustments = brightness !== 0 || contrast !== 1.0 || saturation !== 1.0;
    const hasCurves = curvesLUTs && (curvesLUTs.rgb || curvesLUTs.r || curvesLUTs.g || curvesLUTs.b);
    
    if (!hasBasicAdjustments && !hasCurves) {
        return; // No hacer nada si no hay ajustes que aplicar
    }

    for (let i = 0; i < pixels.length; i += 4) {
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
        
        // Clamp antes de aplicar curvas
        r = Math.max(0, Math.min(255, r));
        g = Math.max(0, Math.min(255, g));
        b = Math.max(0, Math.min(255, b));
        
        // 2. Aplicar Curvas
        if (hasCurves) {
          if (curvesLUTs.rgb) { r = curvesLUTs.rgb[Math.round(r)]; g = curvesLUTs.rgb[Math.round(g)]; b = curvesLUTs.rgb[Math.round(b)]; }
          if (curvesLUTs.r) r = curvesLUTs.r[Math.round(r)];
          if (curvesLUTs.g) g = curvesLUTs.g[Math.round(g)];
          if (curvesLUTs.b) b = curvesLUTs.b[Math.round(b)];
        }
        
        pixels[i] = Math.max(0, Math.min(255, r));
        pixels[i + 1] = Math.max(0, Math.min(255, g));
        pixels[i + 2] = Math.max(0, Math.min(255, b));
    }
}
