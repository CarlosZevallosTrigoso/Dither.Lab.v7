/**
 * ============================================================================
 * DitherLab v7 - Web Worker para Dithering (VERSIÓN CORREGIDA)
 * ============================================================================
 * - Contiene toda la lógica de procesamiento intensivo para los algoritmos
 * de dithering, ejecutándose en un hilo separado para no bloquear la UI.
 * - Recibe los datos de la imagen y la configuración, aplica el efecto
 * correspondiente y devuelve el resultado al hilo principal.
 * ============================================================================
 */

// Importamos las constantes necesarias directamente en el scope del worker
const KERNELS = {
    'floyd-steinberg': {
        divisor: 16,
        points: [
            { dx: 1, dy: 0, w: 7 }, { dx: -1, dy: 1, w: 3 },
            { dx: 0, dy: 1, w: 5 }, { dx: 1, dy: 1, w: 1 }
        ]
    },
    'atkinson': {
        divisor: 8,
        points: [
            { dx: 1, dy: 0, w: 1 }, { dx: 2, dy: 0, w: 1 },
            { dx: -1, dy: 1, w: 1 }, { dx: 0, dy: 1, w: 1 },
            { dx: 1, dy: 1, w: 1 }, { dx: 0, dy: 2, w: 1 }
        ]
    },
    'stucki': {
        divisor: 42,
        points: [
            { dx: 1, dy: 0, w: 8 }, { dx: 2, dy: 0, w: 4 },
            { dx: -2, dy: 1, w: 2 }, { dx: -1, dy: 1, w: 4 }, { dx: 0, dy: 1, w: 8 }, { dx: 1, dy: 1, w: 4 }, { dx: 2, dy: 1, w: 2 },
            { dx: -2, dy: 2, w: 1 }, { dx: -1, dy: 2, w: 2 }, { dx: 0, dy: 2, w: 4 }, { dx: 1, dy: 2, w: 2 }, { dx: 2, dy: 2, w: 1 }
        ]
    },
    'jarvis-judice-ninke': {
        divisor: 48,
        points: [
            { dx: 1, dy: 0, w: 7 }, { dx: 2, dy: 0, w: 5 },
            { dx: -2, dy: 1, w: 3 }, { dx: -1, dy: 1, w: 5 }, { dx: 0, dy: 1, w: 7 }, { dx: 1, dy: 1, w: 5 }, { dx: 2, dy: 1, w: 3 },
            { dx: -2, dy: 2, w: 1 }, { dx: -1, dy: 2, w: 3 }, { dx: 0, dy: 2, w: 5 }, { dx: 1, dy: 2, w: 3 }, { dx: 2, dy: 2, w: 1 }
        ]
    },
    'sierra': {
        divisor: 32,
        points: [
            { dx: 1, dy: 0, w: 5 }, { dx: 2, dy: 0, w: 3 },
            { dx: -2, dy: 1, w: 2 }, { dx: -1, dy: 1, w: 4 }, { dx: 0, dy: 1, w: 5 }, { dx: 1, dy: 1, w: 4 }, { dx: 2, dy: 1, w: 2 },
            { dx: -1, dy: 2, w: 2 }, { dx: 0, dy: 2, w: 3 }, { dx: 1, dy: 2, w: 2 }
        ]
    },
    'two-row-sierra': {
        divisor: 16,
        points: [
            { dx: 1, dy: 0, w: 4 }, { dx: 2, dy: 0, w: 3 },
            { dx: -2, dy: 1, w: 1 }, { dx: -1, dy: 1, w: 2 }, { dx: 0, dy: 1, w: 3 }, { dx: 1, dy: 1, w: 2 }, { dx: 2, dy: 1, w: 1 }
        ]
    },
    'sierra-lite': {
        divisor: 4,
        points: [
            { dx: 1, dy: 0, w: 2 }, { dx: -1, dy: 1, w: 1 }, { dx: 0, dy: 1, w: 1 }
        ]
    },
    'burkes': {
        divisor: 32,
        points: [
            { dx: 1, dy: 0, w: 8 }, { dx: 2, dy: 0, w: 4 },
            { dx: -2, dy: 1, w: 2 }, { dx: -1, dy: 1, w: 4 }, { dx: 0, dy: 1, w: 8 }, { dx: 1, dy: 1, w: 4 }, { dx: 2, dy: 1, w: 2 }
        ]
    }
};

