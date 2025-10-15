/**
 * @file ImageProcessor.js
 * @description Orquesta el pipeline de procesamiento de imágenes.
 * Aplica ajustes, curvas y el algoritmo de dithering seleccionado.
 */

import { imageAdjustments } from './ImageAdjustments.js';
import { curveProcessor } from './CurveProcessor.js';
import { algorithmRegistry } from '../algorithms/AlgorithmRegistry.js';
// Importar correctamente todas las instancias de algoritmos
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
      // Registrar la lista completa de algoritmos importados
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
      
      console.log(`ImageProcessor: ${algorithmRegistry.list().length} algoritmos registrados`);
  }

  /**
   * Añade ruido sutil a los píxeles para romper gradientes y mejorar el dithering.
   * 🔥 MEJORADO: Ruido más suave con redondeo para evitar acumulación de errores.
   * @param {Uint8ClampedArray} pixels - Array de píxeles a modificar
   */
  addNoise(pixels) {
      // Reducir intensidad del ruido de 4 a 3 para resultados más sutiles
      const noiseIntensity = 3;
      
      for (let i = 0; i < pixels.length; i += 4) {
          // Generar ruido en rango [-1.5, 1.5]
          const noise = (Math.random() - 0.5) * noiseIntensity;
          
          // Aplicar ruido y redondear para evitar acumulación de errores de punto flotante
          pixels[i]     = Math.round(Math.max(0, Math.min(255, pixels[i] + noise)));
          pixels[i + 1] = Math.round(Math.max(0, Math.min(255, pixels[i + 1] + noise)));
          pixels[i + 2] = Math.round(Math.max(0, Math.min(255, pixels[i + 2] + noise)));
          // Alpha channel (i+3) no se modifica
      }
  }

  /**
   * Procesa un buffer de imagen aplicando todo el pipeline.
   * @param {p5.Graphics} buffer - El buffer a procesar
   * @param {object} config - Configuración actual de la aplicación
   * @returns {p5.Graphics} El buffer procesado
   */
  process(buffer, config) {
    const startTime = performance.now();
    
    buffer.loadPixels();
    
    // 1. Añadir ruido ligero para romper gradientes (excepto en 'none' y 'posterize')
    if (config.effect !== 'none' && config.effect !== 'posterize') {
        this.addNoise(buffer.pixels);
    }

    // 2. Aplicar ajustes de imagen (brillo, contraste, saturación)
    imageAdjustments.apply(buffer.pixels, config);
    
    // 3. Aplicar curvas de color RGB (si están definidas)
    curveProcessor.apply(buffer.pixels, config.curves);
    
    // 4. Aplicar algoritmo de dithering
    const algorithm = algorithmRegistry.get(config.effect);
    if (algorithm) {
        // Si NO estamos usando color original, construir la LUT de luminancia
        if (!config.useOriginalColor) {
            const p5colors = this.utils.colorCache.getColors(config.colors);
            this.utils.lumaLUT.build(p5colors, buffer);
        }
        
        // Ejecutar el algoritmo
        try {
            algorithm.process(buffer.pixels, buffer.width, buffer.height, config, this.utils);
        } catch (error) {
            console.error(`ImageProcessor: Error al ejecutar algoritmo '${config.effect}':`, error);
            // No updatePixels aquí, dejar que el buffer mantenga su estado anterior
        }
    } else if (config.effect !== 'none') {
        console.warn(`ImageProcessor: Algoritmo '${config.effect}' no encontrado.`);
    }

    buffer.updatePixels();
    
    // 5. Medir tiempo de procesamiento y publicar estadísticas
    const processingTime = performance.now() - startTime;
    
    // Calcular FPS basándose en el tiempo de procesamiento
    const fps = processingTime > 0 ? 1000 / processingTime : 0;
    
    // Publicar estadísticas (throttled por el CanvasManager)
    if (this.lastStatsPublish === undefined || Date.now() - this.lastStatsPublish > 500) {
        const eventBus = require('../core/EventBus.js').eventBus;
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
