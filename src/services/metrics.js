/**
 * metrics.js
 * Servicio con funciones puras para el cálculo de métricas de calidad de imagen.
 */

/**
 * Calcula el Peak Signal-to-Noise Ratio (PSNR) entre dos imágenes.
 * @param {p5.Image} original - La imagen original.
 * @param {p5.Image} processed - La imagen procesada.
 * @returns {number} El valor de PSNR en dB (o Infinity si son idénticas).
 */
function calculatePSNR(original, processed) {
  original.loadPixels();
  processed.loadPixels();

  let mse = 0;
  const len = original.pixels.length;

  for (let i = 0; i < len; i += 4) {
    const dr = original.pixels[i] - processed.pixels[i];
    const dg = original.pixels[i + 1] - processed.pixels[i + 1];
    const db = original.pixels[i + 2] - processed.pixels[i + 2];
    mse += (dr * dr + dg * dg + db * db) / 3;
  }

  mse /= (len / 4);

  if (mse === 0) return Infinity;

  const maxPixel = 255;
  return 10 * Math.log10((maxPixel * maxPixel) / mse);
}

/**
 * Calcula el Structural Similarity Index (SSIM) entre dos imágenes.
 * @param {p5.Image} original - La imagen original.
 * @param {p5.Image} processed - La imagen procesada.
 * @returns {number} El valor de SSIM (entre 0 y 1).
 */
function calculateSSIM(original, processed) {
  original.loadPixels();
  processed.loadPixels();

  let meanX = 0, meanY = 0;
  let varX = 0, varY = 0, covXY = 0;
  const len = original.pixels.length / 4;

  for (let i = 0; i < len * 4; i += 4) {
    const x = (original.pixels[i] + original.pixels[i + 1] + original.pixels[i + 2]) / 3;
    const y = (processed.pixels[i] + processed.pixels[i + 1] + processed.pixels[i + 2]) / 3;
    meanX += x;
    meanY += y;
  }

  meanX /= len;
  meanY /= len;

  for (let i = 0; i < len * 4; i += 4) {
    const x = (original.pixels[i] + original.pixels[i + 1] + original.pixels[i + 2]) / 3;
    const y = (processed.pixels[i] + processed.pixels[i + 1] + processed.pixels[i + 2]) / 3;
    varX += (x - meanX) * (x - meanX);
    varY += (y - meanY) * (y - meanY);
    covXY += (x - meanX) * (y - meanY);
  }

  varX /= len;
  varY /= len;
  covXY /= len;

  const c1 = 6.5025;
  const c2 = 58.5225;

  const ssim = ((2 * meanX * meanY + c1) * (2 * covXY + c2)) /
               ((meanX * meanX + meanY * meanY + c1) * (varX + varY + c2));

  return Math.max(0, Math.min(1, ssim));
}

export const metricsService = {
  getPSNR: calculatePSNR,
  getSSIM: calculateSSIM
};