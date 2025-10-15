/**
 * @file ImageProcessor.js
 * @description Orquesta el pipeline de procesamiento de imágenes. (RESTAURADO)
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

// ==================================================================
// === PASO 2.1: IMPORTAR EL NUEVO MÓDULO "PALETA DE COLORES II"  ===
// ==================================================================
import { PaletteProcessorV2 } from './PaletteProcessorV2.js';


class ImageProcessor {
  constructor(utils) {
    this.utils = utils;
    this.lastStatsPublish = 0;
    this.registerAlgorithms();

    // ==================================================================
    // === PASO 2.2: CREAR UNA INSTANCIA DEL NUEVO PROCESADOR         ===
    // ==================================================================
    this.paletteProcessorV2 = new PaletteProcessorV2(utils);
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
    
    // ==================================================================
    // === PASO 2.3: LÓGICA DE DECISIÓN PARA USAR EL NUEVO MOTOR      ===
    // ==================================================================
    // Usamos el nuevo procesador V2 si el modo "Paleta de Colores II" está activado
    // Y si no estamos usando el modo "Aplicar a Color Original" (que ya funciona bien).
    if (config.usePaletteV2 && !config.useOriginalColor) {
        
        console.log("Usando PaletteProcessorV2 (lógica de v6)");
        this.paletteProcessorV2.process(buffer.pixels, buffer.width, buffer.height, config);

    } else {
        // --- LÓGICA ANTIGUA (SE MANTIENE PARA COMPARACIÓN) ---
        var algorithm = algorithmRegistry.get(config.effect);
        if (algorithm) {
            if (!config.useOriginalColor) {
                // La LumaLUT ahora es robusta, pero la lógica de difusión de error no.
                var p5colors = this.utils.colorCache.getColors(config.colors);
                this.utils.lumaLUT.build(p5colors, buffer);
            }
            
            try {
                // Aquí se llama a la lógica de procesamiento original de la v7.
                algorithm.process(buffer.pixels, buffer.width, buffer.height, config, this.utils);
            } catch (error) {
                console.error('ImageProcessor: Error al ejecutar algoritmo ' + config.effect + ':', error);
            }
        } else if (config.effect !== 'none') {
            console.warn('ImageProcessor: Algoritmo ' + config.effect + ' no encontrado.');
        }
    }
    // ==================================================================
    // === FIN DE LA MODIFICACIÓN                                     ===
    // ==================================================================

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
