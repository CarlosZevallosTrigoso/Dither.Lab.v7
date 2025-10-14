/**
 * @file formatters.js
 * @description Utilidades para formatear datos para su visualización.
 */

/**
 * Formatea segundos a un string MM:SS.
 * @param {number} seconds - El número de segundos.
 * @returns {string} El tiempo formateado.
 */
export function formatTime(seconds) {
  if (isNaN(seconds) || seconds === Infinity) {
    return '00:00';
  }
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * Capitaliza la primera letra de un string.
 * @param {string} str - El string a capitalizar.
 * @returns {string}
 */
export function capitalize(str) {
    if (typeof str !== 'string' || str.length === 0) {
        return '';
    }
    return str.charAt(0).toUpperCase() + str.slice(1);
}
