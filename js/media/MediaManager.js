// ============================================================================
// MEDIA MANAGER - Gestión de archivos multimedia
// ============================================================================
// Maneja la carga, procesamiento inicial y gestión de videos e imágenes

class MediaManager {
  constructor(state, eventBus) {
    this.state = state;
    this.eventBus = eventBus;
    
    // Referencia al objeto p5.js (se establecerá después)
    this.p5Instance = null;
    
    // URL temporal del archivo cargado (para liberar memoria)
    this.currentFileURL = null;
    
    // Formatos soportados
    this.supportedVideoFormats = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
    this.supportedImageFormats = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
    
    // Límites de tamaño
    this.maxDimension = 2048;
    this.maxFileSize = 500 * 1024 * 1024; // 500MB
    
    console.log('📹 MediaManager inicializado');
  }
  
  /**
   * Establecer instancia de p5.js
   * @param {object} p5 - Instancia de p5.js
   */
  setP5Instance(p5) {
    this.p5Instance = p5;
  }
  
  /**
   * Verificar si un archivo es soportado
   * @param {File} file - Archivo a verificar
   * @returns {object} - { valid: boolean, type: string, error: string }
   */
  validateFile(file) {
    // Verificar que existe
    if (!file) {
      return { valid: false, error: 'No se proporcionó ningún archivo' };
    }
    
    // Verificar tamaño
    if (file.size > this.maxFileSize) {
      return { 
        valid: false, 
        error: `Archivo demasiado grande (máximo ${this.maxFileSize / 1024 / 1024}MB)` 
      };
    }
    
    const fileType = file.type;
    
    // Verificar si es video
    if (this.supportedVideoFormats.includes(fileType)) {
      return { valid: true, type: 'video' };
    }
    
    // Verificar si es imagen
    if (this.supportedImageFormats.includes(fileType)) {
      return { valid: true, type: 'image' };
    }
    
    // Formato no soportado
    return { 
      valid: false, 
      error: `Formato no soportado: ${fileType}` 
    };
  }
  
  /**
   * Limpiar archivo actual
   */
  cleanup() {
    // Limpiar URL temporal
    if (this.currentFileURL) {
      URL.revokeObjectURL(this.currentFileURL);
      this.currentFileURL = null;
    }
    
    // Limpiar media actual
    const currentMedia = this.state.get('media.file');
    if (currentMedia) {
      const mediaType = this.state.get('media.type');
      
      if (mediaType === 'video' && currentMedia.pause) {
        currentMedia.pause();
        if (currentMedia.remove) {
          currentMedia.remove();
        }
      }
    }
    
    // Resetear estado
    this.state.setMultiple({
      'media.file': null,
      'media.type': null,
      'media.isPlaying': false,
      'media.duration': 0,
      'media.currentTime': 0
    });
    
    this.eventBus.emit('media:cleared');
  }
  
  /**
   * Cargar un archivo
   * @param {File} file - Archivo a cargar
   * @returns {Promise}
   */
  async loadFile(file) {
    // Validar archivo
    const validation = this.validateFile(file);
    if (!validation.valid) {
      this.eventBus.emit('media:error', { message: validation.error });
      throw new Error(validation.error);
    }
    
    // Limpiar archivo anterior
    this.cleanup();
    
    // Emitir evento de inicio de carga
    this.eventBus.emit('media:loading', { 
      fileName: file.name, 
      fileSize: file.size,
      fileType: validation.type 
    });
    
    // Crear URL temporal
    this.currentFileURL = URL.createObjectURL(file);
    
    // Cargar según el tipo
    try {
      if (validation.type === 'video') {
        await this.loadVideo(this.currentFileURL, file);
      } else if (validation.type === 'image') {
        await this.loadImage(this.currentFileURL, file);
      }
    } catch (error) {
      this.cleanup();
      this.eventBus.emit('media:error', { message: error.message });
      throw error;
    }
  }
  
