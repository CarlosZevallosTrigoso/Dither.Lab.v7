/**
 * ============================================================================
 * DitherLab v7 - Web Worker para Dithering (VERSIÓN CORREGIDA Y AMPLIADA)
 * ============================================================================
 * - Contiene toda la lógica de procesamiento para los algoritmos de dithering.
 * - Incluye las implementaciones de Difusión de Error, Dithering Ordenado
 * (Bayer, Blue Noise) y Variable Error, adaptadas de la v6.
 * ============================================================================
 */

// --- KERNELS Y CONSTANTES (Internalizadas para que el worker sea autónomo) ---

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

const BAYER_4x4_THRESHOLD = [
    [0, 8, 2, 10], [12, 4, 14, 6],
    [3, 11, 1, 9], [15, 7, 13, 5]
].flat().map(v => (v / 16.0) - 0.5);

const BLUE_NOISE_8x8_THRESHOLD = new Float32Array([
    0.53, 0.18, 0.71, 0.41, 0.94, 0.24, 0.82, 0.47,
    0.12, 0.65, 0.29, 0.88, 0.06, 0.59, 0.35, 0.76,
    0.76, 0.35, 0.94, 0.18, 0.71, 0.12, 0.88, 0.24,
    0.24, 0.82, 0.47, 0.65, 0.29, 0.94, 0.41, 0.59,
    0.88, 0.06, 0.71, 0.35, 0.82, 0.18, 0.65, 0.12,
    0.41, 0.59, 0.12, 0.76, 0.24, 0.47, 0.94, 0.29,
    0.65, 0.29, 0.88, 0.06, 0.59, 0.71, 0.35, 0.82,
    0.18, 0.94, 0.24, 0.53, 0.12, 0.76, 0.47, 0.41
]).map(v => v - 0.5);

// --- FUNCIONES AUXILIARES ---

function findClosestColor(r, g, b, lumaLUT) {
    const luma = Math.round(r * 0.299 + g * 0.587 + b * 0.114);
    const index = Math.max(0, Math.min(luma, 255));
    const pos = index * 3;
    return [lumaLUT[pos], lumaLUT[pos + 1], lumaLUT[pos + 2]];
}

// --- LÓGICA DE ALGORITMOS ---

function applyPosterize(pixels, lumaLUT) {
    for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
        const [newR, newG, newB] = findClosestColor(r, g, b, lumaLUT);
        pixels[i] = newR;
        pixels[i + 1] = newG;
        pixels[i + 2] = newB;
    }
}

function applyErrorDiffusion(pixels, pw, ph, config, lumaLUT) {
    const kernel = KERNELS[config.effect];
    if (!kernel) return;

    const strength = config.diffusionStrength;
    const serpentine = config.serpentineScan;
    let dir = 1;

    for (let y = 0; y < ph; y++) {
        const yStart = dir === 1 ? 0 : pw - 1;
        const yEnd = dir === 1 ? pw : -1;

        for (let x = yStart; x !== yEnd; x += dir) {
            const i = (y * pw + x) * 4;
            const oldR = pixels[i], oldG = pixels[i+1], oldB = pixels[i+2];

            const [newR, newG, newB] = findClosestColor(oldR, oldG, oldB, lumaLUT);
            pixels[i] = newR;
            pixels[i+1] = newG;
            pixels[i+2] = newB;

            const errR = (oldR - newR) * strength;
            const errG = (oldG - newG) * strength;
            const errB = (oldB - newB) * strength;

            for (const p of kernel.points) {
                const nx = x + p.dx * dir;
                const ny = y + p.dy;
                if (nx >= 0 && nx < pw && ny >= 0 && ny < ph) {
                    const ni = (ny * pw + nx) * 4;
                    const weight = p.w / kernel.divisor;
                    pixels[ni]   += errR * weight;
                    pixels[ni+1] += errG * weight;
                    pixels[ni+2] += errB * weight;
                }
            }
        }
        if (serpentine) dir *= -1;
    }
}

