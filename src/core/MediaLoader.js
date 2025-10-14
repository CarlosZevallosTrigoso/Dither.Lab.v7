/**
 * @file MediaLoader.js
 * @description Gestiona la carga de archivos de imagen y video.
 */

import { store } from './Store.js';
import { eventBus } from './EventBus.js';
import { paletteGenerator } from '../processors/PaletteGenerator.js';

class MediaLoader {
  constructor(p) {
    this.p5 = p;
    this.currentFileURL = null;
    this.currentMediaInstance = null;
    eventBus.subscribe('palette:request-regeneration', () => this.regeneratePalette());
  }

  /**
   * Carga un archivo.
   * @param {File} file - El archivo a cargar.
   */
  async loadFile(file) {
    this.cleanup();

    const fileType = file.type;
    const isVideo = fileType.startsWith('video/');
    const isImage = fileType.startsWith('image/');

    if (!isVideo && !isImage) {
      eventBus.publish('ui:showToast', { message: 'Formato de archivo no soportado.' });
      return;
    }

    this.currentFileURL = URL.createObjectURL(file);

    eventBus.publish('ui:showToast', { message: 'Cargando medio...' });

    if (isVideo) {
      this.loadVideo(this.currentFileURL);
    } else {
      this.loadImage(this.currentFileURL);
    }
  }

  /**
   * Carga una imagen.
   * @param {string} url - La URL del objeto de la imagen.
   */
  loadImage(url) {
    this.currentMediaInstance = this.p5.loadImage(url, async (img) => {
      store.setState({
        media: {
          instance: img,
          type: 'image',
          isLoaded: true,
          width: img.width,
          height: img.height,
          duration: 0,
        },
        playback: { isPlaying: false }
      });
      
      eventBus.publish('canvas:resize');
      this.generatePalette(img, 'image', store.getState().config);

    }, () => {
      eventBus.publish('ui:showToast', { message: 'Error al cargar la imagen.' });
    });
  }

  /**
   * Carga un video.
   * @param {string} url - La URL del objeto del video.
   */
  loadVideo(url) {
    const video = this.p5.createVideo([url]);
    video.volume(0);
    video.hide();
    
    video.elt.addEventListener('loadedmetadata', () => {
        this.currentMediaInstance = video;

        store.setState({
            media: {
                instance: video,
                type: 'video',
                isLoaded: true,
                width: video.width,
                height: video.height,
                duration: video.duration(),
            },
            playback: { isPlaying: false }
        });

        eventBus.publish('canvas:resize');
    });

    video.elt.addEventListener('canplay', () => {
        this.generatePalette(video, 'video', store.getState().config);
    }, { once: true });
  }

  /**
   * Genera la paleta de colores para el medio cargado.
   * @param {p5.MediaElement | p5.Image} media - La instancia del medio.
   * @param {string} type - 'image' o 'video'.
   * @param {object} config - El estado de la configuración actual.
   */
  async generatePalette(media, type, config) {
    eventBus.publish('ui:showToast', { message: 'Generando paleta de colores...' });
    
    if (type === 'video') media.pause();

    try {
      const newPalette = await paletteGenerator.generate(media, config, this.p5);
      
      if (newPalette.length > 0) {
        store.setKey('config.colors', newPalette);
      }
      
      eventBus.publish('ui:showToast', { message: 'Medio cargado con éxito.' });
    } catch (error) {
      console.error("Error al generar la paleta:", error);
      eventBus.publish('ui:showToast', { message: 'Error al analizar los colores.' });
    }
  }

  /**
   * Vuelve a generar la paleta cuando un control de la UI lo solicita.
   */
  regeneratePalette() {
      const { media, config } = store.getState();
      if (media.isLoaded && media.instance) {
          this.generatePalette(media.instance, media.type, config);
      }
  }

  /**
   * Limpia los recursos del medio anterior.
   */
  cleanup() {
    if (this.currentMediaInstance) {
      if (this.currentMediaInstance.elt && typeof this.currentMediaInstance.elt.pause === 'function') {
        this.currentMediaInstance.elt.pause();
      }
      if (typeof this.currentMediaInstance.remove === 'function') {
        this.currentMediaInstance.remove();
      }
      this.currentMediaInstance = null;
    }

    if (this.currentFileURL) {
      URL.revokeObjectURL(this.currentFileURL);
      this.currentFileURL = null;
    }

    store.setState({
        media: {
          instance: null,
          isLoaded: false
        }
    });
  }
}

export { MediaLoader };
