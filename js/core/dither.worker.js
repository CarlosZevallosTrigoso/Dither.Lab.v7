/**
 * ============================================================================
 * DitherLab v7 - Dithering Web Worker (VERSIÓN CON LÓGICA DE COLOR CORREGIDA)
 * ============================================================================
 * - Reescrita la lógica para 'useOriginalColor' para que aplique la difusión
 * de error a cada canal de color (R, G, B) correctamente.
 * - Asegura que todos los algoritmos se comporten como se espera con dicha opción.
 * ============================================================================
 */

// KERNELS y constantes necesarios para los algoritmos
const KERNELS = {
  'floyd-steinberg': { divisor: 16, points: [{ dx: 1, dy: 0, w: 7 }, { dx: -1, dy: 1, w: 3 }, { dx: 0, dy: 1, w: 5 }, { dx: 1, dy: 1, w: 1 }] },
  'atkinson': { divisor: 8, points: [{ dx: 1, dy: 0, w: 1 }, { dx: 2, dy: 0, w: 1 }, { dx: -1, dy: 1, w: 1 }, { dx: 0, dy: 1, w: 1 }, { dx: 1, dy: 1, w: 1 }, { dx: 0, dy: 2, w: 1 }] },
  'stucki': { divisor: 42, points: [{ dx: 1, dy: 0, w: 8 }, { dx: 2, dy: 0, w: 4 }, { dx: -2, dy: 1, w: 2 }, { dx: -1, dy: 1, w: 4 }, { dx: 0, dy: 1, w: 8 }, { dx: 1, dy: 1, w: 4 }, { dx: 2, dy: 1, w: 2 }, { dx: -2, dy: 2, w: 1 }, { dx: -1, dy: 2, w: 2 }, { dx: 0, dy: 2, w: 4 }, { dx: 1, dy: 2, w: 2 }, { dx: 2, dy: 2, w: 1 }] },
  'jarvis-judice-ninke': { divisor: 48, points: [{ dx: 1, dy: 0, w: 7 }, { dx: 2, dy: 0, w: 5 }, { dx: -2, dy: 1, w: 3 }, { dx: -1, dy: 1, w: 5 }, { dx: 0, dy: 1, w: 7 }, { dx: 1, dy: 1, w: 5 }, { dx: 2, dy: 1, w: 3 }, { dx: -2, dy: 2, w: 1 }, { dx: -1, dy: 2, w: 3 }, { dx: 0, dy: 2, w: 5 }, { dx: 1, dy: 2, w: 3 }, { dx: 2, dy: 2, w: 1 }] },
  'sierra': { divisor: 32, points: [{ dx: 1, dy: 0, w: 5 }, { dx: 2, dy: 0, w: 3 }, { dx: -2, dy: 1, w: 2 }, { dx: -1, dy: 1, w: 4 }, { dx: 0, dy: 1, w: 5 }, { dx: 1, dy: 1, w: 4 }, { dx: 2, dy: 1, w: 2 }, { dx: -1, dy: 2, w: 2 }, { dx: 0, dy: 2, w: 3 }, { dx: 1, dy: 2, w: 2 }] },
  'two-row-sierra': { divisor: 16, points: [{ dx: 1, dy: 0, w: 4 }, { dx: 2, dy: 0, w: 3 }, { dx: -2, dy: 1, w: 1 }, { dx: -1, dy: 1, w: 2 }, { dx: 0, dy: 1, w: 3 }, { dx: 1, dy: 1, w: 2 }, { dx: 2, dy: 1, w: 1 }] },
  'sierra-lite': { divisor: 4, points: [{ dx: 1, dy: 0, w: 2 }, { dx: -1, dy: 1, w: 1 }, { dx: 0, dy: 1, w: 1 }] },
  'burkes': { divisor: 32, points: [{ dx: 1, dy: 0, w: 8 }, { dx: 2, dy: 0, w: 4 }, { dx: -2, dy: 1, w: 2 }, { dx: -1, dy: 1, w: 4 }, { dx: 0, dy: 1, w: 8 }, { dx: 1, dy: 1, w: 4 }, { dx: 2, dy: 1, w: 2 }] }
};

const BAYER_4x4 = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
const bayerMatrix = new Float32Array(16);
for (let i = 0; i < 16; i++) {
    bayerMatrix[i] = (BAYER_4x4[Math.floor(i / 4)][i % 4] / 16.0 - 0.5);
}

function mapLuma(luma, lumaLUT) {
    const index = Math.max(0, Math.min(Math.floor(luma), 255));
    const pos = index * 3;
    return [lumaLUT[pos], lumaLUT[pos + 1], lumaLUT[pos + 2]];
}

function drawPosterize(pixels, config) {
    const len = pixels.length;
    const levels = config.colorCount;
    const step = 255 / (levels > 1 ? levels - 1 : 1);

    for (let i = 0; i < len; i += 4) {
        pixels[i] = Math.round(pixels[i] / step) * step;
        pixels[i+1] = Math.round(pixels[i+1] / step) * step;
        pixels[i+2] = Math.round(pixels[i+2] / step) * step;
    }
}

