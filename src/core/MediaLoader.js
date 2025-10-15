/**
 * @file MediaLoader.js
 * @description Gestiona la carga de archivos de imagen y video con validación robusta.
 * VERSIÓN MEJORADA: Incluye retry logic, muestreo múltiple de frames y validación avanzada.
 */

import { store } from './Store.js';
import { eventBus } from './EventBus.js';
import { paletteGenerator } from '../processors/PaletteGenerator.js';

class MediaLoader {
  constructor(p) {
    this.p5 = p;
    this.currentFileURL = null;
    this.currentMediaInstance = null;
    
    // Configuración de retry para videos
    this.videoRetryConfig = {
      maxAttempts: 4,
      timepoints: [0.5, 2.0, 5.0], // Segundos donde intentar capturar
      baseDelay: 600, // ms - aumentado de 150ms
      maxDelay: 1200, // ms
    };
    
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
      await this.loadVideo(this.currentFileURL);
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
      eventBus.publish('ui:showToast', { message: '✅ Imagen cargada con éxito.' });

    }, () => {
      eventBus.publish('ui:showToast', { message: '❌ Error al cargar la imagen.' });
    });
  }

  /**
   * Carga un video con sistema robusto de retry y validación.
   * @param {string} url - La URL del objeto del video.
   */
  async loadVideo(url) {
    const video = this.p5.createVideo([url]);
    video.volume(0);
    video.hide();
    this.currentMediaInstance = video;

    try {
      // Paso 1: Esperar metadatos
      await this.waitForVideoMetadata(video);
      
      // Paso 2: Actualizar estado con info del video
      const duration = video.duration();
      store.setState({
        media: {
          instance: video,
          type: 'video',
          isLoaded: true,
          width: video.width,
          height: video.height,
          duration: duration,
        },
        playback: { isPlaying: false }
      });
      
      eventBus.publish('canvas:resize');
      
      // Paso 3: Intentar capturar frame válido con retry
      const validFrame = await this.captureValidVideoFrame(video, duration);
      
      if (!validFrame) {
        throw new Error('No se pudo obtener un frame válido del video');
      }
      
      // Paso 4: Generar paleta con muestreo múltiple
      await this.generatePaletteFromMultipleFrames(video, duration, store.getState().config);
      
      eventBus.publish('ui:showToast', { message: '✅ Video cargado con éxito.' });
      
    } catch (error) {
      console.error('MediaLoader: Error al cargar video:', error);
      eventBus.publish('ui:showToast', { 
        message: '⚠️ Video cargado pero con problemas en la paleta. Intenta regenerarla manualmente.' 
      });
    }
  }

  /**
   * Espera a que los metadatos del video estén listos.
   * @param {p5.MediaElement} video
   * @returns {Promise<void>}
   */
  waitForVideoMetadata(video) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout esperando metadatos del video'));
      }, 10000); // 10 segundos de timeout

      video.elt.addEventListener('loadedmetadata', () => {
        clearTimeout(timeout);
        resolve();
      }, { once: true });
    });
  }

  /**
   * Intenta capturar un frame válido del video con sistema de retry.
   * @param {p5.MediaElement} video
   * @param {number} duration - Duración del video en segundos
   * @returns {Promise<boolean>}
   */
  async captureValidVideoFrame(video, duration) {
    const { maxAttempts, timepoints, baseDelay, maxDelay } = this.videoRetryConfig;
    
    // Añadir punto medio del video a los timepoints
    const allTimepoints = [
      ...timepoints,
      Math.min(duration / 2, 10) // Mitad del video o 10s (lo que sea menor)
    ].filter(t => t < duration); // Solo timepoints dentro del video
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const timepoint = allTimepoints[attempt % allTimepoints.length];
      const delay = Math.min(baseDelay * (attempt + 1), maxDelay);
      
      console.log(`MediaLoader: Intento ${attempt + 1}/${maxAttempts} en t=${timepoint.toFixed(1)}s con delay=${delay}ms`);
      
      try {
        // Buscar al timepoint
        await this.seekToTime(video, timepoint);
        
        // Esperar que el frame se decodifique
        await this.wait(delay);
        
        // Validar que el frame es bueno
        if (await this.validateVideoFrame(video)) {
          console.log(`MediaLoader: ✅ Frame válido capturado en intento ${attempt + 1}`);
          return true;
        }
        
        console.warn(`MediaLoader: ⚠️ Frame inválido en intento ${attempt + 1}, reintentando...`);
        
      } catch (error) {
        console.error(`MediaLoader: Error en intento ${attempt + 1}:`, error);
      }
    }
    
    console.error('MediaLoader: ❌ No se pudo capturar frame válido después de todos los intentos');
    return false;
  }

  /**
   * Busca a un tiempo específico del video y espera a que se complete.
   * @param {p5.MediaElement} video
   * @param {number} time - Tiempo en segundos
   * @returns {Promise<void>}
   */
  seekToTime(video, time) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Timeout buscando tiempo ${time}s`));
      }, 5000);

      const onSeeked = () => {
        clearTimeout(timeout);
        video.elt.removeEventListener('seeked', onSeeked);
        resolve();
      };

      video.elt.addEventListener('seeked', onSeeked);
      video.time(time);
    });
  }

  /**
   * Valida que un frame de video tiene contenido visual válido.
   * @param {p5.MediaElement} video
   * @returns {Promise<boolean>}
   */
  async validateVideoFrame(video) {
    const testCanvas = this.p5.createGraphics(100, 100);
    testCanvas.pixelDensity(1);
    testCanvas.image(video, 0, 0, 100, 100);
    testCanvas.loadPixels();
    
    const pixels = testCanvas.pixels;
    const sampleSize = Math.min(1000, pixels.length / 4); // Muestrear 1000 píxeles
    
    let totalBrightness = 0;
    let colorVariance = 0;
    let nonBlackPixels = 0;
    let colorfulPixels = 0; // Píxeles con diferencia R-G-B
    
    for (let i = 0; i < sampleSize; i++) {
      const idx = Math.floor(Math.random() * (pixels.length / 4)) * 4;
      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];
      
      const brightness = (r + g + b) / 3;
      totalBrightness += brightness;
      
      if (brightness > 10) {
        nonBlackPixels++;
      }
      
      // Calcular si el píxel tiene "color" (no es gris)
      const rgDiff = Math.abs(r - g);
      const gbDiff = Math.abs(g - b);
      const rbDiff = Math.abs(r - b);
      const maxDiff = Math.max(rgDiff, gbDiff, rbDiff);
      
      if (maxDiff > 15) {
        colorfulPixels++;
      }
      
      colorVariance += brightness * brightness;
    }
    
    testCanvas.remove();
    
    const avgBrightness = totalBrightness / sampleSize;
    const variance = (colorVariance / sampleSize) - (avgBrightness * avgBrightness);
    const nonBlackRatio = nonBlackPixels / sampleSize;
    const colorfulRatio = colorfulPixels / sampleSize;
    
    console.log('MediaLoader: Validación de frame:', {
      avgBrightness: avgBrightness.toFixed(2),
      variance: variance.toFixed(2),
      nonBlackRatio: (nonBlackRatio * 100).toFixed(1) + '%',
      colorfulRatio: (colorfulRatio * 100).toFixed(1) + '%'
    });
    
    // Criterios de validación más estrictos
    const isValid = 
      avgBrightness > 15 &&           // No todo negro
      variance > 100 &&                // Hay variación visual
      nonBlackRatio > 0.5 &&          // Al menos 50% no es negro
      colorfulRatio > 0.1;            // Al menos 10% tiene color
    
    return isValid;
  }

  /**
   * Genera paleta muestreando múltiples frames del video.
   * @param {p5.MediaElement} video
   * @param {number} duration
   * @param {object} config
   */
  async generatePaletteFromMultipleFrames(video, duration, config) {
    eventBus.publish('ui:showToast', { message: '🎨 Analizando video para paleta óptima...' });
    
    video.pause();
    
    // Calcular 5 timepoints distribuidos uniformemente
    const numSamples = 5;
    const timepoints = [];
    for (let i = 0; i < numSamples; i++) {
      const t = (duration * (i + 1)) / (numSamples + 1);
      timepoints.push(t);
    }
    
    console.log('MediaLoader: Muestreando frames en:', timepoints.map(t => t.toFixed(1) + 's'));
    
    try {
      // Capturar todos los frames
      const frames = [];
      for (const timepoint of timepoints) {
        await this.seekToTime(video, timepoint);
        await this.wait(400); // Dar tiempo para decodificación
        
        // Crear snapshot del frame
        const frameCanvas = this.p5.createGraphics(video.width, video.height);
        frameCanvas.pixelDensity(1);
        frameCanvas.image(video, 0, 0);
        frames.push(frameCanvas);
      }
      
      // Generar paleta con los múltiples frames
      const newPalette = await paletteGenerator.generateFromMultipleFrames(
        frames, 
        config, 
        this.p5
      );
      
      // Limpiar frames temporales
      frames.forEach(f => f.remove());
      
      if (newPalette && newPalette.length > 0) {
        console.log('MediaLoader: ✅ Paleta generada exitosamente:', newPalette);
        store.setKey('config.colors', newPalette);
      } else {
        throw new Error('Paleta vacía generada');
      }
      
    } catch (error) {
      console.error('MediaLoader: Error al generar paleta de múltiples frames:', error);
      eventBus.publish('ui:showToast', { 
        message: '⚠️ Usando paleta por defecto. Puedes regenerarla manualmente.' 
      });
      store.setKey('config.colors', ['#000000', '#555555', '#aaaaaa', '#ffffff']);
    }
  }

  /**
   * Genera la paleta de colores para el medio cargado (versión original para imágenes).
   * @param {p5.MediaElement | p5.Image} media - La instancia del medio.
   * @param {string} type - 'image' o 'video'.
   * @param {object} config - El estado de la configuración actual.
   */
  async generatePalette(media, type, config) {
    eventBus.publish('ui:showToast', { message: '🎨 Generando paleta de colores...' });
    
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
      eventBus.publish('ui:showToast', { message: '❌ Error al analizar colores. Usando paleta por defecto.' });
      store.setKey('config.colors', ['#000000', '#555555', '#aaaaaa', '#ffffff']);
    }
  }

  /**
   * Vuelve a generar la paleta cuando un control de la UI lo solicita.
   */
  async regeneratePalette() {
    const { media, config } = store.getState();
    if (!media.isLoaded || !media.instance) {
      eventBus.publish('ui:showToast', { message: '⚠️ No hay medio cargado.' });
      return;
    }
    
    eventBus.publish('ui:showToast', { message: '🔄 Regenerando paleta...' });
    
    try {
      if (media.type === 'video') {
        // Para videos, usar muestreo múltiple
        await this.generatePaletteFromMultipleFrames(
          media.instance, 
          media.duration, 
          config
        );
      } else {
        // Para imágenes, usar método simple
        await this.generatePalette(media.instance, media.type, config);
      }
      
      eventBus.publish('ui:showToast', { message: '✅ Paleta regenerada.' });
      
    } catch (error) {
      console.error('MediaLoader: Error al regenerar paleta:', error);
      eventBus.publish('ui:showToast', { message: '❌ Error al regenerar paleta.' });
    }
  }

  /**
   * Utilidad: Espera un número de milisegundos.
   * @param {number} ms
   * @returns {Promise<void>}
   */
  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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
