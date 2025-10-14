/**
 * @file ColorCache.js
 * @description Almacena en caché instancias de p5.Color para evitar su recreación.
 * Mejora el rendimiento al reducir la sobrecarga de la función p5.color().
 */

export class ColorCache {
  /**
   * @param {p5} p - La instancia de p5.
   */
  constructor(p) {
    this.p = p;
    this.cache = new Map();
  }

  /**
   * Obtiene un color de la caché o lo crea si no existe.
   * @param {string} hex - El color en formato hexadecimal (ej: "#RRGGBB").
   * @returns {p5.Color}
   */
  getColor(hex) {
    if (!this.cache.has(hex)) {
      this.cache.set(hex, this.p.color(hex));
    }
    return this.cache.get(hex);
  }

  /**
   * Obtiene un array de colores de la caché.
   * @param {string[]} hexArray - Un array de colores en formato hexadecimal.
   * @returns {p5.Color[]}
   */
  getColors(hexArray) {
    return hexArray.map(hex => this.getColor(hex));
  }

  /**
   * Limpia la caché.
   */
  clear() {
    this.cache.clear();
  }
}
