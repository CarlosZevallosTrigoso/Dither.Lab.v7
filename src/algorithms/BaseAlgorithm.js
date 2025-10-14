/**
 * @file BaseAlgorithm.js
 * @description Clase base para todos los algoritmos de dithering.
 * Define la interfaz común que deben implementar.
 */

export class BaseAlgorithm {
  /**
   * @param {string} id - El identificador único del algoritmo.
   * @param {string} name - El nombre para mostrar en la UI.
   */
  constructor(id, name) {
    this.id = id;
    this.name = name;
  }

  /**
   * Método principal que procesa los píxeles. Debe ser implementado por las subclases.
   * @param {Uint8ClampedArray} pixels - El array de píxeles del buffer (formato [R,G,B,A,...]).
   * @param {number} width - El ancho del buffer de píxeles.
   * @param {number} height - El alto del buffer de píxeles.
   * @param {object} config - La configuración actual de la aplicación.
   * @param {object} utils - Un objeto con instancias de las utilidades (LumaLUT, etc.).
   */
  process(pixels, width, height, config, utils) {
    throw new Error(`El algoritmo '${this.name}' debe implementar el método 'process'.`);
  }
}
