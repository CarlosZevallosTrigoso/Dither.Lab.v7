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

    // 🔥 SOLUCIÓN MÁS AGRESIVA: Esperar a 'canplaythrough' para asegurar que hay datos suficientes
    video.elt.addEventListener('canplaythrough', async () => {
      const videoElement = video.elt;

      console.log('MediaLoader: Video puede reproducirse completamente');

      try {
        // 1. Validar duración
        if (!videoElement.duration || videoElement.duration === 0 || !isFinite(videoElement.duration)) {
          console.error('MediaLoader: Video no tiene duración válida');
          return;
        }

        // 2. Primero reproducir el video para asegurar renderizado inicial
        console.log('MediaLoader: Reproduciendo video brevemente...');
        try {
          await videoElement.play();
        } catch (playError) {
          console.warn('MediaLoader: Play inicial bloqueado:', playError.message);
        }

        // 3. Esperar 200ms para que se renderice al menos un frame
        await new Promise(resolve => setTimeout(resolve, 200));

        // 4. Pausar
        videoElement.pause();
        console.log('MediaLoader: Video pausado');

        // 5. Buscar un frame significativo (30% del video en lugar de 10%)
        const targetTime = Math.min(
          Math.max(videoElement.duration * 0.3, 0.5), 
          videoElement.duration - 0.5
        );
        
        console.log(`MediaLoader: Buscando frame en ${targetTime.toFixed(2)}s de ${videoElement.duration.toFixed(2)}s`);

        // 6. Hacer seek con timeout
        await Promise.race([
          new Promise((resolve, reject) => {
            const onSeeked = () => {
              videoElement.removeEventListener('seeked', onSeeked);
              videoElement.removeEventListener('error', onError);
              resolve();
            };
            const onError = (e) => {
              videoElement.removeEventListener('seeked', onSeeked);
              videoElement.removeEventListener('error', onError);
              reject(new Error('Error en seek: ' + e.message));
            };
            
            videoElement.addEventListener('seeked', onSeeked, { once: true });
            videoElement.addEventListener('error', onError, { once: true });
            videoElement.currentTime = targetTime;
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout en seek')), 5000)
          )
        ]);

        console.log('MediaLoader: Seek completado');

        // 7. Reproducir NUEVAMENTE para forzar el renderizado del nuevo frame
        try {
          await videoElement.play();
        } catch (e) {
          console.warn('MediaLoader: Play post-seek bloqueado');
        }
        
        // 8. Esperar 3 frames de animación para asegurar renderizado completo
        await new Promise(resolve => requestAnimationFrame(resolve));
        await new Promise(resolve => requestAnimationFrame(resolve));
        await new Promise(resolve => requestAnimationFrame(resolve));
        
        // 9. Pausar de nuevo
        videoElement.pause();
        
        // 10. Esperar un frame más
        await new Promise(resolve => requestAnimationFrame(resolve));

        console.log('MediaLoader: Frame estable, generando paleta...');

        // 11. Generar paleta
        await this.generatePalette(video, 'video', store.getState().config);

      } catch (error) {
        console.error('MediaLoader: Error al preparar video:', error);
        eventBus.publish('ui:showToast', { 
          message: 'No se pudo generar la paleta automáticamente. Puedes regenerarla manualmente.' 
        });
        store.setKey('config.colors', ['#000000', '#555555', '#aaaaaa', '#ffffff']);
      }
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
        eventBus.publish('ui:showToast', { message: 'Medio cargado con éxito.' });
      } else {
        console.warn('MediaLoader: Paleta vacía, usando valores por defecto');
        store.setKey('config.colors', ['#000000', '#555555', '#aaaaaa', '#ffffff']);
        eventBus.publish('ui:showToast', { message: 'Medio cargado. Usando paleta por defecto.' });
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
