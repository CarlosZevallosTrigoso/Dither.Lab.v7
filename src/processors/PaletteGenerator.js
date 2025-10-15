/**
 * @file PaletteGenerator.js
 * @description Genera una paleta de colores a partir de un medio (imagen/video)
 * utilizando el algoritmo K-Means++.
 */

class PaletteGenerator {
  /**
   * Genera una paleta de 'k' colores a partir de un medio.
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
    
    // Aumentar el tamaño del canvas para un muestreo de color más preciso
    const tempCanvas = p.createGraphics(200, 200);
    tempCanvas.pixelDensity(1);

    tempCanvas.image(media, 0, 0, tempCanvas.width, tempCanvas.height);
    tempCanvas.loadPixels();
    const pixels = this.getRGBPixels(tempCanvas.pixels);
    
    // 🔥 VALIDACIÓN CRÍTICA: Verificar que no sean todos píxeles negros
    // Esto ocurre cuando el video no se ha renderizado correctamente
    const hasColor = pixels.some(pixel => pixel[0] > 10 || pixel[1] > 10 || pixel[2] > 10);
    
    if (!hasColor) {
      console.warn('PaletteGenerator: Frame parece estar completamente negro/vacío');
      console.warn('PaletteGenerator: Esto puede indicar que el video no se renderizó correctamente');
      tempCanvas.remove();
      
      // Retornar una paleta de escala de grises como fallback
      console.log('PaletteGenerator: Usando paleta de escala de grises como fallback');
      return this.generateGrayscalePalette(k);
    }
    
    // 🔥 VALIDACIÓN ADICIONAL: Verificar variedad de colores
    const uniqueColors = new Set(pixels.map(p => `${p[0]},${p[1]},${p[2]}`));
    
    if (uniqueColors.size < 5) {
      console.warn(`PaletteGenerator: Poca variedad de colores detectada (${uniqueColors.size} colores únicos)`);
      console.warn('PaletteGenerator: El frame puede no ser representativo del video');
    } else {
      console.log(`PaletteGenerator: Analizando ${pixels.length} píxeles con ${uniqueColors.size} colores únicos`);
    }
    
    tempCanvas.remove();

    if (pixels.length === 0) {
      console.error('PaletteGenerator: No se pudieron extraer píxeles');
      return this.generateGrayscalePalette(k);
    }

    // Ejecutar K-Means++
    let centroids = this.initializeCentroids(pixels, k);

    for (let iter = 0; iter < 15; iter++) {
      const assignments = this.assignToCentroids(pixels, centroids);
      const newCentroids = this.calculateNewCentroids(pixels, assignments, k, centroids);
      
      if (this.haveCentroidsConverged(centroids, newCentroids)) {
        console.log(`PaletteGenerator: K-Means convergió en ${iter + 1} iteraciones`);
        break;
      }
      centroids = newCentroids;
    }

    const palette = this.formatCentroids(centroids);
    console.log('PaletteGenerator: Paleta final generada:', palette);
    
    return palette;
  }

  /**
   * Genera una paleta de grises distribuida uniformemente.
   * @param {number} k - El número de colores (grises) a generar.
   * @returns {string[]} Un array de colores hexadecimales en escala de grises.
   */
  generateGrayscalePalette(k) {
      if (k < 2) return ['#000000'];
      const palette = [];
      for (let i = 0; i < k; i++) {
          const value = Math.round(255 * (i / (k - 1)));
          const hex = value.toString(16).padStart(2, '0');
          palette.push(`#${hex}${hex}${hex}`);
      }
      console.log('PaletteGenerator: Paleta de escala de grises generada:', palette);
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
      if (centroids.length === centroids.length - 1) {
        console.warn('PaletteGenerator: No se pudo agregar centroide, agregando aleatorio');
        const randomIndex = Math.floor(Math.random() * pixels.length);
        centroids.push([...pixels[randomIndex]]);
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
