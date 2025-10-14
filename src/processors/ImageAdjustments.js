/**
 * @file ImageAdjustments.js
 * @description Aplica ajustes básicos de imagen a un buffer de píxeles.
 * Contiene una función pura que modifica los valores de brillo, contraste y saturación.
 */

class ImageAdjustments {
  /**
   * Aplica brillo, contraste y saturación a un array de píxeles.
   * La operación se realiza in-place (modifica el array original).
   * @param {Uint8ClampedArray} pixels - El array de píxeles en formato [R,G,B,A,...].
   * @param {object} config - El objeto de configuración que contiene los valores de ajuste.
   * @returns {Uint8ClampedArray} El array de píxeles modificado.
   */
  apply(pixels, config) {
    const { brightness, contrast, saturation } = config;

    // Si no hay ajustes que aplicar, se retorna inmediatamente para optimizar.
    if (brightness === 0 && contrast === 1.0 && saturation === 1.0) {
      return pixels;
    }

    const len = pixels.length;
    for (let i = 0; i < len; i += 4) {
      let r = pixels[i];
      let g = pixels[i + 1];
      let b = pixels[i + 2];

      // 1. Contraste: Mapea el rango de 0-255 a -127.5 a 127.5, aplica el factor y revierte.
      r = (r - 127.5) * contrast + 127.5;
      g = (g - 127.5) * contrast + 127.5;
      b = (b - 127.5) * contrast + 127.5;

      // 2. Brillo: Se suma directamente.
      r += brightness;
      g += brightness;
      b += brightness;

      // 3. Saturación: Mezcla el color con su valor de luminancia.
      if (saturation !== 1.0) {
        const luma = r * 0.299 + g * 0.587 + b * 0.114;
        r = luma + (r - luma) * saturation;
        g = luma + (g - luma) * saturation;
        b = luma + (b - luma) * saturation;
      }

      // Asegura que los valores permanezcan en el rango válido [0, 255]
      pixels[i] = Math.max(0, Math.min(255, r));
      pixels[i + 1] = Math.max(0, Math.min(255, g));
      pixels[i + 2] = Math.max(0, Math.min(255, b));
    }

    return pixels;
  }
}

export const imageAdjustments = new ImageAdjustments();
