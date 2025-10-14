/**
 * @file CompressionAnalyzer.js
 * @description Analiza el número de colores únicos para estimar la compresión de la paleta.
 */

export class CompressionAnalyzer {
  /**
   * Analiza los píxeles procesados.
   * @param {Uint8ClampedArray} processedPixels - Píxeles de la imagen procesada.
   * @returns {{unique: number, ratio: number}} - Número de colores únicos y ratio de compresión.
   */
  analyze(processedPixels) {
    const uniqueColors = new Set();
    const len = processedPixels.length;

    for (let i = 0; i < len; i += 4) {
      // Combina R, G, B en un solo número entero para una comprobación rápida
      const color = (processedPixels[i] << 16) | (processedPixels[i + 1] << 8) | processedPixels[i + 2];
      uniqueColors.add(color);
    }
    
    const maxColors = 256 * 256 * 256;
    const ratio = (1 - uniqueColors.size / maxColors) * 100;

    return { 
      unique: uniqueColors.size, 
      ratio: ratio 
    };
  }
}
