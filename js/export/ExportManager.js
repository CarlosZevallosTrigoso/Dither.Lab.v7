// ============================================================================
// EXPORT MANAGER - Coordinador de exportación
// ============================================================================
// Gestiona todas las operaciones de exportación (PNG, WebM, GIF, Sprite Sheets)

class ExportManager {
  constructor(state, eventBus) {
    this.state = state;
    this.eventBus = eventBus;
    
    // Referencia a la instancia de p5.js
    this.p5Instance = null;
    
    // Referencia al canvas principal
    this.canvas = null;
    
    // Estado de exportación
    this.isExporting = false;
    this.currentExportType = null;
    
    // Recorder para WebM
    this.mediaRecorder = null;
    this.recordedChunks = [];
    
    // Dimensiones originales (para restaurar después de exportar)
    this.originalCanvasWidth = null;
    this.originalCanvasHeight = null;
    this.originalDitherScale = null;
    
    console.log('💾 ExportManager inicializado');
  }
  
  /**
   * Establecer instancia de p5.js
   * @param {object} p5 - Instancia de p5.js
   */
  setP5Instance(p5) {
    this.p5Instance = p5;
    this.canvas = p5.canvas;
  }
  
  /**
   * Verificar si se puede exportar
   * @returns {object} - { canExport: boolean, reason: string }
   */
  canExport() {
    const media = this.state.get('media.file');
    
    if (!media) {
      return { canExport: false, reason: 'No hay medio cargado' };
    }
    
    if (this.isExporting) {
      return { canExport: false, reason: 'Exportación en progreso' };
    }
    
    return { canExport: true };
  }
  
  // ============================================================================
  // EXPORTACIÓN PNG
  // ============================================================================

  /**
   * Exportar frame actual como PNG
   * @param {string} filename - Nombre del archivo (opcional)
   */
  exportPNG(filename = null) {
    const check = this.canExport();
    if (!check.canExport) {
      this.eventBus.emit('export:error', { message: check.reason });
      return;
    }
    
    if (!this.p5Instance || !this.canvas) {
      this.eventBus.emit('export:error', { message: 'Canvas no disponible' });
      return;
    }
    
    const effect = this.state.get('config.effect');
    const timestamp = Date.now();
    const finalFilename = filename || `dithering_${effect}_${timestamp}.png`;
    
    // Obtener tamaño de exportación seleccionado
    const exportSizeRadio = document.querySelector('input[name="exportSize"]:checked');
    const exportSize = exportSizeRadio ? exportSizeRadio.value : 'canvas';
    
    try {
      this.eventBus.emit('export:started', { type: 'png', filename: finalFilename });
      
      if (exportSize === 'canvas') {
        // Exportar canvas actual (comportamiento original)
        this.p5Instance.saveCanvas(this.canvas, finalFilename, 'png');
      } else {
        // Exportar en tamaño diferente
        this.exportPNGCustomSize(exportSize, finalFilename);
      }
      
      this.eventBus.emit('export:completed', { type: 'png', filename: finalFilename });
      
    } catch (error) {
      console.error('[ExportManager] Error exportando PNG:', error);
      this.eventBus.emit('export:error', { message: error.message });
    }
  }

