/**
 * floyd-steinberg.js
 * Implementación del algoritmo de dithering Floyd-Steinberg.
 */
import { KERNELS } from '../../utils/constants.js';
import { applyErrorDiffusion } from './diffusion-helpers.js';

/**
 * Aplica el dithering Floyd-Steinberg a un array de píxeles.
 * @param {Uint8ClampedArray} pixels - El array de píxeles del canvas.
 * @param {number} w - El ancho de la imagen.
 * @param {number} h - La altura de la imagen.
 * @param {object} config - El objeto de configuración del estado.
 * @param {object} utils - Un objeto con utilidades necesarias (LumaLUT, etc.).
 */
export function applyFloydSteinberg(pixels, w, h, config, utils) {
  // Delega toda la lógica a la función auxiliar de difusión de error,
  // pasándole el kernel específico de Floyd-Steinberg.
  applyErrorDiffusion(pixels, w, h, config, utils, KERNELS['floyd-steinberg']);
}