/**
 * @file PSNR.js
 * @description Calcula la métrica PSNR (Peak Signal-to-Noise Ratio).
 */

export class PSNR {
  /**
   * Calcula el PSNR entre dos buffers de píxeles.
   * @param {Uint8ClampedArray} originalPixels - Píxeles de la imagen original.
   * @param {Uint8ClampedArray} processedPixels - Píxeles de la imagen procesada.
   * @returns {number} El valor de PSNR en decibelios (dB).
   */
  calculate(originalPixels, processedPixels) {
    let mse = 0;
    const len = originalPixels.length;
    const pixelCount = len / 4;

    for (let i = 0; i < len; i += 4) {
      const dr = originalPixels[i] - processedPixels[i];
      const dg = originalPixels[i + 1] - processedPixels[i + 1];
      const db = originalPixels[i + 2] - processedPixels[i + 2];
      // Promedio del error al cuadrado para los 3 canales
      mse += (dr * dr + dg * dg + db * db) / 3;
    }
    
    mse /= pixelCount;

    if (mse === 0) {
      return Infinity; // Las imágenes son idénticas
    }

    const maxPixelValue = 255;
    return 10 * Math.log10((maxPixelValue * maxPixelValue) / mse);
  }
}