  /**
   * Cargar un video
   * @param {string} url - URL del video
   * @param {File} file - Archivo original
   * @returns {Promise}
   */
  loadVideo(url, file) {
    return new Promise((resolve, reject) => {
      if (!this.p5Instance) {
        reject(new Error('p5.js no está inicializado'));
        return;
      }
      
      const p = this.p5Instance;
      
      // Crear elemento de video con p5.js
      const video = p.createVideo([url], () => {
        try {
          // Obtener dimensiones
          let width = video.width;
          let height = video.height;
          
          // Redimensionar si excede límites
          if (width > this.maxDimension || height > this.maxDimension) {
            const aspectRatio = width / height;
            
            if (width > height) {
              width = this.maxDimension;
              height = Math.floor(width / aspectRatio);
            } else {
              height = this.maxDimension;
              width = Math.floor(height * aspectRatio);
            }
          }
          
          const duration = video.duration();
          
          // Guardar en estado
          this.state.setMultiple({
            'media.file': video,
            'media.type': 'video',
            'media.isPlaying': false,
            'media.duration': duration,
            'media.currentTime': 0
          });
          
          // Configurar video
          video.volume(0); // Sin sonido
          video.speed(this.state.get('media.playbackSpeed') || 1);
          video.hide(); // Ocultar elemento HTML
          
          // Emitir evento de carga exitosa
          this.eventBus.emit('media:loaded', {
            type: 'video',
            fileName: file.name,
            width: video.width,
            height: video.height,
            resizedWidth: width,
            resizedHeight: height,
            duration: duration,
            needsResize: width !== video.width || height !== video.height
          });
          
          resolve();
          
        } catch (error) {
          reject(error);
        }
      });
      
      // Manejar error de carga
      video.elt.addEventListener('error', (e) => {
        reject(new Error('Error al cargar el video'));
      });
    });
  }
  
  /**
   * Cargar una imagen
   * @param {string} url - URL de la imagen
   * @param {File} file - Archivo original
   * @returns {Promise}
   */
  loadImage(url, file) {
    return new Promise((resolve, reject) => {
      if (!this.p5Instance) {
        reject(new Error('p5.js no está inicializado'));
        return;
      }
      
      const p = this.p5Instance;
      
      // Cargar imagen con p5.js
      const img = p.loadImage(url, () => {
        try {
          // Obtener dimensiones originales
          const originalWidth = img.width;
          const originalHeight = img.height;
          
          // Redimensionar si excede límites
          let width = originalWidth;
          let height = originalHeight;
          
          if (width > this.maxDimension || height > this.maxDimension) {
            const aspectRatio = width / height;
            
            if (width > height) {
              width = this.maxDimension;
              height = Math.floor(width / aspectRatio);
            } else {
              height = this.maxDimension;
              width = Math.floor(height * aspectRatio);
            }
            
            // Aplicar resize
            img.resize(width, height);
          }
          
          // Guardar en estado
          this.state.setMultiple({
            'media.file': img,
            'media.type': 'image',
            'media.isPlaying': false,
            'media.duration': 0,
            'media.currentTime': 0
          });
          
          // Emitir evento de carga exitosa
          this.eventBus.emit('media:loaded', {
            type: 'image',
            fileName: file.name,
            width: originalWidth,
            height: originalHeight,
            resizedWidth: width,
            resizedHeight: height,
            needsResize: width !== originalWidth || height !== originalHeight
          });
          
          resolve();
          
        } catch (error) {
          reject(error);
        }
      }, (error) => {
        reject(new Error('Error al cargar la imagen'));
      });
    });
  }
  
  /**
   * Toggle play/pause de video
   */
  togglePlay() {
    const media = this.state.get('media.file');
    const mediaType = this.state.get('media.type');
    const isPlaying = this.state.get('media.isPlaying');
    
    if (!media || mediaType !== 'video') {
      return;
    }
    
    if (isPlaying) {
      media.pause();
      this.state.set('media.isPlaying', false);
      this.eventBus.emit('media:paused');
    } else {
      media.loop();
      this.state.set('media.isPlaying', true);
      this.eventBus.emit('media:playing');
    }
  }
  
