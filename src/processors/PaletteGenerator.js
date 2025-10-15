/**
 * @file PaletteGenerator.js
 * @description Genera una paleta de colores a partir de un medio (imagen/video)
 * utilizando K-Means++ mejorado con múltiples intentos y preprocesamiento.
 * VERSIÓN MEJORADA: Soporte para múltiples frames, mejor validación, clustering optimizado.
 */

class PaletteGenerator {
  /**
   * Genera una paleta de 'k' colores a partir de un medio (método original mejorado).
   * @param {p5.MediaElement | p5.Image} media - El medio del cual extraer los colores.
   * @param {object} config - La configuración de la aplicación, para saber si es monocromo.
   * @param {p5} p - La instancia de p5.
   * @returns {Promise<string[]>} Una promesa que resuelve a un array de colores hexadecimales.
   */
  async generate(media, config, p) {
    const k = config.colorCount;

    if (config.isMonochrome) {
      return this.generateGrayscalePalette(k);
    }
    
    // Canvas más grande para mejor muestreo (400x400 en vez de 200x200)
    const tempCanvas = p.createGraphics(400, 400);
    tempCanvas.pixelDensity(1);

    tempCanvas.image(media, 0, 0, tempCanvas.width, tempCanvas.height);
    tempCanvas.loadPixels();
    const pixels = this.getRGBPixels(tempCanvas.pixels);
    
    // 🔥 VALIDACIÓN MEJORADA
    const validation = this.validatePixelData(pixels);
    
    if (!validation.isValid) {
      console.warn('PaletteGenerator: Frame inválido detectado:', validation.reason);
      console.warn('PaletteGenerator: Usando paleta de escala de grises como fallback');
      tempCanvas.remove();
      return this.generateGrayscalePalette(k);
    }
    
    console.log(`PaletteGenerator: Analizando ${pixels.length} píxeles válidos`);
    console.log('PaletteGenerator: Estadísticas:', validation.stats);
    
    tempCanvas.remove();

    if (pixels.length === 0) {
      console.error('PaletteGenerator: No se pudieron extraer píxeles');
      return this.generateGrayscalePalette(k);
    }

    // 🔥 PREPROCESAMIENTO: Submuestreo inteligente si hay demasiados píxeles
    const sampledPixels = this.subsamplePixels(pixels, 10000);
    
    // 🔥 EJECUTAR K-MEANS MÚLTIPLES VECES Y ELEGIR EL MEJOR
    const bestResult = await this.runMultipleKMeans(sampledPixels, k);
    
    const palette = this.formatCentroids(bestResult.centroids);
    console.log('PaletteGenerator: ✅ Paleta final generada:', palette);
    
    return palette;
  }

  /**
   * 🆕 Genera paleta a partir de múltiples frames (para videos).
   * @param {p5.Graphics[]} frames - Array de canvas con frames del video.
   * @param {object} config - La configuración de la aplicación.
   * @param {p5} p - La instancia de p5.
   * @returns {Promise<string[]>}
   */
  async generateFromMultipleFrames(frames, config, p) {
    const k = config.colorCount;

    if (config.isMonochrome) {
      return this.generateGrayscalePalette(k);
    }

    console.log(`PaletteGenerator: Procesando ${frames.length} frames para paleta óptima`);
    
    // Combinar píxeles de todos los frames
    const allPixels = [];
    
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      
      // Redimensionar frame a 300x300 para balance velocidad/calidad
      const tempCanvas = p.createGraphics(300, 300);
      tempCanvas.pixelDensity(1);
      tempCanvas.image(frame, 0, 0, 300, 300);
      tempCanvas.loadPixels();
      
      const framePixels = this.getRGBPixels(tempCanvas.pixels);
      tempCanvas.remove();
      
      // Validar frame
      const validation = this.validatePixelData(framePixels);
      if (validation.isValid) {
        // Submuestrear este frame (tomar 2000 píxeles de cada uno)
        const sampledFrame = this.subsamplePixels(framePixels, 2000);
        allPixels.push(...sampledFrame);
        console.log(`PaletteGenerator: Frame ${i + 1}/${frames.length} válido (${sampledFrame.length} píxeles)`);
      } else {
        console.warn(`PaletteGenerator: Frame ${i + 1}/${frames.length} inválido:`, validation.reason);
      }
    }
    
