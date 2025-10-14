/**
 * @file defaults.js
 * @description Define el estado inicial y los valores por defecto para toda la aplicación.
 */

export const APP_DEFAULTS = {
  // Estado del medio actual
  media: {
    instance: null, // p5.MediaElement
    type: null, // 'image' | 'video'
    isLoaded: false,
    width: 0,
    height: 0,
    duration: 0,
  },

  // Estado del canvas
  canvas: {
    width: 400,
    height: 225,
  },

  // Estado de la reproducción
  playback: {
    isPlaying: false,
    isRecording: false,
    speed: 1,
    currentTime: 0,
  },

  // Configuración del procesamiento
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
    curves: null, // Será gestionado por el CurveProcessor
  },

  // Estado de la línea de tiempo
  timeline: {
    markerInTime: null,
    markerOutTime: null,
    loopSection: false,
  },
  
  // Estado de la UI
  ui: {
      isPanelCollapsed: false,
      activeModal: null // 'shortcuts' | 'metrics' | null
  }
};