  /**
   * Exportar PNG en tamaño personalizado
   * 🔧 CORREGIDO: Ahora exporta con máxima calidad sin suavizado
   * @param {string} size - 'large' o 'original'
   * @param {string} filename - Nombre del archivo
   */
  exportPNGCustomSize(size, filename) {
    const media = this.state.get('media.file');
    const config = this.state.get('config');
    
    if (!media) return;
    
    // Determinar dimensiones objetivo
    let targetWidth, targetHeight;
    
    if (size === 'original') {
      // Tamaño original del media
      targetWidth = media.width;
      targetHeight = media.height;
    } else if (size === 'large') {
      // 1024px en el lado más largo
      const maxDim = 1024;
      if (media.width > media.height) {
        targetWidth = maxDim;
        targetHeight = Math.floor(media.height * (maxDim / media.width));
      } else {
        targetHeight = maxDim;
        targetWidth = Math.floor(media.width * (maxDim / media.height));
      }
    }
    
    console.log(`📸 Exportando PNG: ${targetWidth}x${targetHeight} (${size})`);
    
    // Crear buffer temporal del tamaño objetivo
    const tempBuffer = this.p5Instance.createGraphics(targetWidth, targetHeight);
    tempBuffer.pixelDensity(1);
    
    // 🆕 CONFIGURACIÓN CRÍTICA PARA CALIDAD
    tempBuffer.noSmooth(); // Desactivar antialiasing en p5
    tempBuffer.elt.style.imageRendering = 'pixelated'; // CSS para renderizado nítido
    
    const ctx = tempBuffer.elt.getContext('2d', { 
      willReadFrequently: true,
      alpha: false,
      imageSmoothingEnabled: false // Desactivar suavizado del navegador
    });
    if (ctx) {
      ctx.imageSmoothingEnabled = false;
      ctx.imageSmoothingQuality = 'high';
    }
    
    // Aplicar el efecto de dithering en el buffer
    this.renderToBuffer(tempBuffer, media, targetWidth, targetHeight, config);
    
    // Guardar el buffer
    this.p5Instance.saveCanvas(tempBuffer.canvas, filename, 'png');
    
    console.log(`✅ PNG exportado: ${filename}`);
    
    // Limpiar
    tempBuffer.remove();
  }

  /**
   * Renderizar con efecto de dithering a un buffer
   * 🔧 CORREGIDO: Trabaja siempre a resolución completa para máxima calidad
   * @param {p5.Graphics} buffer - Buffer destino
   * @param {p5.Image|p5.MediaElement} source - Fuente
   * @param {number} width - Ancho
   * @param {number} height - Alto
   * @param {object} config - Configuración
   */
  renderToBuffer(buffer, source, width, height, config) {
    // 🆕 CLAVE: Para exportación, trabajar SIEMPRE a resolución completa
    // El ditherScale es solo para preview en pantalla, NO para exportación
    const exportScale = 1; // ← Siempre 1:1 para máxima calidad
    
    const pw = Math.floor(width / exportScale);
    const ph = Math.floor(height / exportScale);
    
    // Crear buffer de trabajo
    const workBuffer = this.p5Instance.createGraphics(pw, ph);
    workBuffer.pixelDensity(1);
    
    // 🆕 CRÍTICO: Deshabilitar suavizado para mantener píxeles nítidos
    workBuffer.noSmooth();
    workBuffer.elt.style.imageRendering = 'pixelated';
    
    const ctx = workBuffer.elt.getContext('2d', { 
      willReadFrequently: true,
      alpha: false,
      imageSmoothingEnabled: false
    });
    if (ctx) {
      ctx.imageSmoothingEnabled = false;
    }
    
    // 🆕 Crear configuración temporal con escala de exportación
    const exportConfig = {
      ...config,
      ditherScale: exportScale // ← Forzar escala 1:1 para exportación
    };
    
    console.log(`  🎨 Renderizando con ${exportConfig.effect} a ${pw}x${ph}`);
    
    // Aplicar el efecto usando las funciones legacy
    if (exportConfig.effect === 'none') {
      // Sin efecto, solo copiar
      workBuffer.image(source, 0, 0, pw, ph);
      workBuffer.loadPixels();
      if (typeof applyImageAdjustments === 'function') {
        applyImageAdjustments(workBuffer.pixels, exportConfig);
      }
      workBuffer.updatePixels();
      
    } else if (exportConfig.effect === 'posterize' && typeof drawPosterize === 'function') {
      // Posterize
      const p = this.p5Instance;
      const colorCache = new ColorCache(p);
      const lumaLUT = new LumaLUT();
      const p5colors = colorCache.getColors(exportConfig.colors);
      lumaLUT.build(p5colors, p);
      
      drawPosterize(p, workBuffer, source, pw, ph, exportConfig, lumaLUT);
      
    } else if (exportConfig.effect === 'blue-noise' && typeof drawBlueNoise === 'function') {
      // Blue Noise
      const p = this.p5Instance;
      const colorCache = new ColorCache(p);
      const lumaLUT = new LumaLUT();
      const blueNoiseLUT = new BlueNoiseLUT();
      const p5colors = colorCache.getColors(exportConfig.colors);
      lumaLUT.build(p5colors, p);
      
      drawBlueNoise(p, workBuffer, source, pw, ph, exportConfig, lumaLUT, blueNoiseLUT);
      
    } else if (exportConfig.effect === 'variable-error' && typeof drawVariableError === 'function') {
      // Variable Error
      const p = this.p5Instance;
      const colorCache = new ColorCache(p);
      const lumaLUT = new LumaLUT();
      const p5colors = colorCache.getColors(exportConfig.colors);
      lumaLUT.build(p5colors, p);
      
      drawVariableError(p, workBuffer, source, pw, ph, exportConfig, lumaLUT);
      
    } else if (typeof drawDither === 'function') {
      // Otros algoritmos de dithering
      const p = this.p5Instance;
      const colorCache = new ColorCache(p);
      const lumaLUT = new LumaLUT();
      const bayerLUT = new BayerLUT();
      const p5colors = colorCache.getColors(exportConfig.colors);
      lumaLUT.build(p5colors, p);
      
      drawDither(p, workBuffer, source, pw, ph, exportConfig, lumaLUT, bayerLUT);
    }
    
    // 🆕 Copiar al buffer final sin escalado (ya está al tamaño correcto)
    if (pw === width && ph === height) {
      // Tamaños iguales: copia directa
      buffer.image(workBuffer, 0, 0);
    } else {
      // Si hay diferencia (no debería pasar con exportScale=1), escalar sin suavizado
      buffer.noSmooth();
      const bufferCtx = buffer.elt.getContext('2d');
      if (bufferCtx) {
        bufferCtx.imageSmoothingEnabled = false;
      }
      buffer.image(workBuffer, 0, 0, width, height);
    }
    
    // Limpiar
    workBuffer.remove();
  }
  
