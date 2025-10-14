/**
 * @file AlgorithmRegistry.js
 * @description Registro central para todos los algoritmos de dithering disponibles.
 * Permite que el sistema sea extensible: para añadir un nuevo algoritmo,
 * solo es necesario registrarlo aquí.
 */

class AlgorithmRegistry {
  constructor() {
    this.algorithms = new Map();
  }

  /**
   * Registra un nuevo algoritmo.
   * @param {BaseAlgorithm} algorithm - Una instancia de una subclase de BaseAlgorithm.
   */
  register(algorithm) {
    if (this.algorithms.has(algorithm.id)) {
      console.warn(`El algoritmo con id '${algorithm.id}' ya está registrado. Será sobreescrito.`);
    }
    this.algorithms.set(algorithm.id, algorithm);
  }

  /**
   * Obtiene un algoritmo por su ID.
   * @param {string} id - El ID del algoritmo a obtener.
   * @returns {BaseAlgorithm|undefined}
   */
  get(id) {
    if (!this.algorithms.has(id)) {
      console.error(`No se encontró el algoritmo con id '${id}'.`);
      return undefined;
    }
    return this.algorithms.get(id);
  }

  /**
   * Devuelve una lista de todos los algoritmos registrados.
   * @returns {BaseAlgorithm[]}
   */
  list() {
    return Array.from(this.algorithms.values());
  }
}

// Exportamos una única instancia para que sea un Singleton.
export const algorithmRegistry = new AlgorithmRegistry();
