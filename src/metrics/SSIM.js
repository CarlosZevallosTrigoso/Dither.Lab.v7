/**
 * @file SSIM.js
 * @description Calcula la métrica SSIM (Structural Similarity Index).
 */

export class SSIM {
  /**
   * Calcula el SSIM entre dos buffers de píxeles.
   * @param {Uint8ClampedArray} originalPixels - Píxeles de la imagen original.
   * @param {Uint8ClampedArray} processedPixels - Píxeles de la imagen procesada.
   * @returns {number} El índice SSIM, un valor entre 0 y 1.
   */
  calculate(originalPixels, processedPixels) {
    let meanX = 0, meanY = 0;
    let varX = 0, varY = 0, covXY = 0;
    const len = originalPixels.length / 4;

    // Calcular promedios de luminancia
    for (let i = 0; i < len * 4; i += 4) {
      const x = (originalPixels[i] * 0.299 + originalPixels[i + 1] * 0.587 + originalPixels[i + 2] * 0.114);
      const y = (processedPixels[i] * 0.299 + processedPixels[i + 1] * 0.587 + processedPixels[i + 2] * 0.114);
      meanX += x;
      meanY += y;
    }
    meanX /= len;
    meanY /= len;

    // Calcular varianzas y covarianza
    for (let i = 0; i < len * 4; i += 4) {
      const x = (originalPixels[i] * 0.299 + originalPixels[i + 1] * 0.587 + originalPixels[i + 2] * 0.114);
      const y = (processedPixels[i] * 0.299 + processedPixels[i + 1] * 0.587 + processedPixels[i + 2] * 0.114);
      varX += (x - meanX) ** 2;
      varY += (y - meanY) ** 2;
      covXY += (x - meanX) * (y - meanY);
    }
    varX /= (len - 1);
    varY /= (len - 1);
    covXY /= (len - 1);

    // Constantes de estabilización
    const L = 255;
    const k1 = 0.01;
    const k2 = 0.03;
    const c1 = (k1 * L) ** 2;
    const c2 = (k2 * L) ** 2;

    const ssim = ((2 * meanX * meanY + c1) * (2 * covXY + c2)) /
                 ((meanX ** 2 + meanY ** 2 + c1) * (varX + varY + c2));

    return Math.max(0, Math.min(1, ssim));
  }
}
