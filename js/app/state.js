/**
 * ============================================================================
 * DitherLab v7 - Módulo de Estado
 * ============================================================================
 * - Gestiona el estado global de la aplicación de forma centralizada.
 * - Es la ÚNICA FUENTE DE VERDAD. Ningún módulo debe modificar el estado
 * directamente, solo a través de las funciones exportadas.
 * - Emite eventos cuando el estado es actualizado para notificar a otros módulos.
 * ============================================================================
 */
import { events } from './events.js';

// Estado inicial y por defecto de la aplicación.
const state = {
  media: null,
  mediaType: null, // 'image' o 'video'
  mediaInfo: {
    width: 0,
    height: 0,
    duration: 0,
    fileName: ''
  },
  isPlaying: false,
  isRecording: false,
  playbackSpeed: 1,

  config: {
    effect: 'floyd-steinberg',
    isMonochrome: false,
    useOriginalColor: false,
    colorCount: 4,
    colors: ['#000000', '#555555', '#AAAAAA', '#FFFFFF'], // Paleta inicial
    ditherScale: 2,
    serpentineScan: false,
    diffusionStrength: 1,
    patternStrength: 0.5,
    brightness: 0,
    contrast: 1.0,
    saturation: 1.0,
    curvesLUTs: null // Look-Up Tables generadas por el editor de curvas
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

/**
 * Actualiza el estado de nivel superior y notifica los cambios.
 * @param {object} newState - Un objeto con las propiedades del estado a actualizar.
 */
export function updateState(newState) {
  Object.assign(state, newState);
  events.emit('state:updated', { ...state });
}

/**
 * Actualiza la configuración específica y notifica los cambios.
 * @param {object} newConfig - Un objeto con las propiedades de config a actualizar.
 */
export function updateConfig(newConfig) {
  Object.assign(state.config, newConfig);
  events.emit('config:updated', { ...state });
}

/**
 * Actualiza la configuración de la timeline y notifica los cambios.
 * @param {object} newTimelineState - Un objeto con las propiedades de la timeline a actualizar.
 */
export function updateTimeline(newTimelineState) {
    Object.assign(state.timeline, newTimelineState);
    events.emit('timeline:updated', { ...state });
}

/**
 * Devuelve una copia inmutable del estado actual para prevenir modificaciones directas.
 * @returns {object} El estado completo de la aplicación.
 */
export function getState() {
  // Se clona para evitar que otros módulos modifiquen el estado original por referencia.
  return JSON.parse(JSON.stringify(state));
}