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
      await this.generatePalette(img, 'image', store.getState().config);
      eventBus.publish('ui:showToast', { message: 'Imagen cargada con éxito.' });

    }, () => {
      eventBus.publish('ui:showToast', { message: 'Error al cargar la imagen.' });
    });
  }

  /**
   * Carga un video de forma robusta, asegurando que el primer fotograma esté listo.
   * @param {string} url - La URL del objeto del video.
   */
  loadVideo(url) {
    const video = this.p5.createVideo([url]);
    video.volume(0);
    video.hide();
    this.currentMediaInstance = video;

    // 1. Esperar a que los metadatos (dimensiones, duración) estén listos.
    video.elt.addEventListener('loadedmetadata', () => {
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

      // 2. Escuchar el evento 'seeked' UNA SOLA VEZ.
      video.elt.addEventListener('seeked', async () => {
        // 4. (CRUCIAL) Dar al navegador un ciclo de renderizado para pintar el fotograma.
        await new Promise(resolve => setTimeout(resolve, 150));
        
        // 5. Ahora es seguro generar la paleta.
        await this.generatePalette(video, 'video', store.getState().config);
        eventBus.publish('ui:showToast', { message: 'Video cargado con éxito.' });

      }, { once: true }); // El { once: true } es clave para evitar loops.

      // 3. Mover el video a un punto muy temprano (no t=0) para forzar la decodificación.
      video.time(0.1);

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
    
    if (type === 'video') {
      media.pause();
    }

    try {
      const newPalette = await paletteGenerator.generate(media, config, this.p5);
      
      if (newPalette.length > 0) {
        console.log('MediaLoader: Paleta generada exitosamente:', newPalette);
        store.setKey('config.colors', newPalette);
      } else {
        console.warn('MediaLoader: Paleta vacía, usando valores por defecto');
        store.setKey('config.colors', ['#000000', '#555555', '#aaaaaa', '#ffffff']);
      }
    } catch (error) {
      console.error("MediaLoader: Error al generar la paleta:", error);
      eventBus.publish('ui:showToast', { message: 'Error al analizar los colores. Usando paleta por defecto.' });
      store.setKey('config.colors', ['#000000', '#555555', '#aaaaaa', '#ffffff']);
    }
  }

  /**
   * Vuelve a generar la paleta cuando un control de la UI lo solicita.
   */
  async regeneratePalette() {
      const { media, config } = store.getState();
      if (media.isLoaded && media.instance) {
          // Reutilizamos la misma lógica robusta para asegurar consistencia
          if (media.type === 'video') {
            media.instance.elt.addEventListener('seeked', async () => {
              await new Promise(resolve => setTimeout(resolve, 150));
              await this.generatePalette(media.instance, media.type, config);
            }, { once: true });
            media.instance.time(media.instance.time()); // Vuelve a buscar el frame actual
          } else {
            await this.generatePalette(media.instance, media.type, config);
          }
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
