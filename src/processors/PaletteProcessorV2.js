/**
 * @file PaletteProcessorV2.js
 * @description Módulo de procesamiento de paleta y dithering "Paleta de Colores II".
 * Este módulo es una refactorización directa de la lógica funcional encontrada en la v6 de DitherLab.
 * Es completamente independiente de BaseErrorDiffusionAlgorithm.js y LumaLUT.js.
 */
import { KERNELS } from '../constants/kernels.js';

class PaletteProcessorV2 {
    constructor(utils) {
        // Hereda las utilidades (como bayerLUT) del ImageProcessor principal
        this.utils = utils;
    }

    /**
     * Punto de entrada principal para procesar los píxeles con la lógica de la v6.
     */
    process(pixels, width, height, config) {
        // En la v6, el modo 'useOriginalColor' contenía la lógica RGB correcta.
        // Aquí, la adaptamos para que funcione con paletas de colores personalizadas.
        if (config.effect === 'bayer' || config.effect === 'blue-noise') {
             this.applyOrderedDither(pixels, width, height, config);
        } else if (KERNELS[config.effect]) {
             this.applyErrorDiffusion(pixels, width, height, config);
        }
        // Otros algoritmos como 'posterize' o 'none' no necesitan ser manejados aquí.

        return pixels;
    }

    /**
     * Implementa la difusión de error procesando cada canal RGB de forma independiente.
     * Basado en la lógica funcional de drawDither() en la v6.
     */
    applyErrorDiffusion(pixels, width, height, config) {
        const kernel = KERNELS[config.effect];
        if (!kernel) return;

        const { serpentineScan, diffusionStrength } = config;

        // 1. Convertir la paleta de HEX a RGB una sola vez.
        const paletteRGB = config.colors.map(hex => {
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return [r, g, b];
        });
        
        // 2. Función para encontrar el color más cercano en el espacio de color RGB.
        const findClosestColor = (r, g, b, currentPalette) => {
            let closestColor = currentPalette[0];
            let minDistanceSq = Infinity;
            for (const color of currentPalette) {
                const dr = r - color[0];
                const dg = g - color[1];
                const db = b - color[2];
                const distanceSq = dr * dr + dg * dg + db * db;
                if (distanceSq < minDistanceSq) {
                    minDistanceSq = distanceSq;
                    closestColor = color;
                }
            }
            return closestColor;
        };

        // 3. Bucle principal de dithering, idéntico al que propuse anteriormente.
        const tempPixelsR = new Float32Array(pixels.length / 4);
        const tempPixelsG = new Float32Array(pixels.length / 4);
        const tempPixelsB = new Float32Array(pixels.length / 4);
        
        for(let i = 0; i < pixels.length / 4; i++) {
            tempPixelsR[i] = pixels[i * 4];
            tempPixelsG[i] = pixels[i * 4 + 1];
            tempPixelsB[i] = pixels[i * 4 + 2];
        }

        for (let y = 0; y < height; y++) {
            const isReversed = serpentineScan && y % 2 === 1;
            const xStart = isReversed ? width - 1 : 0;
            const xEnd = isReversed ? -1 : width;
            const xStep = isReversed ? -1 : 1;

            for (let x = xStart; x !== xEnd; x += xStep) {
                const i = y * width + x;

                const oldR = tempPixelsR[i];
                const oldG = tempPixelsG[i];
                const oldB = tempPixelsB[i];

                const [newR, newG, newB] = findClosestColor(oldR, oldG, oldB, paletteRGB);

                pixels[i * 4] = newR;
                pixels[i * 4 + 1] = newG;
                pixels[i * 4 + 2] = newB;

                const errorR = (oldR - newR) * diffusionStrength;
                const errorG = (oldG - newG) * diffusionStrength;
                const errorB = (oldB - newB) * diffusionStrength;

                for (const pt of kernel.points) {
                    const dx = isReversed ? -pt.dx : pt.dx;
                    const nx = x + dx;
                    const ny = y + pt.dy;
                    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                        const ni = ny * width + nx;
                        const weight = pt.w / kernel.divisor;
                        tempPixelsR[ni] += errorR * weight;
                        tempPixelsG[ni] += errorG * weight;
                        tempPixelsB[ni] += errorB * weight;
                    }
                }
            }
        }
    }

    /**
     * Implementa el dithering ordenado (Bayer, Blue Noise) usando la LUT de luminancia.
     * Esta parte de la v7 ya funcionaba bien una vez corregida la LumaLUT, pero la incluimos
     * aquí para mantener el módulo autocontenido.
     */
    applyOrderedDither(pixels, width, height, config) {
        const { lumaLUT, bayerLUT, blueNoiseLUT } = this.utils;
        const { colorCount, patternStrength, effect } = config;

        const ditherStrength = (255 / (colorCount > 1 ? colorCount - 1 : 1)) * patternStrength * 2;
        const lut = effect === 'bayer' ? bayerLUT : blueNoiseLUT;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const i = (y * width + x) * 4;
                const ditherOffset = lut.get(x, y) * ditherStrength;

                const luma = pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114;
                const adjustedLuma = Math.min(255, Math.max(0, luma + ditherOffset));
                
                // LumaLUT ya fue corregida para usar el modo 'nearest', por lo que esto es seguro.
                const [r, g, b] = lumaLUT.map(adjustedLuma);

                pixels[i] = r;
                pixels[i + 1] = g;
                pixels[i + 2] = b;
            }
        }
    }
}

// Exportamos la clase para poder importarla en otros módulos.
export { PaletteProcessorV2 };
