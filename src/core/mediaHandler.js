// src/core/mediaHandler.js

import { showToast, formatTime } from '../utils/helpers.js';

/**
 * MediaHandler - Gestiona la carga, inicialización y control
 * de los archivos de imagen y video.
 */
export default class MediaHandler {
  constructor(appState, ditherProcessor) {
    this.appState = appState;
    this.ditherProcessor = ditherProcessor;
    this.p5 = ditherProcessor.p5; // Accedemos a la instancia de p5
    this.currentFileURL = null;
    this.mediaLoadedCallback = null;
  }
  
  /**
   * Registra un callback que se ejecutará cuando un medio se haya cargado.
   * @param {function} callback
   */
  onMediaLoaded(callback) {
      this.mediaLoadedCallback = callback;
  }

  /**
   * Configura los listeners para el drag and drop.
   */
  initializeDropZone() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');

    document.body.addEventListener("dragover", e => {
      e.preventDefault();
      dropZone.classList.add("border-cyan-400");
    });

    document.body.addEventListener("dragleave", () => {
      dropZone.classList.remove("border-cyan-400");
    });

    document.body.addEventListener("drop", e => {
      e.preventDefault();
      dropZone.classList.remove("border-cyan-400");
      if (e.dataTransfer.files.length > 0) {
        this.handleFile(e.dataTransfer.files[0]);
      }
    });

    dropZone.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", e => {
      if (e.target.files.length > 0) {
        this.handleFile(e.target.files[0]);
      }
    });
  }

  /**
   * Procesa el archivo seleccionado por el usuario.
   * @param {File} file
   */
  handleFile(file) {
    // Limpiar medio anterior
    if (this.appState.media) {
      if (this.appState.mediaType === 'video') {
        this.appState.media.pause();
        this.appState.media.remove();
      }
      this.appState.update({ media: null, mediaType: null });
    }
    if (this.currentFileURL) {
      URL.revokeObjectURL(this.currentFileURL);
    }

    const fileType = file.type;
    const isVideo = fileType.startsWith('video/');
    const isImage = fileType.startsWith('image/');

    if (!isVideo && !isImage) {
      showToast('Formato no soportado');
      return;
    }

    this.currentFileURL = URL.createObjectURL(file);
    const mediaType = isVideo ? 'video' : 'image';
    this.appState.update({ mediaType });

    if (isVideo) {
      this.loadVideo(this.currentFileURL);
    } else {
      this.loadImage(this.currentFileURL);
    }
  }

  /**
   * Carga y configura un archivo de video.
   * @param {string} url
   */
  loadVideo(url) {
    const media = this.p5.createVideo([url], () => {
      this.ditherProcessor.p5.resizeCanvasBasedOnMedia(media.width, media.height);
      
      media.volume(0);
      media.speed(this.appState.playbackSpeed);
      
      this.appState.update({ 
          media, 
          isPlaying: false,
          timeline: { ...this.appState.timeline, duration: media.duration() }
      });
      
      if (this.mediaLoadedCallback) {
          this.mediaLoadedCallback('video');
      }

      showToast('Video cargado');
      this.ditherProcessor.triggerRedraw();
      this.p5.loop(); // Iniciar el loop para la reproducción del video
    });
    media.hide();
  }

  /**
   * Carga y configura un archivo de imagen.
   * @param {string} url
   */
  loadImage(url) {
    const media = this.p5.loadImage(url, () => {
      this.ditherProcessor.p5.resizeCanvasBasedOnMedia(media.width, media.height);
      
      this.appState.update({ media });
      
      if (this.mediaLoadedCallback) {
          this.mediaLoadedCallback('image');
      }

      showToast('Imagen cargada');
      this.ditherProcessor.triggerRedraw();
      this.p5.noLoop(); // Detener el loop para imágenes estáticas
    });
  }
}