  // ============================================================================
  // EXPORTACIÓN PNG SEQUENCE
  // ============================================================================
  
  /**
   * Exportar secuencia de PNGs
   * @param {number} fps - Frames por segundo
   * @param {number} startTime - Tiempo inicial (segundos)
   * @param {number} endTime - Tiempo final (segundos)
   */
  async exportPNGSequence(fps = 15, startTime = null, endTime = null) {
    const check = this.canExport();
    if (!check.canExport) {
      this.eventBus.emit('export:error', { message: check.reason });
      return;
    }
    
    const media = this.state.get('media.file');
    const mediaType = this.state.get('media.type');
    
    if (mediaType !== 'video') {
      this.eventBus.emit('export:error', { message: 'Solo disponible para videos' });
      return;
    }
    
    const duration = this.state.get('media.duration');
    const start = startTime !== null ? startTime : 0;
    const end = endTime !== null ? endTime : duration;
    const frameCount = Math.ceil((end - start) * fps);
    
    this.isExporting = true;
    this.currentExportType = 'png-sequence';
    
    try {
      this.eventBus.emit('export:started', { 
        type: 'png-sequence', 
        frameCount,
        fps
      });
      
      const wasPlaying = this.state.get('media.isPlaying');
      if (wasPlaying) {
        media.pause();
      }
      
      for (let i = 0; i < frameCount; i++) {
        const time = start + (i / fps);
        media.time(time);
        
        await this.delay(100);
        
        this.p5Instance.redraw();
        await this.delay(50);
        
        const frameNumber = String(i).padStart(4, '0');
        this.p5Instance.saveCanvas(this.canvas, `frame_${frameNumber}`, 'png');
        
        await this.delay(50);
        
        this.eventBus.emit('export:progress', {
          type: 'png-sequence',
          current: i + 1,
          total: frameCount,
          progress: (i + 1) / frameCount
        });
      }
      
      if (wasPlaying) {
        media.loop();
      }
      
      this.eventBus.emit('export:completed', { 
        type: 'png-sequence', 
        frameCount 
      });
      
    } catch (error) {
      console.error('[ExportManager] Error exportando secuencia:', error);
      this.eventBus.emit('export:error', { message: error.message });
    } finally {
      this.isExporting = false;
      this.currentExportType = null;
    }
  }
  