const BAYER_4x4_THRESHOLD = [
    [0, 8, 2, 10], [12, 4, 14, 6],
    [3, 11, 1, 9], [15, 7, 13, 5]
].flat().map(v => (v / 16.0) - 0.5);

// --- Funciones de Dithering ---

function findClosestColor(r, g, b, lumaLUT) {
    const luma = Math.round(r * 0.299 + g * 0.587 + b * 0.114);
    const index = Math.max(0, Math.min(luma, 255));
    const pos = index * 3;
    return [lumaLUT[pos], lumaLUT[pos + 1], lumaLUT[pos + 2]];
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
            const index = (y * pw + x) * 4;
            const oldR = pixels[index], oldG = pixels[index + 1], oldB = pixels[index + 2];

            const [newR, newG, newB] = findClosestColor(oldR, oldG, oldB, lumaLUT);
            pixels[index] = newR;
            pixels[index + 1] = newG;
            pixels[index + 2] = newB;

            const errR = (oldR - newR) * strength;
            const errG = (oldG - newG) * strength;
            const errB = (oldB - newB) * strength;

            for (const p of kernel.points) {
                const nx = x + p.dx * dir;
                const ny = y + p.dy;
                if (nx >= 0 && nx < pw && ny >= 0 && ny < ph) {
                    const nIndex = (ny * pw + nx) * 4;
                    const weight = p.w / kernel.divisor;
                    pixels[nIndex]     = Math.max(0, Math.min(255, pixels[nIndex] + errR * weight));
                    pixels[nIndex + 1] = Math.max(0, Math.min(255, pixels[nIndex + 1] + errG * weight));
                    pixels[nIndex + 2] = Math.max(0, Math.min(255, pixels[nIndex + 2] + errB * weight));
                }
            }
        }
        if (serpentine) dir *= -1;
    }
}

function applyOrderedDither(pixels, pw, ph, config, lumaLUT) {
    const strength = config.patternStrength;
    for (let y = 0; y < ph; y++) {
        for (let x = 0; x < pw; x++) {
            const index = (y * pw + x) * 4;
            let r = pixels[index], g = pixels[index + 1], b = pixels[index + 2];

            const threshold = BAYER_4x4_THRESHOLD[(y % 4) * 4 + (x % 4)];
            r = Math.max(0, Math.min(255, r + threshold * 255 * strength));
            g = Math.max(0, Math.min(255, g + threshold * 255 * strength));
            b = Math.max(0, Math.min(255, b + threshold * 255 * strength));

            const [newR, newG, newB] = findClosestColor(r, g, b, lumaLUT);
            pixels[index] = newR;
            pixels[index + 1] = newG;
            pixels[index + 2] = newB;
        }
    }
}

function applyPosterize(pixels, pw, ph, lumaLUT) {
    for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
        const [newR, newG, newB] = findClosestColor(r, g, b, lumaLUT);
        pixels[i] = newR;
        pixels[i + 1] = newG;
        pixels[i + 2] = newB;
    }
}

// --- Event Listener del Worker ---

self.onmessage = (e) => {
    const { imageData, config, lumaLUT, pw, ph } = e.data;
    const pixels = imageData.data;

    if (KERNELS[config.effect]) {
        applyErrorDiffusion(pixels, pw, ph, config, lumaLUT);
    } else if (config.effect === 'bayer') {
        applyOrderedDither(pixels, pw, ph, config, lumaLUT);
    } else if (config.effect === 'posterize') {
        applyPosterize(pixels, pw, ph, lumaLUT);
    }
    // Otros algoritmos como 'blue-noise', 'variable-error', etc., se podrían añadir aquí.

    // Devolvemos el imageData modificado al hilo principal.
    // El segundo argumento transfiere la propiedad del buffer, lo que es más rápido.
    self.postMessage(imageData, [imageData.data.buffer]);
};
