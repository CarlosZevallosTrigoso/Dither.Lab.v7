/**
 * @file CircularBuffer.js
 * @description Una estructura de datos de tamaño fijo que sobrescribe
 * los elementos más antiguos. Optimizada para calcular promedios móviles.
 */

export class CircularBuffer {
  constructor(size) {
    this.buffer = new Float32Array(size);
    this.size = size;
    this.index = 0;
    this.filled = false;
  }

  /**
   * Añade un nuevo valor al buffer.
   * @param {number} value
   */
  push(value) {
    this.buffer[this.index] = value;
    this.index = (this.index + 1) % this.size;
    if (this.index === 0 && !this.filled) {
      this.filled = true;
    }
  }

  /**
   * Calcula el promedio de los valores en el buffer.
   * @returns {number}
   */
  average() {
    const count = this.filled ? this.size : this.index;
    if (count === 0) return 0;

    let sum = 0;
    for (let i = 0; i < count; i++) {
      sum += this.buffer[i];
    }
    return sum / count;
  }

  /**
   * Limpia el buffer.
   */
  clear() {
    this.index = 0;
    this.filled = false;
    this.buffer.fill(0);
  }
}
