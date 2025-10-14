/**
 * @file BufferPool.js
 * @description Gestiona un pool de buffers (p5.Graphics) para reutilizarlos
 * y mejorar el rendimiento, evitando la creación y destrucción constante.
 */

export class BufferPool {
  constructor() {
    this.buffers = new Map();
    this.lastUsed = new Map();
  }

  /**
   * Obtiene un buffer del pool o crea uno nuevo si no existe.
   * @param {p5} p - La instancia de p5.
   * @param {number} width - El ancho del buffer.
   * @param {number} height - El alto del buffer.
   * @returns {p5.Graphics}
   */
  get(p, width, height) {
    const key = `${width}x${height}`;
    this.lastUsed.set(key, Date.now());

    if (!this.buffers.has(key)) {
      const buffer = p.createGraphics(width, height);
      // Opciones para optimizar el rendimiento del buffer
      buffer.elt.getContext('2d', {
        willReadFrequently: true,
        alpha: false,
      });
      buffer.pixelDensity(1);
      buffer.elt.style.imageRendering = 'pixelated';
      this.buffers.set(key, buffer);
    }
    return this.buffers.get(key);
  }

  /**
   * Limpia los buffers que no se han utilizado en un tiempo.
   * @param {number} [maxAge=60000] - Tiempo en ms para considerar un buffer obsoleto.
   */
  cleanup(maxAge = 60000) {
    const now = Date.now();
    for (const [key, time] of this.lastUsed.entries()) {
      if (now - time > maxAge) {
        this.buffers.get(key)?.remove();
        this.buffers.delete(key);
        this.lastUsed.delete(key);
        console.log(`BufferPool: Limpiado buffer obsoleto ${key}`);
      }
    }
  }

  /**
   * Elimina todos los buffers.
   */
  clear() {
    this.buffers.forEach(b => b.remove());
    this.buffers.clear();
    this.lastUsed.clear();
  }
}