function drawDither(pix, config, lumaLUT, pw, ph) {
    const kernel = KERNELS[config.effect];
    const isBayer = config.effect === 'bayer';
    if (!kernel && !isBayer) return;

    const levels = config.colorCount;
    const step = 255 / (levels > 1 ? levels - 1 : 1);

    if (config.useOriginalColor) {
        // ========= LÓGICA DE COLOR ORIGINAL COMPLETAMENTE REESCRITA =========
        const colorBuffer = new Float32Array(pix); // Usamos un buffer flotante para la precisión del error

        for (let y = 0; y < ph; y++) {
            const isReversed = config.serpentineScan && y % 2 === 1;
            const xStart = isReversed ? pw - 1 : 0;
            const xEnd = isReversed ? -1 : pw;
            const xStep = isReversed ? -1 : 1;

            for (let x = xStart; x !== xEnd; x += xStep) {
                const i = (y * pw + x) * 4;

                // Obtener el color actual (con el error acumulado)
                const oldR = colorBuffer[i];
                const oldG = colorBuffer[i + 1];
                const oldB = colorBuffer[i + 2];

                // Cuantizar cada canal para encontrar el color más cercano en la paleta implícita
                const newR = Math.round(oldR / step) * step;
                const newG = Math.round(oldG / step) * step;
                const newB = Math.round(oldB / step) * step;

                // Actualizar el píxel en la imagen final
                pix[i] = newR;
                pix[i + 1] = newG;
                pix[i + 2] = newB;

                // Si no es un algoritmo de difusión, no calculamos ni esparcimos el error
                if (isBayer) continue;

                // Calcular el error para cada canal
                const errR = oldR - newR;
                const errG = oldG - newG;
                const errB = oldB - newB;

                // Distribuir el error a los píxeles vecinos
                for (const pt of kernel.points) {
                    const dx = isReversed ? -pt.dx : pt.dx;
                    const nx = x + dx;
                    const ny = y + pt.dy;

                    if (nx >= 0 && nx < pw && ny >= 0 && ny < ph) {
                        const ni = (ny * pw + nx) * 4;
                        const w = (pt.w / kernel.divisor) * config.diffusionStrength;
                        colorBuffer[ni]     += errR * w;
                        colorBuffer[ni + 1] += errG * w;
                        colorBuffer[ni + 2] += errB * w;
                    }
                }
            }
        }
    } else {
        // --- Lógica para paleta de colores (sin cambios, ya funcionaba) ---
        if (isBayer) {
            const baseStrength = 255 / levels;
            const ditherStrength = baseStrength * config.patternStrength * 2;
            for (let y = 0; y < ph; y++) {
                for (let x = 0; x < pw; x++) {
                    const i = (y * pw + x) * 4;
                    const luma = pix[i] * 0.299 + pix[i + 1] * 0.587 + pix[i + 2] * 0.114;
                    const ditherOffset = bayerMatrix[(y % 4) * 4 + (x % 4)] * ditherStrength;
                    const mixedLuma = luma * (1 - config.patternMix) + (luma + ditherOffset) * config.patternMix;
                    const [r, g, b] = mapLuma(mixedLuma, lumaLUT);
                    pix[i] = r; pix[i + 1] = g; pix[i + 2] = b;
                }
            }
        } else {
            const lumaBuffer = new Float32Array(pw * ph);
            for (let i = 0, j = 0; i < pix.length; i += 4, j++) {
                lumaBuffer[j] = pix[i] * 0.299 + pix[i+1] * 0.587 + pix[i+2] * 0.114;
            }

            for (let y = 0; y < ph; y++) {
                const isReversed = config.serpentineScan && y % 2 === 1;
                const xStart = isReversed ? pw - 1 : 0;
                const xEnd = isReversed ? -1 : pw;
                const xStep = isReversed ? -1 : 1;
                for (let x = xStart; x !== xEnd; x += xStep) {
                    const lumaIndex = y * pw + x;
                    const pixIndex = lumaIndex * 4;
                    const noise = (Math.random() * 2 - 1) * config.diffusionNoise;
                    const oldLuma = lumaBuffer[lumaIndex] + noise;
                    const newLuma = Math.round(oldLuma / step) * step;
                    const [r, g, b] = mapLuma(newLuma, lumaLUT);
                    pix[pixIndex] = r; pix[pixIndex + 1] = g; pix[pixIndex + 2] = b;
                    let err = oldLuma - newLuma;
                    const strength = config.diffusionStrength;
                    const gamma = config.errorGamma;
                    const finalError = Math.pow(Math.abs(err / 255), gamma) * 255 * Math.sign(err) * strength;
                    for (const pt of kernel.points) {
                        const dx = isReversed ? -pt.dx : pt.dx;
                        const nx = x + dx, ny = y + pt.dy;
                        if (nx >= 0 && nx < pw && ny >= 0 && ny < ph) {
                            lumaBuffer[ny * pw + nx] += finalError * (pt.w / kernel.divisor);
                        }
                    }
                }
            }
        }
    }
}

self.onmessage = function(e) {
    const { imageData, config, lumaLUT, pw, ph } = e.data;
    const pixels = imageData.data;

    if (config.effect === 'posterize') {
        // Posterize no usa lumaLUT si es a color original, por eso se llama aparte.
        drawPosterize(pixels, config);
    } else {
        drawDither(pixels, config, lumaLUT, pw, ph);
    }

    self.postMessage(imageData, [imageData.data.buffer]);
};