function applyOrderedDither(pixels, pw, ph, config, lumaLUT, thresholdMatrix) {
    const strength = config.patternStrength;
    const matrixSize = Math.sqrt(thresholdMatrix.length);

    for (let y = 0; y < ph; y++) {
        for (let x = 0; x < pw; x++) {
            const i = (y * pw + x) * 4;
            let r = pixels[i], g = pixels[i+1], b = pixels[i+2];

            const threshold = thresholdMatrix[(y % matrixSize) * matrixSize + (x % matrixSize)];
            const offset = threshold * 255 * strength;
            
            r += offset;
            g += offset;
            b += offset;

            const [newR, newG, newB] = findClosestColor(r, g, b, lumaLUT);
            pixels[i] = newR;
            pixels[i+1] = newG;
            pixels[i+2] = newB;
        }
    }
}

function applyVariableError(pixels, pw, ph, config, lumaLUT) {
    const kernel = KERNELS['floyd-steinberg'];
    const gradients = new Float32Array(pw * ph);

    // 1. Calcular gradientes para detectar bordes
    for (let y = 1; y < ph - 1; y++) {
        for (let x = 1; x < pw - 1; x++) {
            const i = (y * pw + x) * 4;
            const gx = Math.abs(pixels[i + 4] - pixels[i - 4]);
            const gy = Math.abs(pixels[i + (pw * 4)] - pixels[i - (pw * 4)]);
            gradients[y * pw + x] = Math.sqrt(gx * gx + gy * gy) / 255;
        }
    }

    // 2. Aplicar difusión con fuerza adaptativa
    for (let y = 0; y < ph; y++) {
        for (let x = 0; x < pw; x++) {
            const i = (y * pw + x) * 4;
            const gradient = gradients[y * pw + x] || 0;
            const adaptiveStrength = config.diffusionStrength * (1 - gradient * 0.75); // Reducir difusión en bordes

            const oldR = pixels[i], oldG = pixels[i+1], oldB = pixels[i+2];
            const [newR, newG, newB] = findClosestColor(oldR, oldG, oldB, lumaLUT);
            pixels[i] = newR;
            pixels[i+1] = newG;
            pixels[i+2] = newB;

            const errR = (oldR - newR) * adaptiveStrength;
            const errG = (oldG - newG) * adaptiveStrength;
            const errB = (oldB - newB) * adaptiveStrength;

            for (const p of kernel.points) {
                const nx = x + p.dx;
                const ny = y + p.dy;
                if (nx >= 0 && nx < pw && ny >= 0 && ny < ph) {
                    const ni = (ny * pw + nx) * 4;
                    const weight = p.w / kernel.divisor;
                    pixels[ni]   += errR * weight;
                    pixels[ni+1] += errG * weight;
                    pixels[ni+2] += errB * weight;
                }
            }
        }
    }
}

// --- EVENT LISTENER DEL WORKER ---

self.onmessage = (e) => {
    const { imageData, config, lumaLUT, pw, ph } = e.data;
    const pixels = imageData.data;

    // Lógica principal de selección de algoritmo
    if (KERNELS[config.effect]) {
        applyErrorDiffusion(pixels, pw, ph, config, lumaLUT);
    } else if (config.effect === 'bayer') {
        applyOrderedDither(pixels, pw, ph, config, lumaLUT, BAYER_4x4_THRESHOLD);
    } else if (config.effect === 'blue-noise') {
        applyOrderedDither(pixels, pw, ph, config, lumaLUT, BLUE_NOISE_8x8_THRESHOLD);
    } else if (config.effect === 'variable-error') {
        applyVariableError(pixels, pw, ph, config, lumaLUT);
    } else if (config.effect === 'posterize') {
        applyPosterize(pixels, lumaLUT);
    }

    self.postMessage(imageData, [imageData.data.buffer]);
};
