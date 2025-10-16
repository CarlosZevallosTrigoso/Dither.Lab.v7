/**
 * state.js
 * Manejador de estado centralizado para la aplicación.
 * Es la única fuente de verdad.
 */
import { eventBus } from './event-bus.js';

// Estado inicial por defecto de la aplicación
const initialState = {
  media: null, // Ahora es null por defecto, se asignará al cargar
  mediaType: null, // 'video' o 'image'
  isPlaying: false,
  isRecording: false,
  playbackSpeed: 1.0,

  config: {
    effect: 'floyd-steinberg',
    isMonochrome: false,
    useOriginalColor: false,
    colorCount: 4,
    colors: ['#000000', '#555555', '#aaaaaa', '#ffffff'],
    ditherScale: 2,
    serpentineScan: false,
    diffusionStrength: 1.0,
    patternStrength: 0.5,
    brightness: 0,
    contrast: 1.0,
    saturation: 1.0,
    curvesLUTs: null
  },

  timeline: {
    markerInTime: null,
    markerOutTime: null,
    loopSection: false
  },

  metrics: {
    psnr: 0,
    ssim: 0,
    compression: 0,
    paletteSize: 0,
    processTime: 0
  }
};

// Usamos structuredClone para crear una copia inicial profunda y segura.
let appState = structuredClone(initialState);

// Objeto para manejar las mutaciones del estado de forma controlada
export const state = {
  /**
   * Obtiene una copia del estado actual para evitar mutaciones directas.
   * @returns {object} Una copia profunda del estado actual.
   */
  get() {
    // FIX: Reemplazamos JSON.stringify por structuredClone.
    // Esto permite clonar objetos complejos como los de p5.js sin errores.
    return structuredClone(appState);
  },

  /**
   * Aplica cambios al estado y notifica a los suscriptores.
   * @param {object} changes - Un objeto con las claves del estado a modificar.
   */
  mutate(changes) {
    // Fusión profunda para actualizar el estado
    Object.keys(changes).forEach(key => {
      // El objeto 'media' se asigna directamente, no se fusiona.
      if (key === 'media') {
        appState.media = changes.media;
      } else if (typeof changes[key] === 'object' && changes[key] !== null && !Array.isArray(changes[key])) {
        appState[key] = { ...appState[key], ...changes[key] };
      } else {
        appState[key] = changes[key];
      }
    });
    
    // Notifica que el estado ha cambiado, pasando una copia segura.
    eventBus.publish('state:changed', this.get());
  },

  /**
   * Resetea el estado a su valor inicial.
   */
  reset() {
    // Conservamos el objeto 'media' si existe, para no tener que recargarlo.
    const currentMedia = appState.media;
    appState = structuredClone(initialState);
    appState.media = currentMedia; // Restauramos la media actual

    eventBus.publish('state:changed', this.get());
  }
};
