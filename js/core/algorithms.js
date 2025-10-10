/**
 * ============================================================================
 * DitherLab v7 - Algoritmos de Dithering (VERSIÓN MEJORADA)
 * ============================================================================
 * - Contiene la lógica central para el procesamiento de píxeles.
 * - Incluye la aplicación de ajustes de imagen y las implementaciones
 * de los diferentes algoritmos de dithering.
 * ============================================================================
 */
import { KERNELS } from './constants.js';
import { BlueNoiseLUT } from '../utils/optimizations.js';

/**
 * Aplica ajustes de Brillo, Contraste, Saturación y Curvas a un array de píxeles.
 * @param {Uint8ClampedArray} pixels - El array de píxeles del canvas (Ej: buffer.pixels).
 * @param {object} config - El objeto de configuración del estado de la aplicación.
 */
export function applyImageAdjustments(pixels, config) {
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
    const pw = buffer.width;
    const ph = buffer.height;

    buffer.image(src, 0, 0, pw, ph);
    buffer.loadPixels();

    const pixels = buffer.pixels;
    applyImageAdjustments(pixels, config);

    const len = pixels.length;
    const levels = config.colorCount;
    const step = 255 / (levels > 1 ? levels - 1 : 1);

    if (config.useOriginalColor) {
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
    const pw = buffer.width;
    const ph = buffer.height;

    buffer.image(src, 0, 0, pw, ph);
    buffer.loadPixels();

    const pix = buffer.pixels;
    applyImageAdjustments(pix, config);

    if (config.useOriginalColor) {
        // Lógica para dithering a color original
        const levels = config.colorCount;
        const step = 255 / (levels > 1 ? levels - 1 : 1);
        const kernel = KERNELS[config.effect];
        if (!kernel) return;

        for (let y = 0; y < ph; y++) {
            const isReversed = config.serpentineScan && y % 2 === 1;
            const xStart = isReversed ? pw - 1 : 0;
            const xEnd = isReversed ? -1 : pw;
            const xStep = isReversed ? -1 : 1;

            for (let x = xStart; x !== xEnd; x += xStep) {
                const i = (y * pw + x) * 4;
                const oldR = pix[i];
                const oldG = pix[i + 1];
                const oldB = pix[i + 2];

                const newR = Math.round(oldR / step) * step;
                const newG = Math.round(oldG / step) * step;
                const newB = Math.round(oldB / step) * step;

                pix[i] = newR;
                pix[i + 1] = newG;
                pix[i + 2] = newB;

                let errR = oldR - newR;
                let errG = oldG - newG;
                let errB = oldB - newB;
                
                // NUEVO: Aplicar Gamma de Error y Fuerza de Difusión
                const strength = config.diffusionStrength;
                const gamma = config.errorGamma;
                errR = Math.pow(Math.abs(errR / 255), gamma) * 255 * Math.sign(errR) * strength;
                errG = Math.pow(Math.abs(errG / 255), gamma) * 255 * Math.sign(errG) * strength;
                errB = Math.pow(Math.abs(errB / 255), gamma) * 255 * Math.sign(errB) * strength;

                for (const pt of kernel.points) {
                    const dx = isReversed ? -pt.dx : pt.dx;
                    const nx = x + dx;
                    const ny = y + pt.dy;

                    if (nx >= 0 && nx < pw && ny >= 0 && ny < ph) {
                        const ni = (ny * pw + nx) * 4;
                        const weight = pt.w / kernel.divisor;
                        pix[ni] += errR * weight;
                        pix[ni + 1] += errG * weight;
                        pix[ni + 2] += errB * weight;
                    }
                }
            }
        }
    } else {
        // Lógica para dithering a paleta (monocromo o color)
        if (config.effect === 'bayer') {
            const levels = config.colorCount;
            const baseStrength = 255 / levels;
            const ditherStrength = baseStrength * config.patternStrength * 2;

            for (let y = 0; y < ph; y++) {
                for (let x = 0; x < pw; x++) {
                    const i = (y * pw + x) * 4;
                    const luma = pix[i] * 0.299 + pix[i + 1] * 0.587 + pix[i + 2] * 0.114;
                    const ditherOffset = bayerLUT.get(x, y) * ditherStrength;

                    // NUEVO: Mezcla de Patrón
                    const mixRatio = config.patternMix;
                    const mixedLuma = luma * (1 - mixRatio) + (luma + ditherOffset) * mixRatio;
                    
                    const [r, g, b] = lumaLUT.map(mixedLuma);
                    pix[i] = r;
                    pix[i + 1] = g;
                    pix[i + 2] = b;
                }
            }
        } else {
            const kernel = KERNELS[config.effect];
            if (!kernel) return;
            
            // NUEVO: Buffer de Luminancia para optimización
            const lumaBuffer = new Float32Array(pw * ph);
            for (let i = 0, j = 0; i < pix.length; i += 4, j++) {
                lumaBuffer[j] = pix[i] * 0.299 + pix[i+1] * 0.587 + pix[i+2] * 0.114;
            }

            const levels = config.colorCount;
            const step = 255 / (levels > 1 ? levels - 1 : 1);
            
            for (let y = 0; y < ph; y++) {
                const isReversed = config.serpentineScan && y % 2 === 1;
                const xStart = isReversed ? pw - 1 : 0;
                const xEnd = isReversed ? -1 : pw;
                const xStep = isReversed ? -1 : 1;

                for (let x = xStart; x !== xEnd; x += xStep) {
                    const lumaIndex = y * pw + x;
                    const pixIndex = lumaIndex * 4;
                    
                    // NUEVO: Añadir ruido y leer del buffer de luminancia
                    const noise = (Math.random() * 2 - 1) * config.diffusionNoise;
                    const oldLuma = lumaBuffer[lumaIndex] + noise;
                    
                    const newLuma = Math.round(oldLuma / step) * step;
                    const [r, g, b] = lumaLUT.map(newLuma);

                    pix[pixIndex] = r;
                    pix[pixIndex + 1] = g;
                    pix[pixIndex + 2] = b;

                    let err = oldLuma - newLuma;
                    
                    // NUEVO: Aplicar Gamma de Error y Fuerza de Difusión
                    const strength = config.diffusionStrength;
                    const gamma = config.errorGamma;
                    const finalError = Math.pow(Math.abs(err / 255), gamma) * 255 * Math.sign(err) * strength;

                    for (const pt of kernel.points) {
                        const dx = isReversed ? -pt.dx : pt.dx;
                        const nx = x + dx;
                        const ny = y + pt.dy;

                        if (nx >= 0 && nx < pw && ny >= 0 && ny < ph) {
                            const neighborIndex = ny * pw + nx;
                            const weight = pt.w / kernel.divisor;
                            lumaBuffer[neighborIndex] += finalError * weight;
                        }
                    }
                }
            }
        }
    }
    buffer.updatePixels();
}


export function drawBlueNoise(p, buffer, src, config, lumaLUT, blueNoiseLUT) {
    const pw = buffer.width;
    const ph = buffer.height;
    
    buffer.image(src, 0, 0, pw, ph);
    buffer.loadPixels();
    
    const pix = buffer.pixels;
    applyImageAdjustments(pix, config);

    const levels = config.colorCount;
    const baseStrength = 255 / levels;
    const ditherStrength = baseStrength * config.patternStrength * 2;
    
    for (let y = 0; y < ph; y++) {
        for (let x = 0; x < pw; x++) {
            const i = (y * pw + x) * 4;
            const luma = pix[i] * 0.299 + pix[i + 1] * 0.587 + pix[i + 2] * 0.114;
            const ditherOffset = blueNoiseLUT.get(x, y) * ditherStrength;

            // NUEVO: Mezcla de Patrón
            const mixRatio = config.patternMix;
            const mixedLuma = luma * (1 - mixRatio) + (luma + ditherOffset) * mixRatio;

            const [r, g, b] = lumaLUT.map(mixedLuma);
            pix[i] = r;
            pix[i + 1] = g;
            pix[i + 2] = b;
        }
    }
    buffer.updatePixels();
}

// Las implementaciones de drawVariableError, drawOstromoukhovDither, drawRiemersmaDither, y drawHalftoneDither
// se mantienen igual, ya que las nuevas lógicas son más aplicables a los algoritmos básicos de difusión y ordenado.
// Si se desea, se podrían adaptar estas nuevas lógicas a ellos también.

export function drawVariableError(p, buffer, src, config, lumaLUT) {
    const pw = buffer.width;
    const ph = buffer.height;

    buffer.image(src, 0, 0, pw, ph);
    buffer.loadPixels();

    const pix = buffer.pixels;
    applyImageAdjustments(pix, config);

    const kernel = KERNELS['floyd-steinberg'];

    // Calcular gradientes para detectar bordes
    const gradients = new Float32Array(pw * ph);
    for (let y = 1; y < ph - 1; y++) {
        for (let x = 1; x < pw - 1; x++) {
            const i = (y * pw + x) * 4;
            const lumaCenter = pix[i] * 0.299 + pix[i+1] * 0.587 + pix[i+2] * 0.114;
            const lumaRight = pix[i+4] * 0.299 + pix[i+5] * 0.587 + pix[i+6] * 0.114;
            const lumaDown = pix[i + pw*4] * 0.299 + pix[i + pw*4 + 1] * 0.587 + pix[i + pw*4 + 2] * 0.114;
            const gx = Math.abs(lumaRight - lumaCenter);
            const gy = Math.abs(lumaDown - lumaCenter);
            gradients[y * pw + x] = (gx + gy) / 255;
        }
    }
      
    for (let y = 0; y < ph; y++) {
        for (let x = 0; x < pw; x++) {
            const i = (y * pw + x) * 4;
            const gradient = gradients[y * pw + x] || 0;
            // La fuerza de difusión disminuye en zonas de alto gradiente (bordes)
            const adaptiveStrength = config.diffusionStrength * (1 - gradient * 0.75);
            
            const oldLuma = pix[i] * 0.299 + pix[i + 1] * 0.587 + pix[i + 2] * 0.114;
            const step = 255 / (config.colorCount > 1 ? config.colorCount - 1 : 1);
            const newLuma = Math.round(oldLuma / step) * step;
            const [r, g, b] = lumaLUT.map(newLuma);
            
            pix[i] = r;
            pix[i + 1] = g;
            pix[i + 2] = b;
            
            const err = (oldLuma - newLuma) * adaptiveStrength;
            
            for (const pt of kernel.points) {
                const nx = x + pt.dx;
                const ny = y + pt.dy;
                
                if (nx >= 0 && nx < pw && ny >= 0 && ny < ph) {
                    const ni = (ny * pw + nx) * 4;
                    const weight = pt.w / kernel.divisor;
                    const adjustment = err * weight;
                    pix[ni] = Math.min(255, Math.max(0, pix[ni] + adjustment));
                    pix[ni + 1] = Math.min(255, Math.max(0, pix[ni + 1] + adjustment));
                    pix[ni + 2] = Math.min(255, Math.max(0, pix[ni + 2] + adjustment));
                }
            }
        }
    }
  
  buffer.updatePixels();
}

export function drawOstromoukhovDither(p, buffer, src, config, lumaLUT, blueNoiseLUT) {
    const pw = buffer.width;
    const ph = buffer.height;

    buffer.image(src, 0, 0, pw, ph);
    buffer.loadPixels();

    const pix = buffer.pixels;
    applyImageAdjustments(pix, config);

    const kernel = KERNELS['floyd-steinberg'];
    const levels = config.colorCount;
    const step = 255 / (levels > 1 ? levels - 1 : 1);

    for (let y = 0; y < ph; y++) {
        const isReversed = config.serpentineScan && y % 2 === 1;
        const xStart = isReversed ? pw - 1 : 0;
        const xEnd = isReversed ? -1 : pw;
        const xStep = isReversed ? -1 : 1;

        for (let x = xStart; x !== xEnd; x += xStep) {
            const i = (y * pw + x) * 4;
            const oldLuma = pix[i] * 0.299 + pix[i + 1] * 0.587 + pix[i + 2] * 0.114;
            
            // Umbral variable con ruido azul
            const noise = (blueNoiseLUT.get(x, y) + 0.5); // Ruido de 0 a 1
            const variableThreshold = step / 2 * (1 + (noise - 0.5) * 0.5);
            const newLuma = (oldLuma > variableThreshold) ? Math.ceil(oldLuma / step) * step : Math.floor(oldLuma / step) * step;

            const [r, g, b] = lumaLUT.map(Math.min(255, Math.max(0, newLuma)));
            
            pix[i] = r;
            pix[i + 1] = g;
            pix[i + 2] = b;

            const err = (oldLuma - newLuma) * config.diffusionStrength;

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
    buffer.updatePixels();
}

export function drawRiemersmaDither(p, buffer, src, config, lumaLUT) {
    const pw = buffer.width;
    const ph = buffer.height;

    buffer.image(src, 0, 0, pw, ph);
    buffer.loadPixels();

    const pix = buffer.pixels;
    applyImageAdjustments(pix, config);
    
    const gray = new Float32Array(pw * ph);
    for (let i = 0, j = 0; i < pix.length; i += 4, j++) {
        gray[j] = pix[i] * 0.299 + pix[i + 1] * 0.587 + pix[i + 2] * 0.114;
    }

    function d2xy(n, d) {
        let x = 0, y = 0;
        for (let s = 1; s < n; s *= 2) {
            const rx = 1 & (d >> 1);
            const ry = 1 & (d ^ rx);
            if (ry === 0) {
                if (rx === 1) {
                    x = s - 1 - x;
                    y = s - 1 - y;
                }
                [x, y] = [y, x];
            }
            x += s * rx;
            y += s * ry;
            d >>= 2;
        }
        return {x, y};
    }

    const side = Math.pow(2, Math.ceil(Math.log2(Math.max(pw, ph))));
    const errorHistory = new Float32Array(16).fill(0);
    
    for (let i = 0; i < side * side; i++) {
        const {x, y} = d2xy(side, i);
        if (x >= pw || y >= ph) continue;

        const idx = y * pw + x;
        const originalValue = gray[idx];
        
        let totalError = 0;
        totalError += errorHistory[0] * (1/2);
        totalError += errorHistory[1] * (1/4);
        totalError += errorHistory[3] * (1/8);
        totalError += errorHistory[7] * (1/16);

        const currentValue = originalValue + totalError * config.diffusionStrength;
        
        const step = 255 / (config.colorCount > 1 ? config.colorCount - 1 : 1);
        const newValue = Math.round(currentValue / step) * step;
        const error = currentValue - newValue;
        
        errorHistory.copyWithin(1, 0);
        errorHistory[0] = error;

        const [r, g, b] = lumaLUT.map(newValue);
        const pixIdx = idx * 4;
        pix[pixIdx] = r;
        pix[pixIdx + 1] = g;
        pix[pixIdx + 2] = b;
    }

    buffer.updatePixels();
}

export function drawHalftoneDither(p, buffer, src, config) {
    const pw = buffer.width;
    const ph = buffer.height;

    const tempBuffer = p.createGraphics(pw, ph);
    tempBuffer.pixelDensity(1);
    tempBuffer.image(src, 0, 0, pw, ph);
    tempBuffer.loadPixels();
    applyImageAdjustments(tempBuffer.pixels, config);

    buffer.background(255);
    buffer.noStroke();
    buffer.fill(0);

    const cellSize = config.halftoneSize;
    const k = cellSize / 255;
    const tempPixels = tempBuffer.pixels;

    for (let y = 0; y < ph; y += cellSize) {
        for (let x = 0; x < pw; x += cellSize) {
            
            let totalLuma = 0;
            let pixelCount = 0;
            for (let j = 0; j < cellSize; j++) {
                for (let i = 0; i < cellSize; i++) {
                    const px = x + i;
                    const py = y + j;
                    if (px < pw && py < ph) {
                        const pixIndex = (py * pw + px) * 4;
                        const r = tempPixels[pixIndex];
                        const g = tempPixels[pixIndex + 1];
                        const b = tempPixels[pixIndex + 2];
                        totalLuma += (r * 0.299 + g * 0.587 + b * 0.114);
                        pixelCount++;
                    }
                }
            }
            const avgLuma = pixelCount > 0 ? totalLuma / pixelCount : 0;

            const dotSize = (255 - avgLuma) * k;
            buffer.ellipse(x + cellSize / 2, y + cellSize / 2, dotSize, dotSize);
        }
    }
    tempBuffer.remove();
}