  // ============================================================================
  // EXPORTACIÓN WEBM
  // ============================================================================
  
  /**
   * Iniciar grabación WebM
   * @param {object} options - Opciones de grabación
   */
  startWebMRecording(options = {}) {
    const check = this.canExport();
    if (!check.canExport) {
      this.eventBus.emit('export:error', { message: check.reason });
      return;
    }
    
    const media = this.state.get('media.file');
    const mediaType = this.state.get('media.type');
    
    if (mediaType !== 'video') {
      this.eventBus.emit('export:error', { message: 'Solo disponible para videos' });
      return;
    }
    
    // Guardar dimensiones originales
    this.originalCanvasWidth = this.p5Instance.width;
    this.originalCanvasHeight = this.p5Instance.height;
    this.originalDitherScale = this.state.get('config.ditherScale');
    
    // Configurar dimensiones de exportación
    const useMarkers = options.useMarkers !== false;
    const maxDimension = options.maxDimension || 1080;
    
    let startTime = 0;
    let endTime = this.state.get('media.duration');
    
    if (useMarkers) {
      const markerIn = this.state.get('timeline.markerInTime');
      const markerOut = this.state.get('timeline.markerOutTime');
      
      if (markerIn !== null) startTime = markerIn;
      if (markerOut !== null) endTime = markerOut;
    }
    
    // Redimensionar canvas si es necesario
    let exportWidth = media.width;
    let exportHeight = media.height;
    
    const longestSide = Math.max(exportWidth, exportHeight);
    if (longestSide > maxDimension) {
      const scale = maxDimension / longestSide;
      exportWidth = Math.floor(exportWidth * scale);
      exportHeight = Math.floor(exportHeight * scale);
      
      this.p5Instance.resizeCanvas(exportWidth, exportHeight);
    }
    
    // Posicionar video al inicio
    media.time(startTime);
    
    // Iniciar reproducción si no está reproduciendo
    const wasPlaying = this.state.get('media.isPlaying');
    if (!wasPlaying) {
      media.loop();
      this.state.set('media.isPlaying', true);
      this.p5Instance.loop();
    }
    
    // Configurar MediaRecorder
    this.isExporting = true;
    this.currentExportType = 'webm';
    this.recordedChunks = [];
    
    const stream = this.canvas.captureStream(30);
    this.mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: options.bitrate || 12000000
    });
    
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };
    
    this.mediaRecorder.onstop = () => {
      this.handleWebMRecordingComplete();
    };
    
    // Configurar detención automática si hay marcadores
    let checkInterval = null;
    if (useMarkers && endTime !== null) {
      checkInterval = setInterval(() => {
        if (media.time() >= endTime) {
          this.stopWebMRecording();
        }
      }, 100);
      
      this.mediaRecorder._checkInterval = checkInterval;
    }
    
    this.mediaRecorder.start();
    
    this.eventBus.emit('export:started', {
      type: 'webm',
      startTime,
      endTime,
      width: exportWidth,
      height: exportHeight
    });
  }
  
  /**
   * Detener grabación WebM
   */
  stopWebMRecording() {
    if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
      return;
    }
    
    // Limpiar interval de verificación
    if (this.mediaRecorder._checkInterval) {
      clearInterval(this.mediaRecorder._checkInterval);
      this.mediaRecorder._checkInterval = null;
    }
    
    if (this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
  }
  
  /**
   * Manejar completado de grabación WebM
   */
  handleWebMRecordingComplete() {
    // Crear blob
    const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
    
    // Descargar
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const effect = this.state.get('config.effect');
    const timestamp = Date.now();
    
    a.href = url;
    a.download = `dithering_${effect}_${timestamp}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    setTimeout(() => URL.revokeObjectURL(url), 100);
    
    // Restaurar canvas a dimensiones originales
    if (this.originalCanvasWidth && this.originalCanvasHeight) {
      this.p5Instance.resizeCanvas(this.originalCanvasWidth, this.originalCanvasHeight);
    }
    
    // Limpiar
    this.recordedChunks = [];
    this.mediaRecorder = null;
    this.isExporting = false;
    this.currentExportType = null;
    
    this.eventBus.emit('export:completed', { type: 'webm' });
  }
  
  // ============================================================================
  // EXPORTACIÓN GIF
  // ============================================================================
  
  /**
   * Exportar como GIF animado
   * @param {object} options - Opciones de GIF
   */
  async exportGIF(options = {}) {
    const check = this.canExport();
    if (!check.canExport) {
      this.eventBus.emit('export:error', { message: check.reason });
      return;
    }
    
    const media = this.state.get('media.file');
    const mediaType = this.state.get('media.type');
    
    if (mediaType !== 'video') {
      this.eventBus.emit('export:error', { message: 'Solo disponible para videos' });
      return;
    }
    
    // Verificar que gif.js esté disponible
    if (typeof GIF === 'undefined') {
      this.eventBus.emit('export:error', { message: 'Librería GIF.js no disponible' });
      return;
    }
    
    const fps = options.fps || 10;
    const quality = options.quality || 10;
    const useMarkers = options.useMarkers !== false;
    
    let startTime = 0;
    let endTime = this.state.get('media.duration');
    
    if (useMarkers) {
      const markerIn = this.state.get('timeline.markerInTime');
      const markerOut = this.state.get('timeline.markerOutTime');
      
      if (markerIn !== null) startTime = markerIn;
      if (markerOut !== null) endTime = markerOut;
    }
    
    const duration = endTime - startTime;
    const frameCount = Math.ceil(duration * fps);
    const frameDelay = 1000 / fps;
    
    this.isExporting = true;
    this.currentExportType = 'gif';
    
    try {
      this.eventBus.emit('export:started', {
        type: 'gif',
        frameCount,
        fps,
        quality
      });
      
      const gif = new GIF({
        workers: 2,
        quality: quality,
        width: this.p5Instance.width,
        height: this.p5Instance.height,
        workerScript: 'js/gif.worker.js'
      });
      
      gif.on('finished', (blob) => {
        this.handleGIFComplete(blob);
      });
      
      gif.on('progress', (progress) => {
        this.eventBus.emit('export:progress', {
          type: 'gif',
          progress: 0.5 + (progress * 0.5), // 50% captura, 50% renderizado
          stage: 'rendering'
        });
      });
      
      const wasPlaying = this.state.get('media.isPlaying');
      if (wasPlaying) {
        media.pause();
      }
      
      // Capturar frames
      for (let i = 0; i < frameCount; i++) {
        const time = startTime + (i / fps);
        media.time(time);
        
        await this.delay(50);
        
        this.p5Instance.redraw();
        await this.delay(50);
        
        gif.addFrame(this.canvas, { copy: true, delay: frameDelay });
        
        this.eventBus.emit('export:progress', {
          type: 'gif',
          current: i + 1,
          total: frameCount,
          progress: ((i + 1) / frameCount) * 0.5, // 50% del progreso total
          stage: 'capturing'
        });
      }
      
      if (wasPlaying) {
        media.loop();
      }
      
      // Renderizar GIF
      gif.render();
      
    } catch (error) {
      console.error('[ExportManager] Error exportando GIF:', error);
      this.eventBus.emit('export:error', { message: error.message });
      this.isExporting = false;
      this.currentExportType = null;
    }
  }
  
  /**
   * Manejar completado de GIF
   * @param {Blob} blob - Blob del GIF
   */
  handleGIFComplete(blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const effect = this.state.get('config.effect');
    const timestamp = Date.now();
    
    a.href = url;
    a.download = `dithering_${effect}_${timestamp}.gif`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    setTimeout(() => URL.revokeObjectURL(url), 100);
    
    this.isExporting = false;
    this.currentExportType = null;
    
    this.eventBus.emit('export:completed', { type: 'gif' });
  }
  
  // ============================================================================
  // EXPORTACIÓN SPRITE SHEET
  // ============================================================================
  
  /**
   * Exportar como sprite sheet
   * @param {object} options - Opciones de sprite sheet
   */
  async exportSpriteSheet(options = {}) {
    const check = this.canExport();
    if (!check.canExport) {
      this.eventBus.emit('export:error', { message: check.reason });
      return;
    }
    
    const media = this.state.get('media.file');
    const mediaType = this.state.get('media.type');
    
    if (mediaType !== 'video') {
      this.eventBus.emit('export:error', { message: 'Solo disponible para videos' });
      return;
    }
    
    const cols = options.cols || 8;
    const frameCount = options.frameCount || 30;
    const duration = this.state.get('media.duration');
    
    const frameWidth = this.p5Instance.width;
    const frameHeight = this.p5Instance.height;
    const rows = Math.ceil(frameCount / cols);
    
    this.isExporting = true;
    this.currentExportType = 'sprite-sheet';
    
    try {
      this.eventBus.emit('export:started', {
        type: 'sprite-sheet',
        cols,
        rows,
        frameCount
      });
      
      const sheet = this.p5Instance.createGraphics(frameWidth * cols, frameHeight * rows);
      sheet.pixelDensity(1);
      
      const wasPlaying = this.state.get('media.isPlaying');
      if (wasPlaying) {
        media.pause();
      }
      
      for (let i = 0; i < frameCount; i++) {
        const time = (i / frameCount) * duration;
        media.time(time);
        
        await this.delay(100);
        
        const col = i % cols;
        const row = Math.floor(i / cols);
        
        sheet.image(this.p5Instance.get(), col * frameWidth, row * frameHeight);
        
        this.eventBus.emit('export:progress', {
          type: 'sprite-sheet',
          current: i + 1,
          total: frameCount,
          progress: (i + 1) / frameCount
        });
      }
      
      const effect = this.state.get('config.effect');
      const timestamp = Date.now();
      sheet.save(`sprite_sheet_${cols}x${rows}_${effect}_${timestamp}.png`);
      
      if (wasPlaying) {
        media.loop();
      }
      
      sheet.remove();
      
      this.eventBus.emit('export:completed', {
        type: 'sprite-sheet',
        cols,
        rows,
        frameCount
      });
      
    } catch (error) {
      console.error('[ExportManager] Error exportando sprite sheet:', error);
      this.eventBus.emit('export:error', { message: error.message });
    } finally {
      this.isExporting = false;
      this.currentExportType = null;
    }
  }
  
  // ============================================================================
  // UTILIDADES
  // ============================================================================
  
  /**
   * Delay asíncrono
   * @param {number} ms - Milisegundos
   * @returns {Promise}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Obtener estado de exportación
   * @returns {object}
   */
  getExportState() {
    return {
      isExporting: this.isExporting,
      currentExportType: this.currentExportType
    };
  }
  
  /**
   * Cancelar exportación actual
   */
  cancelExport() {
    if (!this.isExporting) {
      return;
    }
    
    if (this.currentExportType === 'webm' && this.mediaRecorder) {
      this.stopWebMRecording();
    }
    
    this.isExporting = false;
    this.currentExportType = null;
    
    this.eventBus.emit('export:cancelled');
  }
}

// Exportar
if (typeof window !== 'undefined') {
  window.ExportManager = ExportManager;
}
