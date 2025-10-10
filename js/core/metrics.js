/**
 * ============================================================================
 * DitherLab v7 - Módulo de Métricas de Calidad de Imagen
 * ============================================================================
 * - Contiene las funciones matemáticas para analizar y comparar la calidad
 * entre la imagen original y la procesada.
 * - Incluye cálculos como PSNR (Peak Signal-to-Noise Ratio) y SSIM
 * (Structural Similarity Index).
 * ============================================================================
 */

/**
 * Calcula el PSNR entre dos arrays de píxeles.
 * Un valor más alto indica una mejor calidad (menos error).
 * @param {Uint8ClampedArray} originalPixels - El array de píxeles de la imagen original.
 * @param {Uint8ClampedArray} processedPixels - El array de píxeles de la imagen procesada.
 * @returns {number|Infinity} El valor de PSNR en decibelios (dB).
 */
export function calculatePSNR(originalPixels, processedPixels) {
  let mse = 0;
  const len = originalPixels.length;

  for (let i = 0; i < len; i += 4) {
    const dr = originalPixels[i] - processedPixels[i];
    const dg = originalPixels[i + 1] - processedPixels[i + 1];
    const db = originalPixels[i + 2] - processedPixels[i + 2];
    mse += (dr * dr + dg * dg + db * db) / 3;
  }

  mse /= (len / 4);

  if (mse === 0) return Infinity; // Las imágenes son idénticas

  const maxPixel = 255;
  return 10 * Math.log10((maxPixel * maxPixel) / mse);
}

/**
 * Calcula el SSIM entre dos arrays de píxeles.
 * Un valor cercano a 1 indica una alta similitud estructural.
 * @param {Uint8ClampedArray} originalPixels - El array de píxeles de la imagen original.
 * @param {Uint8ClampedArray} processedPixels - El array de píxeles de la imagen procesada.
 * @returns {number} El índice SSIM, un valor entre 0 y 1.
 */
export function calculateSSIM(originalPixels, processedPixels) {
  let meanX = 0, meanY = 0;
  let varX = 0, varY = 0, covXY = 0;
  const len = originalPixels.length / 4;

  // Convertir a escala de grises y calcular medias
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
    varX += (x - meanX) * (x - meanX);
    varY += (y - meanY) * (y - meanY);
    covXY += (x - meanX) * (y - meanY);
  }

  varX /= len;
  varY /= len;
  covXY /= len;

  // Constantes de estabilización
  const c1 = (0.01 * 255) ** 2;
  const c2 = (0.03 * 255) ** 2;

  const ssim = ((2 * meanX * meanY + c1) * (2 * covXY + c2)) /
               ((meanX * meanX + meanY * meanY + c1) * (varX + varY + c2));

  return Math.max(0, Math.min(1, ssim));
}

/**
 * Calcula el número de colores únicos y el ratio de compresión de paleta.
 * @param {Uint8ClampedArray} pixels - El array de píxeles de la imagen procesada.
 * @returns {{unique: number, ratio: number}} Objeto con el número de colores únicos y el ratio.
 */
export function calculateCompression(pixels) {
  const uniqueColors = new Set();
  const len = pixels.length;

  for (let i = 0; i < len; i += 4) {
    // Crear un solo número para representar el color RGB
    const color = (pixels[i] << 16) | (pixels[i + 1] << 8) | pixels[i + 2];
    uniqueColors.add(color);
  }

  const maxColors = 256 * 256 * 256;
  const ratio = (1 - uniqueColors.size / maxColors) * 100;

  return {
    unique: uniqueColors.size,
    ratio: ratio
  };
}
