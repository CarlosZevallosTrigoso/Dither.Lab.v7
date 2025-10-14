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
   * Añade una cantidad sutil de ruido para evitar el "clamping" en colores puros.
   * @param {Uint8ClampedArray} pixels - El array de píxeles.
   */
  addNoise(pixels) {
      for (let i = 0; i < pixels.length; i += 4) {
          // Añade un valor aleatorio entre -2 y 2 a cada canal de color.
          const noise = (Math.random() - 0.5) * 4;
          pixels[i] = Math.max(0, Math.min(255, pixels[i] + noise));
          pixels[i+1] = Math.max(0, Math.min(255, pixels[i+1] + noise));
          pixels[i+2] = Math.max(0, Math.min(255, pixels[i+2] + noise));
      }
  }

  /**
   * Procesa un buffer de imagen a través del pipeline completo.
   * @param {p5.Graphics} buffer - El buffer con la imagen original.
   * @param {object} config - La configuración de procesamiento del estado.
   * @returns {p5.Graphics} El buffer procesado.
   */
  process(buffer, config) {
    buffer.loadPixels();
    
    // 0. (NUEVO) Añadir ruido para solucionar el problema del clamping.
    if (config.effect !== 'none' && config.effect !== 'posterize' && !config.useOriginalColor) {
        this.addNoise(buffer.pixels);
    }

    // 1. Aplicar ajustes de imagen (brillo, contraste, saturación)
    imageAdjustments.apply(buffer.pixels, config);

    // 2. Aplicar curvas de color
    curveProcessor.apply(buffer.pixels, config.curves);
    
    // 3. Si "Aplicar a Color Original" está activo, no se aplica dithering.
    if (config.useOriginalColor) {
        buffer.updatePixels();
        return buffer;
    }
    
    // 4. Aplicar el algoritmo de dithering seleccionado
    const algorithm = algorithmRegistry.get(config.effect);
    if (algorithm) {
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
