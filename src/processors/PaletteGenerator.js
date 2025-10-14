/**
 * @file PaletteGenerator.js
 * @description Genera una paleta de colores a partir de un medio (imagen/video)
 * utilizando el algoritmo K-Means++.
 */

class PaletteGenerator {
  /**
   * Genera una paleta de 'k' colores a partir de un medio.
   * @param {p5.MediaElement | p5.Image} media - El medio del cual extraer los colores.
   * @param {number} k - El número de colores a generar.
   * @param {p5} p - La instancia de p5.
   * @returns {Promise<string[]>} Una promesa que resuelve a un array de colores hexadecimales.
   */
  async generate(media, k, p) {
    const tempCanvas = p.createGraphics(100, 100);
    tempCanvas.pixelDensity(1);

    // Dibuja el medio en un canvas temporal de baja resolución para un análisis rápido.
    tempCanvas.image(media, 0, 0, tempCanvas.width, tempCanvas.height);
    tempCanvas.loadPixels();
    const pixels = this.getRGBPixels(tempCanvas.pixels);
    tempCanvas.remove();

    if (pixels.length === 0) return [];

    // 1. Inicialización de centroides con K-Means++
    let centroids = this.initializeCentroids(pixels, k);

    // 2. Iteraciones de K-Means
    for (let iter = 0; iter < 15; iter++) {
      // Asigna cada píxel a su centroide más cercano
      const assignments = this.assignToCentroids(pixels, centroids);
      // Calcula los nuevos centroides a partir del promedio de los píxeles asignados
      const newCentroids = this.calculateNewCentroids(pixels, assignments, k);
      
      // Si los centroides no cambian, hemos convergido
      if (this.haveCentroidsConverged(centroids, newCentroids)) {
        break;
      }
      centroids = newCentroids;
    }

    // 3. Formatea y ordena los colores resultantes
    return this.formatCentroids(centroids);
  }

  /**
   * Extrae los píxeles como arrays [R, G, B].
   * @param {Uint8ClampedArray} pixelsData - Array de píxeles de un canvas.
   * @returns {Array<[number, number, number]>}
   */
  getRGBPixels(pixelsData) {
    const pixels = [];
    for (let i = 0; i < pixelsData.length; i += 4) {
      pixels.push([pixelsData[i], pixelsData[i + 1], pixelsData[i + 2]]);
    }
    return pixels;
  }

  /**
   * Calcula la distancia euclidiana al cuadrado entre dos colores.
   */
  colorDistanceSq(c1, c2) {
    return ((c1[0] - c2[0]) ** 2) + ((c1[1] - c2[1]) ** 2) + ((c1[2] - c2[2]) ** 2);
  }

  /**
   * Inicializa los centroides usando la estrategia K-Means++.
   */
  initializeCentroids(pixels, k) {
    const centroids = [];
    centroids.push(pixels[Math.floor(Math.random() * pixels.length)]);

    while (centroids.length < k) {
      const distancesSq = pixels.map(pixel => {
        let minDistanceSq = Infinity;
        for (const centroid of centroids) {
          minDistanceSq = Math.min(minDistanceSq, this.colorDistanceSq(pixel, centroid));
        }
        return minDistanceSq;
      });

      const sumDistancesSq = distancesSq.reduce((a, b) => a + b, 0);
      let rand = Math.random() * sumDistancesSq;
      
      for (let i = 0; i < pixels.length; i++) {
        rand -= distancesSq[i];
        if (rand <= 0) {
          centroids.push(pixels[i]);
          break;
        }
      }
    }
    return centroids;
  }

  /**
   * Asigna cada píxel al índice del centroide más cercano.
   */
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

  /**
   * Calcula los nuevos centroides promediando los píxeles asignados.
   */
  calculateNewCentroids(pixels, assignments, k) {
    const newCentroids = Array.from({ length: k }, () => [0, 0, 0]);
    const counts = new Array(k).fill(0);

    pixels.forEach((pixel, i) => {
      const centroidIndex = assignments[i];
      newCentroids[centroidIndex][0] += pixel[0];
      newCentroids[centroidIndex][1] += pixel[1];
      newCentroids[centroidIndex][2] += pixel[2];
      counts[centroidIndex]++;
    });

    return newCentroids.map((centroid, i) =>
      counts[i] > 0
        ? [Math.round(centroid[0] / counts[i]), Math.round(centroid[1] / counts[i]), Math.round(centroid[2] / counts[i])]
        : centroids[i] // Si un centroide no tiene píxeles, se mantiene
    );
  }

  /**
   * Comprueba si los centroides han dejado de moverse.
   */
  haveCentroidsConverged(oldCentroids, newCentroids, threshold = 1) {
    for (let i = 0; i < oldCentroids.length; i++) {
      if (this.colorDistanceSq(oldCentroids[i], newCentroids[i]) > threshold) {
        return false;
      }
    }
    return true;
  }

  /**
   * Formatea los centroides a strings hexadecimales y los ordena por luminancia.
   */
  formatCentroids(centroids) {
    const toHex = c => '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
    
    // Ordenar por luminancia para una apariencia más agradable
    return centroids
      .sort((a, b) => 
        (a[0] * 0.299 + a[1] * 0.587 + a[2] * 0.114) - 
        (b[0] * 0.299 + b[1] * 0.587 + b[2] * 0.114)
      )
      .map(toHex);
  }
}

export const paletteGenerator = new PaletteGenerator();
