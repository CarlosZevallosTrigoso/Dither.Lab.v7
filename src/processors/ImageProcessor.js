/**
 * @file ImageProcessor.js
 * @description Orquesta el pipeline de procesamiento de imágenes.
 * Aplica ajustes, curvas y el algoritmo de dithering seleccionado.
 */

import { imageAdjustments } from './ImageAdjustments.js';
import { curveProcessor } from './CurveProcessor.js';
import { algorithmRegistry } from '../algorithms/AlgorithmRegistry.js';
// (NUEVO) Importar correctamente todas las instancias de algoritmos
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
      // (NUEVO) Registrar la lista completa de algoritmos importados.
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

  addNoise(pixels) {
      for (let i = 0; i < pixels.length; i += 4) {
          const noise = (Math.random() - 0.5) * 4;
          pixels[i]   = Math.max(0, Math.min(255, pixels[i] + noise));
          pixels[i+1] = Math.max(0, Math.min(255, pixels[i+1] + noise));
          pixels[i+2] = Math.max(0, Math.min(255, pixels[i+2] + noise));
      }
  }

  process(buffer, config) {
    buffer.loadPixels();
    
    if (config.effect !== 'none' && config.effect !== 'posterize') {
        this.addNoise(buffer.pixels);
    }

    imageAdjustments.apply(buffer.pixels, config);
    curveProcessor.apply(buffer.pixels, config.curves);
    
    const algorithm = algorithmRegistry.get(config.effect);
    if (algorithm) {
        if (!config.useOriginalColor) {
            const p5colors = this.utils.colorCache.getColors(config.colors);
            this.utils.lumaLUT.build(p5colors, buffer);
        }
        algorithm.process(buffer.pixels, buffer.width, buffer.height, config, this.utils);
    } else if (config.effect !== 'none') {
        console.warn(`Algoritmo '${config.effect}' no encontrado.`);
    }

    buffer.updatePixels();
    return buffer;
  }
}

export { ImageProcessor };
