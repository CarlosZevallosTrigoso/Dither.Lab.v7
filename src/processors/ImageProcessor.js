/**
 * @file ImageProcessor.js
 * @description Orquesta el pipeline de procesamiento de imágenes.
 * Aplica ajustes, curvas y el algoritmo de dithering seleccionado.
 */

import { imageAdjustments } from './ImageAdjustments.js';
import { curveProcessor } from './CurveProcessor.js';
import { algorithmRegistry } from '../algorithms/AlgorithmRegistry.js';
import { eventBus } from '../core/EventBus.js';
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
    this.utils = utils;
    this.lastStatsPublish = 0;
    this.registerAlgorithms();
  }

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
      
      console.log('ImageProcessor: ' + algorithmRegistry.list().length + ' algoritmos registrados');
  }

  addNoise(pixels) {
      var noiseIntensity = 3;
      
      for (var i = 0; i < pixels.length; i += 4) {
          var noise = (Math.random() - 0.5) * noiseIntensity;
          
          pixels[i] = Math.round(Math.max(0, Math.min(255, pixels[i] + noise)));
          pixels[i + 1] = Math.round(Math.max(0, Math.min(255, pixels[i + 1] + noise)));
          pixels[i + 2] = Math.round(Math.max(0, Math.min(255, pixels[i + 2] + noise)));
      }
  }

  process(buffer, config) {
    var startTime = performance.now();
    
    buffer.loadPixels();
    
    if (config.effect !== 'none' && config.effect !== 'posterize') {
        this.addNoise(buffer.pixels);
    }

    imageAdjustments.apply(buffer.pixels, config);
    curveProcessor.apply(buffer.pixels, config.curves);
    
    var algorithm = algorithmRegistry.get(config.effect);
    if (algorithm) {
        if (!config.useOriginalColor) {
            const p5colors = this.utils.colorCache.getColors(config.colors);

            // ================== INICIO DE LA CORRECCIÓN ==================
            // La LumaLUT asume que la paleta está ordenada por luminancia.
            // Cuando un usuario edita un color, el orden se rompe.
            // Para solucionarlo, creamos una copia de la paleta y la ordenamos
            // por luminancia solo para construir la LUT, sin afectar la UI.
            
            const getLuminance = (c) => {
              const p5 = this.utils.colorCache.p;
              return p5.red(c) * 0.299 + p5.green(c) * 0.587 + p5.blue(c) * 0.114;
            };

            const sortedP5Colors = [...p5colors].sort((a, b) => getLuminance(a) - getLuminance(b));
            
            this.utils.lumaLUT.build(sortedP5Colors, buffer);
            // =================== FIN DE LA CORRECCIÓN ====================
        }
        
        try {
            algorithm.process(buffer.pixels, buffer.width, buffer.height, config, this.utils);
        } catch (error) {
            console.error('ImageProcessor: Error al ejecutar algoritmo ' + config.effect + ':', error);
        }
    } else if (config.effect !== 'none') {
        console.warn('ImageProcessor: Algoritmo ' + config.effect + ' no encontrado.');
    }

    buffer.updatePixels();
    
    var processingTime = performance.now() - startTime;
    var fps = processingTime > 0 ? 1000 / processingTime : 0;
    
    if (Date.now() - this.lastStatsPublish > 500) {
        eventBus.publish('stats:update', {
            fps: fps,
            frameTime: processingTime
        });
        this.lastStatsPublish = Date.now();
    }
    
    return buffer;
  }
}

export { ImageProcessor };
