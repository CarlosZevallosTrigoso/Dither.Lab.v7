// ============================================================================
// PALETTE GENERATOR - Generación de paletas de color
// ============================================================================

class PaletteGenerator {
  constructor(p5Instance) {
    this.p = p5Instance;
  }

  /**
   * Generar paleta desde media usando K-means
   * @param {p5.Image|p5.MediaElement} media - Imagen o video
   * @param {number} colorCount - Número de colores
   * @returns {Promise<string[]>} - Array de colores hex
   */
  async generateFromMedia(media, colorCount) {
    console.log('🎨 Generando paleta con K-means...');
    
    // Crear canvas temporal pequeño
    const tempCanvas = this.p.createGraphics(100, 100);
    tempCanvas.pixelDensity(1);
    
    // Pausar video si es necesario
    const isVideo = media.elt && media.elt.tagName === 'VIDEO';
    if (isVideo) {
      media.pause();
      media.time(0);
      await new Promise(r => setTimeout(r, 200));
    }
    
    // Copiar imagen a canvas temporal
    tempCanvas.image(media, 0, 0, tempCanvas.width, tempCanvas.height);
    tempCanvas.loadPixels();
    
    // Extraer píxeles como array de [r, g, b]
    const pixels = [];
    for (let i = 0; i < tempCanvas.pixels.length; i += 4) {
      pixels.push([
        tempCanvas.pixels[i],
        tempCanvas.pixels[i + 1],
        tempCanvas.pixels[i + 2]
      ]);
    }
    
    // Aplicar K-means
    const centroids = this.kMeans(pixels, colorCount);
    
    // Limpiar
    tempCanvas.remove();
    
    // Convertir a hex y ordenar por luminosidad
    const hexColors = centroids
      .map(c => this.rgbToHex(c))
      .sort((a, b) => {
        const lumaA = this.hexToLuma(a);
        const lumaB = this.hexToLuma(b);
        return lumaA - lumaB;
      });
    
    console.log('✅ Paleta generada:', hexColors);
    return hexColors;
  }

  /**
   * Algoritmo K-means para clustering de colores
   * @param {Array} pixels - Array de píxeles [r, g, b]
   * @param {number} k - Número de clusters
   * @returns {Array} - Centroides finales
   */
  kMeans(pixels, k) {
    // K-means++ initialization
    const centroids = this.kMeansPlusPlusInit(pixels, k);
    
    const maxIterations = 10;
    const assignments = new Array(pixels.length);
    
    for (let iter = 0; iter < maxIterations; iter++) {
      // Asignar píxeles a centroides más cercanos
      for (let i = 0; i < pixels.length; i++) {
        let minDist = Infinity;
        let bestCentroid = 0;
        
        for (let j = 0; j < centroids.length; j++) {
          const dist = this.colorDistance(pixels[i], centroids[j]);
          if (dist < minDist) {
            minDist = dist;
            bestCentroid = j;
          }
        }
        
        assignments[i] = bestCentroid;
      }
      
      // Recalcular centroides
      const previousCentroids = centroids.map(c => [...c]);
      const newCentroids = new Array(k).fill(0).map(() => [0, 0, 0]);
      const counts = new Array(k).fill(0);
      
      for (let i = 0; i < pixels.length; i++) {
        const centroidIndex = assignments[i];
        newCentroids[centroidIndex][0] += pixels[i][0];
        newCentroids[centroidIndex][1] += pixels[i][1];
        newCentroids[centroidIndex][2] += pixels[i][2];
        counts[centroidIndex]++;
      }
      
      for (let i = 0; i < k; i++) {
        if (counts[i] > 0) {
          centroids[i] = [
            Math.round(newCentroids[i][0] / counts[i]),
            Math.round(newCentroids[i][1] / counts[i]),
            Math.round(newCentroids[i][2] / counts[i])
          ];
        }
      }
      
      // Verificar convergencia
      if (this.centroidsEqual(centroids, previousCentroids)) {
        console.log(`  K-Means convergió en ${iter + 1} iteraciones`);
        break;
      }
    }
    
    return centroids;
  }

  /**
   * K-means++ initialization
   */
  kMeansPlusPlusInit(pixels, k) {
    const centroids = [];
    
    // Primer centroide aleatorio
    centroids.push([...pixels[Math.floor(Math.random() * pixels.length)]]);
    
    // Resto de centroides con probabilidad proporcional a distancia²
    while (centroids.length < k) {
      const distances = pixels.map(p => {
        let minDist = Infinity;
        for (const c of centroids) {
          minDist = Math.min(minDist, this.colorDistance(p, c));
        }
        return minDist * minDist;
      });
      
      const sumDist = distances.reduce((a, b) => a + b, 0);
      let rand = Math.random() * sumDist;
      
      for (let i = 0; i < pixels.length; i++) {
        rand -= distances[i];
        if (rand <= 0) {
          centroids.push([...pixels[i]]);
          break;
        }
      }
    }
    
    return centroids;
  }

  /**
   * Distancia euclidiana entre dos colores RGB
   */
  colorDistance(c1, c2) {
    const dr = c1[0] - c2[0];
    const dg = c1[1] - c2[1];
    const db = c1[2] - c2[2];
    return Math.sqrt(dr * dr + dg * dg + db * db);
  }

  /**
   * Verificar si dos arrays de centroides son iguales
   */
  centroidsEqual(a, b, threshold = 1) {
    return a.every((c, i) => 
      Math.abs(c[0] - b[i][0]) < threshold &&
      Math.abs(c[1] - b[i][1]) < threshold &&
      Math.abs(c[2] - b[i][2]) < threshold
    );
  }

  /**
   * Convertir RGB a HEX
   */
  rgbToHex(rgb) {
    return '#' + rgb.map(v => v.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Calcular luminosidad de un color hex
   */
  hexToLuma(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return r * 0.299 + g * 0.587 + b * 0.114;
  }
}

// Exportar
if (typeof window !== 'undefined') {
  window.PaletteGenerator = PaletteGenerator;
}