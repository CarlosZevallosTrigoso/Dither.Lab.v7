/**
 * @file objectUtils.js
 * @description Utilidades para la manipulación profunda de objetos.
 * Proporciona funciones para fusionar y clonar objetos de manera recursiva.
 */

/**
 * Comprueba si un item es un objeto (y no un array o null).
 * @param {*} item - El item a comprobar.
 * @returns {boolean}
 */
function isObject(item) {
  return (item && typeof item === 'object' && !Array.isArray(item));
}

/**
 * Fusiona dos objetos de forma recursiva. Los valores de `source` sobreescriben los de `target`.
 * @param {object} target - El objeto de destino.
 * @param {object} source - El objeto fuente.
 * @returns {object} El objeto fusionado.
 */
export function deepMerge(target, source) {
  const output = { ...target };
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  return output;
}

/**
 * Crea una copia profunda de un objeto utilizando JSON.stringify y JSON.parse.
 * Es rápido pero no funciona con tipos de datos complejos como Fechas, Funciones, undefined, etc.
 * Para DitherLab, que solo maneja datos serializables en su estado, es suficiente.
 * @param {object} obj - El objeto a clonar.
 * @returns {object} Una copia profunda del objeto.
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  return JSON.parse(JSON.stringify(obj));
}
