/**
 * @file throttle.js
 * @description Limita la ejecución de una función a una vez cada X milisegundos.
 * Ideal para eventos que se disparan continuamente (scroll, resize, input).
 */

export function throttle(func, limit) {
  let inThrottle;
  let lastResult;
  return function (...args) {
    if (!inThrottle) {
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
      lastResult = func.apply(this, args);
    }
    return lastResult;
  };
}
