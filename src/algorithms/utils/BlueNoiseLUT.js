/**
 * @file BlueNoiseLUT.js
 * @description Proporciona acceso a una textura de ruido azul precalculada.
 * La textura es de 8x8 y está normalizada al rango [-0.5, 0.5].
 */

export class BlueNoiseLUT {
  constructor() {
    // Textura de ruido azul de 8x8 precalculada mediante "void-and-cluster"
    // y normalizada (valor original - 0.5).
    this.noise = new Float32Array([
       0.03, -0.32,  0.21, -0.09,  0.44, -0.26,  0.32, -0.03,
      -0.38,  0.15, -0.21,  0.38, -0.44,  0.09, -0.15,  0.26,
       0.26, -0.15,  0.44, -0.32,  0.21, -0.38,  0.38, -0.26,
      -0.26,  0.32, -0.03,  0.15, -0.21,  0.44, -0.09,  0.09,
       0.38, -0.44,  0.21, -0.15,  0.32, -0.32,  0.15, -0.38,
      -0.09,  0.09, -0.38,  0.26, -0.26, -0.03,  0.44, -0.21,
       0.15, -0.21,  0.38, -0.44,  0.09,  0.21, -0.15,  0.32,
      -0.32,  0.44, -0.26,  0.03, -0.38,  0.26, -0.03, -0.09
    ]);
  }

  /**
   * Obtiene el valor de ruido para una coordenada (x, y).
   * @param {number} x - Coordenada X del píxel.
   * @param {number} y - Coordenada Y del píxel.
   * @returns {number} El valor de ruido normalizado.
   */
  get(x, y) {
    const index = (y % 8) * 8 + (x % 8);
    return this.noise[index];
  }
}