  /**
   * Pausar video
   */
  pause() {
    const media = this.state.get('media.file');
    const mediaType = this.state.get('media.type');
    
    if (!media || mediaType !== 'video') {
      return;
    }
    
    media.pause();
    this.state.set('media.isPlaying', false);
    this.eventBus.emit('media:paused');
  }
  
  /**
   * Reproducir video
   */
  play() {
    const media = this.state.get('media.file');
    const mediaType = this.state.get('media.type');
    
    if (!media || mediaType !== 'video') {
      return;
    }
    
    media.loop();
    this.state.set('media.isPlaying', true);
    this.eventBus.emit('media:playing');
  }
  
  /**
   * Reiniciar video
   */
  restart() {
    const media = this.state.get('media.file');
    const mediaType = this.state.get('media.type');
    
    if (!media || mediaType !== 'video') {
      return;
    }
    
    media.time(0);
    this.state.set('media.currentTime', 0);
    this.eventBus.emit('media:restarted');
  }
  
  /**
   * Establecer velocidad de reproducción
   * @param {number} speed - Velocidad (0.25 - 2.0)
   */
  setPlaybackSpeed(speed) {
    const media = this.state.get('media.file');
    const mediaType = this.state.get('media.type');
    
    if (!media || mediaType !== 'video') {
      return;
    }
    
    const clampedSpeed = Math.max(0.25, Math.min(2.0, speed));
    media.speed(clampedSpeed);
    this.state.set('media.playbackSpeed', clampedSpeed);
    this.eventBus.emit('media:speed-changed', { speed: clampedSpeed });
  }
  
  /**
   * Ir a un tiempo específico
   * @param {number} time - Tiempo en segundos
   */
  seekTo(time) {
    const media = this.state.get('media.file');
    const mediaType = this.state.get('media.type');
    const duration = this.state.get('media.duration');
    
    if (!media || mediaType !== 'video') {
      return;
    }
    
    const clampedTime = Math.max(0, Math.min(duration, time));
    media.time(clampedTime);
    this.state.set('media.currentTime', clampedTime);
    this.eventBus.emit('media:seeked', { time: clampedTime });
  }
  
  /**
   * Avanzar/retroceder frames
   * @param {number} frames - Número de frames (positivo = adelante, negativo = atrás)
   */
  stepFrames(frames) {
    const media = this.state.get('media.file');
    const mediaType = this.state.get('media.type');
    
    if (!media || mediaType !== 'video') {
      return;
    }
    
    const fps = 30; // Asumimos 30fps
    const currentTime = media.time();
    const newTime = currentTime + (frames / fps);
    
    this.seekTo(newTime);
  }
  
  /**
   * Actualizar tiempo actual (llamar en loop)
   */
  updateCurrentTime() {
    const media = this.state.get('media.file');
    const mediaType = this.state.get('media.type');
    
    if (!media || mediaType !== 'video') {
      return;
    }
    
    const currentTime = media.time();
    const oldTime = this.state.get('media.currentTime');
    
    // Solo actualizar si cambió significativamente
    if (Math.abs(currentTime - oldTime) > 0.01) {
      this.state.set('media.currentTime', currentTime, true); // Silent update
    }
  }
  
  /**
   * Obtener información del media actual
   * @returns {object}
   */
  getMediaInfo() {
    const media = this.state.get('media.file');
    const mediaType = this.state.get('media.type');
    
    if (!media) {
      return null;
    }
    
    const info = {
      type: mediaType,
      width: media.width,
      height: media.height
    };
    
    if (mediaType === 'video') {
      info.duration = this.state.get('media.duration');
      info.currentTime = this.state.get('media.currentTime');
      info.isPlaying = this.state.get('media.isPlaying');
      info.playbackSpeed = this.state.get('media.playbackSpeed');
    }
    
    return info;
  }
}

// Exportar
if (typeof window !== 'undefined') {
  window.MediaManager = MediaManager;
}