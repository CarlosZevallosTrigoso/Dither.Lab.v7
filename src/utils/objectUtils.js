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
      // Caso especial: no fusionar la propiedad 'instance', solo asignarla directamente.
      // Esto previene la corrupción de objetos complejos como p5.Image o p5.MediaElement.
      if (key === 'instance') {
        output[key] = source[key];
      } else if (isObject(source[key])) {
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
 * Crea una copia profunda de un objeto.
 * Esta versión es más robusta que JSON.parse(JSON.stringify()) porque puede
 * manejar propiedades especiales.
 * @param {object} obj - El objeto a clonar.
 * @returns {object} Una copia profunda del objeto.
 */
export function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    // Crea un nuevo objeto o array.
    const newObj = Array.isArray(obj) ? [] : {};

    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            // Caso especial: para la clave 'instance', copiamos la referencia, no clonamos.
            // Esto es crucial para preservar los objetos de p5.js.
            if (key === 'instance' && typeof obj[key] === 'object') {
                newObj[key] = obj[key];
            } else {
                // Para todas las demás propiedades, se realiza un clonado recursivo.
                newObj[key] = deepClone(obj[key]);
            }
        }
    }

    return newObj;
}
