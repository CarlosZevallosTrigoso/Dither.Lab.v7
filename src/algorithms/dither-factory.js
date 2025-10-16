/**
 * dither-factory.js
 * Selecciona y aplica el algoritmo de dithering solicitado.
 * Este es el único punto de contacto entre el motor de renderizado y las implementaciones de los algoritmos.
 */

// Importar todas las implementaciones de algoritmos
import { applyFloydSteinberg } from './implementations/floyd-steinberg.js';
import { applyAtkinson } from './implementations/atkinson.js';
import { applyStucki } from './implementations/stucki.js';
import { applyJarvisJudiceNinke } from './implementations/jarvis-judice-ninke.js';
import { applySierra } from './implementations/sierra.js';
import { applySierraLite } from './implementations/sierra-lite.js';
import { applyBurkes } from './implementations/burkes.js';
import { applyBayer } from './implementations/bayer.js';
import { applyBlueNoise } from './implementations/blue-noise.js';
import { applyVariableError } from './implementations/variable-error.js';
import { applyPosterize } from './implementations/posterize.js';
import { applyOriginal } from './implementations/original.js';

// Mapeo de nombres de efectos a sus funciones correspondientes
const algorithmMap = {
  'none': applyOriginal,
  'posterize': applyPosterize,
  'floyd-steinberg': applyFloydSteinberg,
  'atkinson': applyAtkinson,
  'stucki': applyStucki,
  'jarvis-judice-ninke': applyJarvisJudiceNinke,
  'sierra': applySierra,
  'sierra-lite': applySierraLite,
  'burkes': applyBurkes,
  'bayer': applyBayer,
  'blue-noise': applyBlueNoise,
  'variable-error': applyVariableError,
};

/**
 * Aplica el efecto de dithering seleccionado a un búfer de p5.js.
 * @param {p5.Graphics} buffer - El búfer gráfico donde se dibujará el resultado.
 * @param {p5.Image | p5.Video} sourceMedia - El medio original a procesar.
 * @param {object} config - El objeto de configuración del estado de la aplicación.
 * @param {object} utils - Un objeto con utilidades necesarias (LumaLUT, etc.).
 */
function applyEffect(buffer, sourceMedia, config, utils) {
  const effectFunction = algorithmMap[config.effect] || algorithmMap['none'];

  // Preparar el buffer de entrada
  const pw = Math.floor(buffer.width);
  const ph = Math.floor(buffer.height);
  buffer.image(sourceMedia, 0, 0, pw, ph);
  buffer.loadPixels();
  
  // Aplicar ajustes de imagen (brillo, contraste, curvas) ANTES del dithering
  utils.applyImageAdjustments(buffer.pixels, config);

  // Ejecutar el algoritmo seleccionado
  effectFunction(buffer.pixels, pw, ph, config, utils);

  // Actualizar el buffer con el resultado
  buffer.updatePixels();
}

export const DitherFactory = {
  applyEffect
};