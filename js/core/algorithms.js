/**
 * ============================================================================
 * DitherLab v7 - Módulo de Algoritmos (Refactorizado para Worker)
 * ============================================================================
 * - Se ha movido toda la lógica de dithering principal al Web Worker.
 * - Este archivo ahora solo contiene la lógica para aplicar los ajustes de
 * imagen (brillo, contraste, curvas, nitidez) en el hilo principal
 * antes de enviar los datos al worker.
 * ============================================================================
 */

/**
 * Aplica un filtro de nitidez (sharpen) a un array de píxeles.
 */
function applySharpening(pixels, width, height, strength) {
    if (strength <= 0) return;
    const kernel = [[0, -1, 0], [-1, 5, -1], [0, -1, 0]];
    const src = new Uint8ClampedArray(pixels);
    const len = pixels.length;
    for (let i = 0; i < len; i += 4) {
        const x = (i / 4) % width;
        const y = Math.floor((i / 4) / width);
        if (x > 0 && x < width - 1 && y > 0 && y < height - 1) {
            let sumR = 0, sumG = 0, sumB = 0;
            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    const idx = ((y + ky) * width + (x + kx)) * 4;
                    const weight = kernel[ky + 1][kx + 1];
                    sumR += src[idx] * weight;
                    sumG += src[idx + 1] * weight;
                    sumB += src[idx + 2] * weight;
                }
            }
            const originalR = src[i];
            const originalG = src[i + 1];
            const originalB = src[i + 2];
            pixels[i] = originalR * (1 - strength) + sumR * strength;
            pixels[i + 1] = originalG * (1 - strength) + sumG * strength;
            pixels[i + 2] = originalB * (1 - strength) + sumB * strength;
        }
    }
}

/**
 * Aplica todos los ajustes de imagen a un array de píxeles.
 * @param {Uint8ClampedArray} pixels - El array de píxeles del canvas.
 * @param {object} config - El objeto de configuración de la aplicación.
 * @param {number} width - El ancho del buffer de píxeles.
 * @param {number} height - El alto del buffer de píxeles.
 */
export function applyImageAdjustments(pixels, config, width, height) {
    if (config.sharpeningStrength > 0) {
        applySharpening(pixels, width, height, config.sharpeningStrength);
    }
    const { brightness, contrast, saturation, curvesLUTs } = config;
    const hasBasicAdjustments = brightness !== 0 || contrast !== 1.0 || saturation !== 1.0;
    const hasCurves = curvesLUTs && (curvesLUTs.rgb || curvesLUTs.r || curvesLUTs.g || curvesLUTs.b);
    if (!hasBasicAdjustments && !hasCurves) return;

    const len = pixels.length;
    for (let i = 0; i < len; i += 4) {
        let r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
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
            r = Math.max(0, Math.min(255, r));
            g = Math.max(0, Math.min(255, g));
            b = Math.max(0, Math.min(255, b));
        }
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
        pixels[i] = r;
        pixels[i + 1] = g;
        pixels[i + 2] = b;
    }
}
