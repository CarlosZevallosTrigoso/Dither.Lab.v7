// src/core/appState.js

/**
 * AppState - Gestor de estado centralizado para DitherLab v7.
 * Actúa como la única fuente de la verdad para toda la aplicación.
 * Utiliza un patrón de suscripción para notificar a los módulos
 * cuando el estado cambia.
 */
export default class AppState {
  constructor() {
    // Estado inicial de la aplicación
    this.media = null;
    this.mediaType = null; // 'video' o 'image'
    this.isPlaying = false;
    this.isRecording = false;
    this.playbackSpeed = 1;

    // Configuración de renderizado y efectos
    this.config = {
      effect: 'floyd-steinberg',
      isMonochrome: false,
      useOriginalColor: false,
      colorCount: 4,
      colors: ['#000000', '#555555', '#aaaaaa', '#ffffff'], // Default grayscale
      ditherScale: 2,
      serpentineScan: false,
      diffusionStrength: 1,
      patternStrength: 0.5,
      brightness: 0,
      contrast: 1.0,
      saturation: 1.0,
      curvesLUTs: null, // Look-Up Tables generadas por el editor de curvas
    };

    // Estado de la línea de tiempo para videos
    this.timeline = {
      markerInTime: null,
      markerOutTime: null,
      loopSection: false,
      duration: 0,
      currentTime: 0,
    };

    // Métricas de rendimiento y calidad
    this.metrics = {
      psnr: 0,
      ssim: 0,
      compression: 0,
      paletteSize: 0,
      processTime: 0,
      fps: 0,
    };

    this.listeners = new Set();
  }

  /**
   * Permite que otros módulos se suscriban a los cambios de estado.
   * @param {function} callback - La función a llamar cuando el estado cambie.
   * @returns {function} - Una función para desuscribirse.
   */
  subscribe(callback) {
    this.listeners.add(callback);
    // Devuelve una función para que el componente pueda "limpiarse" y desuscribirse
    return () => this.listeners.delete(callback);
  }

  /**
   * Notifica a todos los suscriptores que el estado ha cambiado.
   * Se llama internamente después de cada modificación.
   */
  notify() {
    // Pasamos una copia inmutable del estado para evitar modificaciones accidentales
    const immutableState = JSON.parse(JSON.stringify(this));
    this.listeners.forEach(callback => callback(immutableState));
  }

  /**
   * Método genérico para actualizar el estado principal.
   * @param {object} changes - Un objeto con las claves y valores a actualizar.
   */
  update(changes) {
    Object.assign(this, changes);
    this.notify();
  }

  /**
   * Método específico para actualizar la configuración de renderizado.
   * @param {object} changes - Un objeto con las claves y valores a actualizar en `config`.
   */
  updateConfig(changes) {
    Object.assign(this.config, changes);
    this.notify();
  }
  
  /**
   * Método específico para actualizar el estado de la línea de tiempo.
   * @param {object} changes - Un objeto con las claves y valores a actualizar en `timeline`.
   */
  updateTimeline(changes) {
    Object.assign(this.timeline, changes);
    this.notify();
  }
}
