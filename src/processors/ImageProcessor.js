/**
 * @file ImageProcessor.js
 * @description Orquesta el pipeline de procesamiento de imágenes.
 * Aplica ajustes, curvas y el algoritmo de dithering seleccionado.
 */

import { imageAdjustments } from './ImageAdjustments.js';
import { curveProcessor } from './CurveProcessor.js';
import { algorithmRegistry } from '../algorithms/AlgorithmRegistry.js';
// Importa todos los algoritmos para registrarlos
import FloydSteinberg from '../algorithms/ErrorDiffusion/FloydSteinberg.js';
import Atkinson from '../algorithms/ErrorDiffusion/Atkinson.js';
import Stucki from '../algorithms/ErrorDiffusion/Stucki.js';
import JarvisJudiceNinke from '../algorithms/ErrorDiffusion/JarvisJudiceNinke.js';
import Sierra from '../algorithms/ErrorDiffusion/Sierra.js';
import SierraLite from '../algorithms/ErrorDiffusion/SierraLite.js';
import Burkes from '../algorithms/ErrorDiffusion/Burkes.js';
import Bayer from '../algorithms/OrderedDithering/Bayer.js';
import BlueNoise from '../algorithms/OrderedDithering/BlueNoise.js';
import VariableError from '../algorithms/Advanced/VariableError.js';
import Posterize from '../algorithms/Advanced/Posterize.js';


class ImageProcessor {
  constructor(utils) {
    this.utils = utils; // { colorCache, lumaLUT, bayerLUT, blueNoiseLUT }
    this.registerAlgorithms();
  }

  /**
   * Registra todos los algoritmos disponibles en el sistema.
   */
  registerAlgorithms() {
      algorithmRegistry.register(FloydSteinberg);
      algorithmRegistry.register(Atkinson);
      algorithmRegistry.register(Stucki);
      algorithmRegistry.register(JarvisJudiceNinke);
      algorithmRegistry.register(Sierra);
      algorithmRegistry.register(SierraLite);
      algorithmRegistry.register(Burkes);
      algorithmRegistry.register(Bayer);
      algorithmRegistry.register(BlueNoise);
      algorithmRegistry.register(VariableError);
      algorithmRegistry.register(Posterize);
  }

  /**
   * Procesa un buffer de imagen a través del pipeline completo.
   * @param {p5.Graphics} buffer - El buffer con la imagen original.
   * @param {object} config - La configuración de procesamiento del estado.
   * @returns {p5.Graphics} El buffer procesado.
   */
  process(buffer, config) {
    buffer.loadPixels();
    
    // 1. Aplicar ajustes de imagen (brillo, contraste, saturación)
    imageAdjustments.apply(buffer.pixels, config);

    // 2. Aplicar curvas de color
    curveProcessor.apply(buffer.pixels, config.curves);
    
    // 3. Aplicar el algoritmo de dithering seleccionado
    const algorithm = algorithmRegistry.get(config.effect);
    if (algorithm) {
        // Actualizar la LumaLUT con la paleta actual
        const p5colors = this.utils.colorCache.getColors(config.colors);
        this.utils.lumaLUT.build(p5colors, buffer);

        algorithm.process(buffer.pixels, buffer.width, buffer.height, config, this.utils);
    } else if (config.effect !== 'none') {
        console.warn(`Algoritmo '${config.effect}' no encontrado.`);
    }

    buffer.updatePixels();
    return buffer;
  }
}

export { ImageProcessor };
