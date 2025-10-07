/**
 * ============================================================================
 * DitherLab v7 - Módulo de Atajos de Teclado
 * ============================================================================
 * - Centraliza la gestión de todos los atajos de teclado de la aplicación.
 * - Escucha los eventos 'keydown' y emite eventos semánticos para que otros
 * módulos los interpreten, promoviendo el bajo acoplamiento.
 * ============================================================================
 */
import { events } from '../app/events.js';

function handleKeyDown(e) {
  // Ignorar atajos si el usuario está escribiendo en un input, select o textarea.
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
    return;
  }

  // Usamos e.key para un manejo más moderno y legible de las teclas.
  const key = e.key.toLowerCase();

  // Mapeo de teclas a eventos.
  const keyEventMap = {
    ' ': 'playback:toggle', // Espacio
    'arrowleft': 'playback:prev-frame',
    'arrowright': 'playback:next-frame',
    'i': 'timeline:set-marker-in',
    'o': 'timeline:set-marker-out',
    'r': 'export:start-recording',
    's': 'export:stop-recording',
    'd': 'export:png',
    'f': 'ui:toggle-fullscreen',
    'm': 'ui:toggle-metrics-modal',
    '?': 'ui:toggle-shortcuts-modal'
  };

  if (keyEventMap[key]) {
    e.preventDefault(); // Prevenir acciones por defecto del navegador (ej: scroll con espacio).
    events.emit(keyEventMap[key]);
  }

  // Manejo especial para la tecla Escape para cerrar modales.
  if (key === 'escape') {
    events.emit('ui:close-modals');
  }
}

/**
 * Inicializa el módulo de atajos de teclado.
 */
export function initializeKeyboardShortcuts() {
  document.addEventListener('keydown', handleKeyDown);
  console.log('Keyboard Shortcuts Module inicializado.');
}