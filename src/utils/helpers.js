// src/utils/helpers.js

/**
 * Muestra una notificación temporal (toast) en la pantalla.
 * @param {string} message - El mensaje a mostrar.
 * @param {number} duration - La duración en milisegundos.
 */
export function showToast(message, duration = 3000) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'slideIn 0.3s ease-out reverse';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/**
 * Formatea un número de segundos al formato mm:ss.
 * @param {number} seconds - El tiempo total en segundos.
 * @returns {string} - El tiempo formateado.
 */
export function formatTime(seconds) {
  if (isNaN(seconds) || seconds === Infinity) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

/**
 * Retrasa la ejecución de una función hasta que haya pasado un tiempo sin que se llame.
 * @param {function} func - La función a ejecutar.
 * @param {number} wait - El tiempo de espera en milisegundos.
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

/**
 * Asegura que una función se ejecute como máximo una vez cada cierto límite de tiempo.
 * @param {function} func - La función a ejecutar.
 * @param {number} limit - El límite de tiempo en milisegundos.
 */
export function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}
