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
 * Calcula el PSNR entre dos imágenes (buffers de p5.js).
 * Un valor más alto indica una mejor calidad (menos error).
 * @param {p5.Graphics} original - El buffer de la imagen original.
 * @param {p5.Graphics} processed - El buffer de la imagen procesada.
 * @returns {number|Infinity} El valor de PSNR en decibelios (dB).
 */
export function calculatePSNR(original, processed) {
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

  if (mse === 0) return Infinity; // Las imágenes son idénticas

  const maxPixel = 255;
  return 10 * Math.log10((maxPixel * maxPixel) / mse);
}

/**
 * Calcula el SSIM entre dos imágenes.
 * Un valor cercano a 1 indica una alta similitud estructural.
 * @param {p5.Graphics} original - El buffer de la imagen original.
 * @param {p5.Graphics} processed - El buffer de la imagen procesada.
 * @returns {number} El índice SSIM, un valor entre 0 y 1.
 */
export function calculateSSIM(original, processed) {
  original.loadPixels();
  processed.loadPixels();

  let meanX = 0, meanY = 0;
  let varX = 0, varY = 0, covXY = 0;
  const len = original.pixels.length / 4;

  // Convertir a escala de grises y calcular medias
  for (let i = 0; i < len * 4; i += 4) {
    const x = (original.pixels[i] * 0.299 + original.pixels[i + 1] * 0.587 + original.pixels[i + 2] * 0.114);
    const y = (processed.pixels[i] * 0.299 + processed.pixels[i + 1] * 0.587 + processed.pixels[i + 2] * 0.114);
    meanX += x;
    meanY += y;
  }

  meanX /= len;
  meanY /= len;

  // Calcular varianzas y covarianza
  for (let i = 0; i < len * 4; i += 4) {
    const x = (original.pixels[i] * 0.299 + original.pixels[i + 1] * 0.587 + original.pixels[i + 2] * 0.114);
    const y = (processed.pixels[i] * 0.299 + processed.pixels[i + 1] * 0.587 + processed.pixels[i + 2] * 0.114);
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
 * @param {p5.Graphics} buffer - El buffer de la imagen procesada.
 * @returns {{unique: number, ratio: number}} Objeto con el número de colores únicos y el ratio.
 */
export function calculateCompression(buffer) {
  buffer.loadPixels();

  const uniqueColors = new Set();
  const len = buffer.pixels.length;

  for (let i = 0; i < len; i += 4) {
    // Crear un solo número para representar el color RGB
    const color = (buffer.pixels[i] << 16) | (buffer.pixels[i + 1] << 8) | buffer.pixels[i + 2];
    uniqueColors.add(color);
  }

  const maxColors = 256 * 256 * 256;
  const ratio = (1 - uniqueColors.size / maxColors) * 100;

  return {
    unique: uniqueColors.size,
    ratio: ratio
  };
}