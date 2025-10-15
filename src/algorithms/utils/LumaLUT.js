/**
 * @file LumaLUT.js
 * @description Crea y gestiona una Look-Up Table (LUT) para un mapeo
 * rápido de valores de luminancia a los colores de la paleta. (RECONSTRUIDO)
 */

export class LumaLUT {
  constructor() {
    this.lut = new Uint8Array(256 * 3); // RGB para cada uno de los 256 niveles de luma
    this.cachedPaletteSignature = '';
  }

  /**
   * Construye o reconstruye la LUT.
   * Calcula el color más cercano para cada nivel de luma, en lugar de asumir un orden.
   * @param {p5.Color[]} p5colors - El array de colores de la paleta (instancias de p5.Color).
   * @param {p5} p - La instancia de p5.
   */
  build(p5colors, p) {
    const paletteSignature = p5colors.map(c => c.toString()).join('');
    if (paletteSignature === this.cachedPaletteSignature) {
      return; // La LUT ya está actualizada
    }

    if (p5colors.length === 0) return;

    // Pre-calcular la luminancia de cada color en la paleta
    const paletteLumas = p5colors.map(c => 
        p.red(c) * 0.299 + p.green(c) * 0.587 + p.blue(c) * 0.114
    );

    for (let i = 0; i < 256; i++) {
      // Para cada nivel de luma (i), encontrar el color más cercano en la paleta
      let bestMatchIndex = 0;
      let minDistance = Infinity;

      for (let j = 0; j < paletteLumas.length; j++) {
        const distance = Math.abs(i - paletteLumas[j]);
        if (distance < minDistance) {
          minDistance = distance;
          bestMatchIndex = j;
        }
      }

      const bestColor = p5colors[bestMatchIndex];
      const idx = i * 3;
      this.lut[idx] = p.red(bestColor);
      this.lut[idx + 1] = p.green(bestColor);
      this.lut[idx + 2] = p.blue(bestColor);
    }

    this.cachedPaletteSignature = paletteSignature;
  }

  /**
   * Obtiene el color [R, G, B] correspondiente a un valor de luminancia.
   * @param {number} luma - El valor de luminancia (0-255).
   * @returns {number[]} - Un array con los componentes [R, G, B].
   */
  map(luma) {
    const index = Math.max(0, Math.min(Math.floor(luma), 255)) * 3;
    return [this.lut[index], this.lut[index + 1], this.lut[index + 2]];
  }
}
