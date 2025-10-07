/**
 * ============================================================================
 * DitherLab v7 - Funciones de Utilidad (Helpers)
 * ============================================================================
 * - Contiene funciones auxiliares genéricas que pueden ser utilizadas por
 * cualquier módulo de la aplicación.
 * - Fomenta la reutilización de código y mantiene los otros módulos más limpios.
 * ============================================================================
 */

/**
 * Muestra un mensaje temporal en pantalla (toast).
 * @param {string} message - El mensaje a mostrar.
 * @param {number} [duration=3000] - La duración en milisegundos.
 */
export function showToast(message, duration = 3000) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    // Agrega una clase para la animación de salida
    toast.classList.add('toast-fade-out');
    // Espera a que termine la animación para remover el elemento
    toast.addEventListener('animationend', () => toast.remove());
  }, duration);
}

/**
 * Formatea un número de segundos al formato "mm:ss".
 * @param {number} seconds - El tiempo en segundos.
 * @returns {string} El tiempo formateado.
 */
export function formatTime(seconds) {
  if (isNaN(seconds) || seconds === Infinity) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

/**
 * Limita la ejecución de una función para que solo se dispare una vez
 * que ha pasado un tiempo sin ser llamada. Útil para eventos de 'input'.
 * @param {Function} func - La función a ejecutar.
 * @param {number} wait - El tiempo de espera en milisegundos.
 * @returns {Function} La función con debounce.
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
 * Limita la ejecución de una función a una vez cada X milisegundos.
 * Útil para eventos continuos como 'mousemove' o 'scroll'.
 * @param {Function} func - La función a ejecutar.
 * @param {number} limit - El intervalo de tiempo mínimo entre ejecuciones.
 * @returns {Function} La función con throttle.
 */
export function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}