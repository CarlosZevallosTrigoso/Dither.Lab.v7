/**
 * @file LumaLUT.js
 * @description Crea y gestiona una Look-Up Table (LUT) para un mapeo
 * rápido de valores de luminancia a los colores de la paleta.
 */

export class LumaLUT {
  constructor() {
    this.lut = new Uint8Array(256 * 3); // RGB para cada uno de los 256 niveles de luma
    this.cachedPaletteSignature = '';
  }

  /**
   * Construye o reconstruye la LUT si la paleta ha cambiado.
   * @param {p5.Color[]} p5colors - El array de colores de la paleta (instancias de p5.Color).
   * @param {p5} p - La instancia de p5.
   */
  build(p5colors, p) {
    const paletteSignature = p5colors.map(c => c.toString()).join('');
    if (paletteSignature === this.cachedPaletteSignature) {
      return; // La LUT ya está actualizada
    }

    const count = p5colors.length;
    if (count === 0) return;

    for (let i = 0; i < 256; i++) {
      // Mapea el valor de luma (0-255) al índice más cercano en la paleta
      const index = Math.min(Math.floor((i / 255) * count), count - 1);
      const color = p5colors[index];
      const idx = i * 3;
      this.lut[idx] = p.red(color);
      this.lut[idx + 1] = p.green(color);
      this.lut[idx + 2] = p.blue(color);
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
