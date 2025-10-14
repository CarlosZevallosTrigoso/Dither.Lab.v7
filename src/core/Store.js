/**
 * @file Store.js
 * @description Gestor de estado centralizado para DitherLab.
 * Mantiene el estado de la aplicación, permite actualizaciones y notifica
 * a los suscriptores de los cambios a través del EventBus.
 */

import { eventBus } from './EventBus.js';
import { APP_DEFAULTS } from '../constants/defaults.js';
import { deepMerge, deepClone } from '../utils/objectUtils.js'; // Asumimos que crearemos este helper

class Store {
  constructor(initialState) {
    // Usamos deepClone para evitar mutaciones del estado inicial por referencia
    this.state = deepClone(initialState);
  }

  /**
   * Devuelve una copia profunda del estado actual para evitar mutaciones directas.
   * @returns {object} El estado actual de la aplicación.
   */
  getState() {
    return deepClone(this.state);
  }

  /**
   * Actualiza el estado fusionando el estado parcial proporcionado.
   * @param {object} partialState - Un objeto con las claves y valores a actualizar.
   * @param {boolean} [silent=false] - Si es true, no publicará el evento de actualización.
   */
  setState(partialState, silent = false) {
    // Fusiona el estado actual con el nuevo estado parcial
    this.state = deepMerge(this.state, partialState);

    if (!silent) {
      // Notifica a los suscriptores que el estado ha cambiado
      eventBus.publish('state:updated', this.getState());
    }
  }

  /**
   * Resetea el estado a sus valores iniciales por defecto.
   */
  resetState() {
    this.state = deepClone(APP_DEFAULTS);
    eventBus.publish('state:updated', this.getState());
  }

  /**
   * Obtiene un valor específico del estado por su clave.
   * @param {string} key - La clave del estado a obtener (ej: 'config.ditherScale').
   * @returns {*} El valor de la clave o undefined si no se encuentra.
   */
  getKey(key) {
    return key.split('.').reduce((obj, k) => {
      return obj && obj[k] !== 'undefined' ? obj[k] : undefined;
    }, this.state);
  }
    
  /**
   * Establece un valor específico en el estado por su clave.
   * @param {string} key - La clave del estado a establecer (ej: 'config.ditherScale').
   * @param {*} value - El nuevo valor.
   */
  setKey(key, value) {
    const keys = key.split('.');
    let current = this.state;
    while (keys.length > 1) {
      const k = keys.shift();
      if (!current[k] || typeof current[k] !== 'object') {
        current[k] = {};
      }
      current = current[k];
    }
    current[keys[0]] = value;
    eventBus.publish('state:updated', this.getState());
  }
}

// Inicializamos y exportamos una única instancia del Store
export const store = new Store(APP_DEFAULTS);

// Helpers que irían en utils/objectUtils.js
function deepMerge(target, source) {
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

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function isObject(item) {
  return (item && typeof item === 'object' && !Array.isArray(item));
}
