/**
 * @file DOMHelpers.js
 * @description Funciones de utilidad para simplificar la selección de elementos del DOM.
 */

/**
 * Alias para document.querySelector.
 * @param {string} selector - El selector CSS.
 * @param {Element} [context=document] - El elemento dentro del cual buscar.
 * @returns {Element|null}
 */
export function $(selector, context = document) {
  return context.querySelector(selector);
}

/**
 * Alias para document.querySelectorAll.
 * @param {string} selector - El selector CSS.
 * @param {Element} [context=document] - El elemento dentro del cual buscar.
 * @returns {NodeList}
 */
export function $$(selector, context = document) {
  return context.querySelectorAll(selector);
}
