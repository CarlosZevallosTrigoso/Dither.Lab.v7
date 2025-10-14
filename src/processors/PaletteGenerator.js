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
    
    // (NUEVO) Aumentar el tamaño del canvas para un muestreo de color más preciso.
    const tempCanvas = p.createGraphics(200, 200);
    tempCanvas.pixelDensity(1);

    tempCanvas.image(media, 0, 0, tempCanvas.width, tempCanvas.height);
    tempCanvas.loadPixels();
    const pixels = this.getRGBPixels(tempCanvas.pixels);
    tempCanvas.remove();

    if (pixels.length === 0) return [];

    let centroids = this.initializeCentroids(pixels, k);

    for (let iter = 0; iter < 15; iter++) {
      const assignments = this.assignToCentroids(pixels, centroids);
      const newCentroids = this.calculateNewCentroids(pixels, assignments, k, centroids);
      
      if (this.haveCentroidsConverged(centroids, newCentroids)) {
        break;
      }
      centroids = newCentroids;
    }

    return this.formatCentroids(centroids);
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
        ? [Math.round(centroid[0] / counts[i]), Math.round(centroid[1] / counts[i]), Math.round(centroid[2] / counts[i])]
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
    const toHex = c => '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
    
    return centroids
      .sort((a, b) => 
        (a[0] * 0.299 + a[1] * 0.587 + a[2] * 0.114) - 
        (b[0] * 0.299 + b[1] * 0.587 + b[2] * 0.114)
      )
      .map(toHex);
  }
}

export const paletteGenerator = new PaletteGenerator();
