/**
 * @file debounce.js
 * @description Retrasa la ejecución de una función hasta que haya transcurrido
 * un tiempo determinado sin que se vuelva a llamar.
 */

export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
