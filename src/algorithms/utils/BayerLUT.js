/**
 * @file BayerLUT.js
 * @description Precalcula y proporciona acceso a una matriz de umbrales de Bayer 4x4.
 */

export class BayerLUT {
  constructor() {
    // Matriz clásica de Bayer 4x4
    const bayerMatrix = [
      [0, 8, 2, 10],
      [12, 4, 14, 6],
      [3, 11, 1, 9],
      [15, 7, 13, 5],
    ];

    // Normalizamos la matriz a un rango de [-0.5, 0.5] para facilitar los cálculos
    this.matrix = new Float32Array(16);
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        this.matrix[y * 4 + x] = bayerMatrix[y][x] / 16.0 - 0.5;
      }
    }
  }

  /**
   * Obtiene el valor de umbral de la matriz para una coordenada (x, y).
   * @param {number} x - Coordenada X del píxel.
   * @param {number} y - Coordenada Y del píxel.
   * @returns {number} El valor de umbral normalizado.
   */
  get(x, y) {
    const index = (y % 4) * 4 + (x % 4);
    return this.matrix[index];
  }
}