    if (allPixels.length === 0) {
      console.error('PaletteGenerator: Ningún frame válido encontrado');
      return this.generateGrayscalePalette(k);
    }
    
    console.log(`PaletteGenerator: Total de píxeles combinados: ${allPixels.length}`);
    
    // Ejecutar K-Means sobre los píxeles combinados
    const bestResult = await this.runMultipleKMeans(allPixels, k);
    
    const palette = this.formatCentroids(bestResult.centroids);
    console.log('PaletteGenerator: ✅ Paleta multi-frame generada:', palette);
    
    return palette;
  }

  /**
   * 🆕 Valida que los datos de píxeles sean buenos.
   * @param {Array<[r,g,b]>} pixels
   * @returns {{isValid: boolean, reason?: string, stats: object}}
   */
  validatePixelData(pixels) {
    if (pixels.length === 0) {
      return { isValid: false, reason: 'Sin píxeles' };
    }

    let totalBrightness = 0;
    let totalSaturation = 0;
    let nonBlackPixels = 0;
    let colorfulPixels = 0;
    
    const colorCounts = new Map();
    
    for (const [r, g, b] of pixels) {
      const brightness = (r + g + b) / 3;
      totalBrightness += brightness;
      
      if (brightness > 10) {
        nonBlackPixels++;
      }
      
      // Calcular saturación simple
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const saturation = max > 0 ? (max - min) / max : 0;
      totalSaturation += saturation;
      
      if (saturation > 0.15) {
        colorfulPixels++;
      }
      
      // Contar colores únicos (simplificado a 16 valores por canal)
      const colorKey = `${Math.floor(r/16)}-${Math.floor(g/16)}-${Math.floor(b/16)}`;
      colorCounts.set(colorKey, (colorCounts.get(colorKey) || 0) + 1);
    }
    
    const avgBrightness = totalBrightness / pixels.length;
    const avgSaturation = totalSaturation / pixels.length;
    const nonBlackRatio = nonBlackPixels / pixels.length;
    const colorfulRatio = colorfulPixels / pixels.length;
    const uniqueColors = colorCounts.size;
    
    const stats = {
      avgBrightness: avgBrightness.toFixed(2),
      avgSaturation: avgSaturation.toFixed(3),
      nonBlackRatio: (nonBlackRatio * 100).toFixed(1) + '%',
      colorfulRatio: (colorfulRatio * 100).toFixed(1) + '%',
      uniqueColors
    };
    
    // Criterios de validación
    if (avgBrightness < 10) {
      return { isValid: false, reason: 'Demasiado oscuro', stats };
    }
    
    if (nonBlackRatio < 0.4) {
      return { isValid: false, reason: 'Mayoría de píxeles negros', stats };
    }
    
    if (uniqueColors < 5) {
      return { isValid: false, reason: 'Poca variedad de colores', stats };
    }
    
    return { isValid: true, stats };
  }

  /**
   * 🆕 Submuestrea píxeles de forma inteligente.
   * @param {Array<[r,g,b]>} pixels
   * @param {number} targetCount - Número objetivo de píxeles
   * @returns {Array<[r,g,b]>}
   */
  subsamplePixels(pixels, targetCount) {
    if (pixels.length <= targetCount) {
      return pixels;
    }
    
    // Muestreo estratificado: garantiza representación de diferentes rangos de brillo
    const brightnessBuckets = Array.from({ length: 8 }, () => []);
    
    for (const pixel of pixels) {
      const brightness = (pixel[0] + pixel[1] + pixel[2]) / 3;
      const bucketIndex = Math.min(7, Math.floor(brightness / 32));
      brightnessBuckets[bucketIndex].push(pixel);
    }
    
    // Tomar muestras proporcionalmente de cada bucket
    const result = [];
    const samplesPerBucket = Math.ceil(targetCount / 8);
    
    for (const bucket of brightnessBuckets) {
      if (bucket.length === 0) continue;
      
      const step = Math.max(1, Math.floor(bucket.length / samplesPerBucket));
      for (let i = 0; i < bucket.length && result.length < targetCount; i += step) {
        result.push(bucket[i]);
      }
    }
    
    console.log(`PaletteGenerator: Submuestreado de ${pixels.length} a ${result.length} píxeles`);
    return result;
  }

  /**
   * 🆕 Ejecuta K-Means múltiples veces y devuelve el mejor resultado.
   * @param {Array<[r,g,b]>} pixels
   * @param {number} k - Número de clusters
   * @returns {Promise<{centroids: Array<[r,g,b]>, inertia: number}>}
   */
  async runMultipleKMeans(pixels, k) {
    const attempts = 3;
    let bestResult = null;
    let bestInertia = Infinity;
    
    console.log(`PaletteGenerator: Ejecutando K-Means ${attempts} veces para encontrar óptimo...`);
    
    for (let attempt = 0; attempt < attempts; attempt++) {
      let centroids = this.initializeCentroids(pixels, k);
      let iterations = 0;
      const maxIterations = 20;
      
      while (iterations < maxIterations) {
        const assignments = this.assignToCentroids(pixels, centroids);
        const newCentroids = this.calculateNewCentroids(pixels, assignments, k, centroids);
        
        if (this.haveCentroidsConverged(centroids, newCentroids)) {
          break;
        }
        
        centroids = newCentroids;
        iterations++;
      }
      
      // Calcular inercia (suma de distancias al cuadrado)
      const assignments = this.assignToCentroids(pixels, centroids);
      let inertia = 0;
      
      for (let i = 0; i < pixels.length; i++) {
        const centroidIndex = assignments[i];
        const distSq = this.colorDistanceSq(pixels[i], centroids[centroidIndex]);
        inertia += distSq;
      }
      
      console.log(`PaletteGenerator: Intento ${attempt + 1}: ${iterations} iteraciones, inercia=${inertia.toFixed(0)}`);
      
      if (inertia < bestInertia) {
        bestInertia = inertia;
        bestResult = { centroids, inertia };
      }
    }
    
    console.log(`PaletteGenerator: Mejor resultado con inercia=${bestInertia.toFixed(0)}`);
    return bestResult;
  }

  /**
   * Genera una paleta de grises distribuida uniformemente con gamma correction.
   * @param {number} k - El número de colores (grises) a generar.
   * @returns {string[]} Un array de colores hexadecimales en escala de grises.
   */
  generateGrayscalePalette(k) {
    if (k < 2) return ['#000000'];
    
    const palette = [];
    
    // 🔥 MEJORADO: Usar distribución perceptual (gamma 2.2) en vez de lineal
    for (let i = 0; i < k; i++) {
      const linear = i / (k - 1); // 0 a 1
      const perceptual = Math.pow(linear, 1/2.2); // Gamma correction
      const value = Math.round(perceptual * 255);
      const hex = value.toString(16).padStart(2, '0');
      palette.push(`#${hex}${hex}${hex}`);
    }
    
    console.log('PaletteGenerator: Paleta de escala de grises (perceptual) generada:', palette);
    return palette;
  }

  getRGBPixels(pixelsData) {
    const pixels = [];
    for (let i = 0; i < pixelsData.length; i += 4) {
      pixels.push([pixelsData[i], pixelsData[i + 1], pixelsData[i + 2]]);
    }
    return pixels;
  }

  colorDistanceSq(c1, c2) {
    // Distancia Euclidiana simple en RGB
    // Para mejor precisión se podría usar LAB, pero es más lento
    return ((c1[0] - c2[0]) ** 2) + ((c1[1] - c2[1]) ** 2) + ((c1[2] - c2[2]) ** 2);
  }

  initializeCentroids(pixels, k) {
    const centroids = [];
    
    // Elegir el primer centroide al azar
    const firstIndex = Math.floor(Math.random() * pixels.length);
    centroids.push([...pixels[firstIndex]]);

    // K-Means++: elegir los siguientes centroides basándose en la distancia
    while (centroids.length < k) {
      const distancesSq = pixels.map(pixel => {
        let minDistanceSq = Infinity;
        for (const centroid of centroids) {
          minDistanceSq = Math.min(minDistanceSq, this.colorDistanceSq(pixel, centroid));
        }
        return minDistanceSq;
      });

      const sumDistancesSq = distancesSq.reduce((a, b) => a + b, 0);
      
      // Evitar división por cero
      if (sumDistancesSq === 0) {
        console.warn('PaletteGenerator: Suma de distancias es cero, eligiendo centroide aleatorio');
        const randomIndex = Math.floor(Math.random() * pixels.length);
        centroids.push([...pixels[randomIndex]]);
        continue;
      }
      
      let rand = Math.random() * sumDistancesSq;
      
      for (let i = 0; i < pixels.length; i++) {
        rand -= distancesSq[i];
        if (rand <= 0) {
          centroids.push([...pixels[i]]);
          break;
        }
      }
      
      // Protección contra bucle infinito
      if (centroids.length === centroids.length) {
        const lastLength = centroids.length;
        setTimeout(() => {
          if (centroids.length === lastLength) {
            console.warn('PaletteGenerator: Añadiendo centroide aleatorio por seguridad');
            const randomIndex = Math.floor(Math.random() * pixels.length);
            centroids.push([...pixels[randomIndex]]);
          }
        }, 0);
      }
    }
    
    return centroids;
  }

  assignToCentroids(pixels, centroids) {
    return pixels.map(pixel => {
      let minDistanceSq = Infinity;
      let bestCentroidIndex = 0;
      centroids.forEach((centroid, i) => {
        const distSq = this.colorDistanceSq(pixel, centroid);
        if (distSq < minDistanceSq) {
          minDistanceSq = distSq;
          bestCentroidIndex = i;
        }
      });
      return bestCentroidIndex;
    });
  }

  calculateNewCentroids(pixels, assignments, k, oldCentroids) {
    const newCentroids = Array.from({ length: k }, () => [0, 0, 0]);
    const counts = new Array(k).fill(0);

    pixels.forEach((pixel, i) => {
      const centroidIndex = assignments[i];
      if (newCentroids[centroidIndex]) {
        newCentroids[centroidIndex][0] += pixel[0];
        newCentroids[centroidIndex][1] += pixel[1];
        newCentroids[centroidIndex][2] += pixel[2];
        counts[centroidIndex]++;
      }
    });

    return newCentroids.map((centroid, i) =>
      counts[i] > 0
        ? [
            Math.round(centroid[0] / counts[i]), 
            Math.round(centroid[1] / counts[i]), 
            Math.round(centroid[2] / counts[i])
          ]
        : oldCentroids[i]
    );
  }

  haveCentroidsConverged(oldCentroids, newCentroids, threshold = 1) {
    if (!oldCentroids || !newCentroids || oldCentroids.length !== newCentroids.length) return false;
    for (let i = 0; i < oldCentroids.length; i++) {
      if (!oldCentroids[i] || !newCentroids[i] || this.colorDistanceSq(oldCentroids[i], newCentroids[i]) > threshold) {
        return false;
      }
    }
    return true;
  }

  formatCentroids(centroids) {
    const toHex = c => '#' + c.map(v => {
      // Asegurar que los valores estén en rango válido
      const clamped = Math.max(0, Math.min(255, Math.round(v)));
      return clamped.toString(16).padStart(2, '0');
    }).join('');
    
    // Ordenar por luminancia (de oscuro a claro)
    return centroids
      .sort((a, b) => 
        (a[0] * 0.299 + a[1] * 0.587 + a[2] * 0.114) - 
        (b[0] * 0.299 + b[1] * 0.587 + b[2] * 0.114)
      )
      .map(toHex);
  }
}

export const paletteGenerator = new PaletteGenerator();
