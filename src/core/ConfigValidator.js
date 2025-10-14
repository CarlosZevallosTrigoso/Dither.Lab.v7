/**
 * @file ConfigValidator.js
 * @description Valida y sanea la configuración de la aplicación.
 * Asegura que todos los valores estén dentro de sus rangos y tipos esperados,
 * especialmente útil al cargar presets de localStorage.
 */

import { ALGORITHMS } from '../constants/algorithms.js';

const VALIDATION_RULES = {
  effect: { type: 'string', enum: Object.keys(ALGORITHMS) },
  isMonochrome: { type: 'boolean' },
  useOriginalColor: { type: 'boolean' },
  colorCount: { type: 'number', min: 2, max: 16 },
  ditherScale: { type: 'number', min: 1, max: 10 },
  serpentineScan: { type: 'boolean' },
  diffusionStrength: { type: 'number', min: 0, max: 1.5 },
  patternStrength: { type: 'number', min: 0, max: 1.0 },
  brightness: { type: 'number', min: -100, max: 100 },
  contrast: { type: 'number', min: 0, max: 2.0 },
  saturation: { type: 'number', min: 0, max: 2.0 },
};

class ConfigValidator {
  constructor(rules) {
    this.rules = rules;
  }

  /**
   * Valida un objeto de configuración completo.
   * @param {object} config - La configuración a validar.
   * @param {object} defaults - La configuración por defecto para rellenar valores faltantes.
   * @returns {{sanitizedConfig: object, errors: string[]}} - La configuración saneada y una lista de errores.
   */
  validate(config, defaults) {
    let sanitizedConfig = { ...defaults };
    const errors = [];

    for (const key in defaults) {
      if (config.hasOwnProperty(key)) {
        const value = config[key];
        const rule = this.rules[key];

        if (rule) {
          const { isValid, sanitizedValue, error } = this.validateValue(key, value, rule);
          if (isValid) {
            sanitizedConfig[key] = sanitizedValue;
          } else {
            errors.push(error);
            // Si hay un error, se mantiene el valor por defecto.
          }
        } else {
            // Si no hay regla, simplemente se copia el valor si existe.
            sanitizedConfig[key] = value;
        }
      }
    }

    // Validar colores por separado ya que es un array
    if (config.colors && Array.isArray(config.colors)) {
        sanitizedConfig.colors = config.colors.filter(c => /^#[0-9a-f]{6}$/i.test(c));
    } else {
        sanitizedConfig.colors = defaults.colors;
    }

    return { sanitizedConfig, errors };
  }

  /**
   * Valida un valor individual contra una regla.
   * @param {string} key - El nombre de la clave.
   * @param {*} value - El valor a validar.
   * @param {object} rule - La regla de validación.
   * @returns {{isValid: boolean, sanitizedValue: *, error: string|null}}
   */
  validateValue(key, value, rule) {
    if (typeof value !== rule.type) {
      return { isValid: false, error: `Config error: '${key}' debe ser de tipo '${rule.type}'.` };
    }

    let sanitizedValue = value;

    if (rule.type === 'number') {
      if (rule.min !== undefined && value < rule.min) {
        sanitizedValue = rule.min;
      }
      if (rule.max !== undefined && value > rule.max) {
        sanitizedValue = rule.max;
      }
    }

    if (rule.enum && !rule.enum.includes(value)) {
      return { isValid: false, error: `Config error: '${key}' tiene un valor no permitido.` };
    }

    return { isValid: true, sanitizedValue, error: null };
  }
}

export const configValidator = new ConfigValidator(VALIDATION_RULES);
