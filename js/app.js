// ============================================================================
// DitherLab v8 — App Principal (Sketch p5.js)
// ============================================================================
// Responsabilidades de este archivo:
//   - Sketch p5: setup(), draw(), gestión de canvas
//   - Buffer management (BufferPool, ColorCache, LumaLUT, etc.)
//   - Respuesta a eventos del EventBus (NO a eventos DOM directos)
//   - Frame stats y métricas
//
// Todo lo demás está delegado a managers v7:
//   - DOM events → UIController
//   - File loading → MediaManager
//   - Palette → PaletteGenerator
//   - Timeline → TimelineManager
//   - Export → ExportManager
// ============================================================================

class CircularBuffer {
  constructor(size) {
    this.buffer = new Float32Array(size);
    this.index = 0;
    this.size = size;
    this.filled = false;
  }
  
  push(value) {
    this.buffer[this.index] = value;
    this.index = (this.index + 1) % this.size;
    if (this.index === 0) this.filled = true;
  }
  
  average() {
    const count = this.filled ? this.size : this.index;
    if (count === 0) return 0;
    let sum = 0;
    for (let i = 0; i < count; i++) sum += this.buffer[i];
    return sum / count;
  }
  
  clear() {
    this.index = 0;
    this.filled = false;
  }
}

// ============================================================================
// SKETCH P5.JS
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  const sketch = p => {
    let canvas;
    let needsRedraw = true;
    
    // State v7
    const appState = window.state;
    
    // Helpers de procesamiento
    const bufferPool = new BufferPool();
    const colorCache = new ColorCache(p);
    const lumaLUT = new LumaLUT();
    const bayerLUT = new BayerLUT();
    const blueNoiseLUT = new BlueNoiseLUT();
    
    // UI legacy (solo para updateColorPickers y updatePanelsVisibility)
    const ui = new UIManager();
    
    // Curves editor
    const curvesEditor = new CurvesEditor('curvesCanvas');
    
    // Stats
    const fpsHistory = new CircularBuffer(30);
    const frameTimeHistory = new CircularBuffer(30);
    
    // Recording state (local al sketch)
    let recorder = null;
    let chunks = [];
    let originalCanvasWidth = 0;
    let originalCanvasHeight = 0;
    let originalDitherScale = 2;
    
    // Palette generator
    let paletteGenerator = null;
    
    // Timeline manager reference
    let timelineManager = null;
    
    // ====================================================================
    // FUNCIÓN GLOBAL: triggerRedraw
    // ====================================================================
    window.triggerRedraw = () => {
      needsRedraw = true;
      p.redraw();
    };
    
    // ====================================================================
    // P5 SETUP
    // ====================================================================
    p.setup = () => {
      canvas = p.createCanvas(400, 225);
      canvas.elt.getContext('2d', { 
        willReadFrequently: true,
        alpha: false
      });
      canvas.parent('canvasContainer');
      p.pixelDensity(1);
      p.noSmooth();
      canvas.elt.style.imageRendering = 'pixelated';
      
      p.textFont('monospace');
      p.textStyle(p.BOLD);
      p.textAlign(p.CENTER, p.CENTER);
      p.textSize(20);
      
      // Pasar instancia p5 a managers
      if (window.mediaManager) window.mediaManager.setP5Instance(p);
      if (window.exportManager) window.exportManager.setP5Instance(p);
      
      // Crear PaletteGenerator
      paletteGenerator = new PaletteGenerator(p);
      window.paletteGenerator = paletteGenerator;
      
      // Obtener TimelineManager
      timelineManager = window.timelineManager || null;
      
      // Desactivar loop automático
      p.noLoop();
      
      // Inicializar colores
      const colors = appState.get('config.colors');
      const p5colors = colorCache.getColors(colors);
      lumaLUT.build(p5colors, p);
      
      // Inicializar UI legacy (solo DOM accessors y color pickers)
      ui.init();
      ui.updateColorPickers(appState, colorCache, lumaLUT, p);
      ui.updatePanelsVisibility(appState.get('config'));
      updatePresetList();
      
      // Registrar listeners de EventBus UNA SOLA VEZ
      setupEventBusListeners();
      
      // Suscribirse a cambios de state para auto-redraw
      setupStateSubscription();
      
      // Primera vez dibujar
      window.triggerRedraw();
    };
    
    // ====================================================================
    // P5 DRAW
    // ====================================================================
    p.draw = () => {
      const mediaType = appState.get('media.type');
      if (mediaType === 'image' && !needsRedraw) return;
      
      p.background(0);
      
      const media = appState.get('media.file');
      if (!media) {
        p.fill(128);
        p.text('Arrastra un video o imagen\npara comenzar', p.width/2, p.height/2);
        updateFrameStats();
        needsRedraw = false;
        return;
      }
      
      // Mantener currentTime en state sincronizado (UIController lo lee)
      if (mediaType === 'video' && media.time) {
        appState.set('media.currentTime', media.time(), true);
      }
      
      // Loop entre marcadores
      if (mediaType === 'video' && appState.get('timeline.loopSection')) {
        const markerIn = appState.get('timeline.markerInTime');
        const markerOut = appState.get('timeline.markerOutTime');
        if (markerIn !== null && markerOut !== null) {
          if (media.time() >= markerOut) {
            media.time(markerIn);
          }
        }
      }
      
      // Actualizar curvas
      appState.set('config.curvesLUTs', curvesEditor.getAllLUTs(), true);

      const cfg = appState.get('config');
      const isDitheringActive = cfg.effect !== 'none';
      
      if (isDitheringActive) {
        const p5colors = colorCache.getColors(cfg.colors);
        if (lumaLUT.needsRebuild(p5colors)) lumaLUT.build(p5colors, p);
        
        const pw = Math.floor(p.width / cfg.ditherScale);
        const ph = Math.floor(p.height / cfg.ditherScale);
        const buffer = bufferPool.get(pw, ph, p);
        
        if (cfg.effect === 'posterize') {
          drawPosterize(p, buffer, media, p.width, p.height, cfg, lumaLUT);
        } else if (cfg.effect === 'blue-noise') {
          drawBlueNoise(p, buffer, media, p.width, p.height, cfg, lumaLUT, blueNoiseLUT);
        } else if (cfg.effect === 'variable-error') {
          drawVariableError(p, buffer, media, p.width, p.height, cfg, lumaLUT);
        } else {
          drawDither(p, buffer, media, p.width, p.height, cfg, lumaLUT, bayerLUT);
        }
        
        p.image(buffer, 0, 0, p.width, p.height);
      } else {
        const buffer = bufferPool.get(p.width, p.height, p);
        buffer.image(media, 0, 0, p.width, p.height);
        buffer.loadPixels();
        applyImageAdjustments(buffer.pixels, cfg);
        buffer.updatePixels();
        p.image(buffer, 0, 0, p.width, p.height);
      }
      
      // Actualizar timeline
      if (timelineManager && mediaType === 'video') {
        timelineManager.update();
      }
      
      updateFrameStats();
      
      if (mediaType === 'image') {
        needsRedraw = false;
      }
    };
    
    // ====================================================================
    // EVENTBUS LISTENERS — Registrados UNA SOLA VEZ en setup()
    // ====================================================================
    function setupEventBusListeners() {
      const bus = window.eventBus;
      
      // ---- Media events ----
      bus.on('media:file-dropped', (data) => handleFile(data.file));
      bus.on('media:file-selected', (data) => handleFile(data.file));
      
      // FIX CRÍTICO: listener registrado UNA vez, no dentro de handleFile
      bus.on('media:loaded', onMediaLoaded);
      
      bus.on('media:toggle-play', togglePlay);
      bus.on('media:restart', () => {
        const media = appState.get('media.file');
        if (media && appState.get('media.type') === 'video') {
          media.time(0);
          setTimeout(window.triggerRedraw, 50);
          showToast('Reiniciado');
        }
      });
      
      bus.on('media:paused', () => {
        ui.elements.playBtn.textContent = 'Play';
        showToast('Pausado');
      });
      
      bus.on('media:playing', () => {
        ui.elements.playBtn.textContent = 'Pause';
        showToast('Reproduciendo');
        p.loop();
      });
      
      bus.on('media:step-frames', (data) => {
        const media = appState.get('media.file');
        if (!media || appState.get('media.type') !== 'video') return;
        media.pause();
        appState.set('media.isPlaying', false);
        ui.elements.playBtn.textContent = 'Play';
        const delta = (data.frames || 1) / 30;
        media.time(Math.max(0, Math.min(media.duration(), media.time() + delta)));
        setTimeout(window.triggerRedraw, 50);
      });
      
      bus.on('media:speed-change', (data) => {
        const media = appState.get('media.file');
        if (media && appState.get('media.type') === 'video') {
          media.speed(data.speed);
          appState.set('media.playbackSpeed', data.speed);
        }
      });
      
      // ---- Export events ----
      bus.on('export:png', () => {
        if (window.exportManager) {
          window.exportManager.exportPNG();
        } else {
          const media = appState.get('media.file');
          if (media) p.saveCanvas(canvas, `dithering_${appState.get('config.effect')}_${Date.now()}`, 'png');
        }
      });
      
      bus.on('export:webm-start', (options) => startRecording(options));
      bus.on('export:webm-stop', () => stopRecording());
      
      bus.on('export:gif', async (options) => {
        if (window.exportManager) {
          await window.exportManager.exportGIF(options);
        } else {
          await exportGifLegacy();
        }
      });
      
      bus.on('export:sprite-sheet', async (options) => {
        if (window.exportManager) {
          await window.exportManager.exportSpriteSheet(options);
        } else {
          const media = appState.get('media.file');
          if (media) await exportSpriteSheet(p, media, options.cols || 8, options.frameCount || 30);
        }
      });
      
      bus.on('export:png-sequence', async () => {
        const media = appState.get('media.file');
        if (!media) return;
        const startTime = appState.get('timeline.markerInTime') || 0;
        const endTime = appState.get('timeline.markerOutTime') || media.duration();
        if (window.exportManager) {
          await window.exportManager.exportPNGSequence(15, startTime, endTime);
        } else {
          await exportPNGSequence(p, media, startTime, endTime, 15);
        }
      });
      
      bus.on('export:start-recording', () => startRecording());
      bus.on('export:stop-recording', () => stopRecording());
      
      // Export progress/status
      bus.on('export:started', (data) => {
        ui.elements.status.textContent = `Exportando ${data.type}...`;
      });
      
      bus.on('export:progress', (data) => {
        if (data.type === 'gif' && ui.elements.gifProgress) {
          ui.elements.gifProgress.classList.remove('hidden');
          if (ui.elements.gifProgressText) {
            ui.elements.gifProgressText.textContent = `${Math.round(data.progress * 100)}%`;
          }
          if (ui.elements.gifProgressBar) {
            ui.elements.gifProgressBar.style.width = `${data.progress * 100}%`;
          }
        }
      });
      
      bus.on('export:completed', (data) => {
        ui.elements.status.textContent = `${data.type.toUpperCase()} exportado`;
        if (data.type === 'gif' && ui.elements.gifProgress) {
          setTimeout(() => ui.elements.gifProgress.classList.add('hidden'), 2000);
        }
        showToast(`${data.type.toUpperCase()} exportado`);
      });
      
      bus.on('export:error', (data) => {
        showToast(`Error: ${data.message}`);
      });
      
      // ---- Preset events ----
      bus.on('preset:save', (data) => savePreset(data.name));
      bus.on('preset:delete', (data) => deletePreset(data.name));
      bus.on('preset:load', (data) => applyPreset(data.name));
      
      // ---- Metrics ----
      bus.on('metrics:update-requested', updateMetrics);
      
      // ---- Render ----
      bus.on('render:needed', window.triggerRedraw);
      
      // ---- Fullscreen ----
      bus.on('app:toggle-fullscreen', toggleFullscreen);
      
      // ---- Modal events from KeyboardManager ----
      bus.on('modal:metrics', () => {
        ui.elements.metricsModal.style.display = 'flex';
      });
      bus.on('modal:shortcuts', () => {
        ui.elements.shortcutsModal.style.display = 'flex';
      });
      bus.on('modal:close-all', () => {
        ui.elements.shortcutsModal.style.display = 'none';
        ui.elements.metricsModal.style.display = 'none';
      });
      
      // ---- Timeline events ----
      bus.on('timeline:mark-in', () => {
        const media = appState.get('media.file');
        if (media && appState.get('media.type') === 'video') {
          const t = media.time();
          appState.set('timeline.markerInTime', t);
          showToast(`Entrada: ${formatTime(t)}`);
        }
      });
      bus.on('timeline:mark-out', () => {
        const media = appState.get('media.file');
        if (media && appState.get('media.type') === 'video') {
          const t = media.time();
          appState.set('timeline.markerOutTime', t);
          showToast(`Salida: ${formatTime(t)}`);
        }
      });
      bus.on('timeline:seeked', () => window.triggerRedraw());
      
      // ---- Media prev/next frame from KeyboardManager ----
      bus.on('media:prev-frame', () => {
        bus.emit('media:step-frames', { frames: -1 });
      });
      bus.on('media:next-frame', () => {
        bus.emit('media:step-frames', { frames: 1 });
      });
    }
    
    // ====================================================================
    // STATE SUBSCRIPTION — auto-redraw cuando cambia config
    // ====================================================================
    function setupStateSubscription() {
      appState.subscribe((path, newValue, oldValue) => {
        if (typeof path !== 'string') return;
        
        // Cambios en config → redraw
        if (path.startsWith('config.')) {
          // Actualizar UI de paneles cuando cambia el efecto
          if (path === 'config.effect') {
            ui.updatePanelsVisibility(appState.get('config'));
          }
          
          // Actualizar color pickers cuando cambia monochrome o colorCount
          if (path === 'config.isMonochrome' || path === 'config.colorCount') {
            ui.updateColorPickers(appState, colorCache, lumaLUT, p, true);
          }
          
          window.triggerRedraw();
        }
      });
    }
    
    // ====================================================================
    // HANDLER: media:loaded — registrado UNA vez
    // ====================================================================
    async function onMediaLoaded(mediaInfo) {
      console.log('📁 Media cargado:', mediaInfo.type, mediaInfo.resizedWidth + 'x' + mediaInfo.resizedHeight);
      
      // Redimensionar canvas
      const { width: canvasW, height: canvasH } = calculateCanvasDimensions(
        mediaInfo.resizedWidth, 
        mediaInfo.resizedHeight
      );
      p.resizeCanvas(canvasW, canvasH);
      
      // Generar paleta
      const media = appState.get('media.file');
      const colorCount = appState.get('config.colorCount');
      
      ui.elements.status.textContent = 'Analizando colores...';
      const newPalette = await paletteGenerator.generateFromMedia(media, colorCount);
      appState.set('config.colors', newPalette);
      ui.updateColorPickers(appState, colorCache, lumaLUT, p);
      
      // Actualizar UI según tipo
      ui.elements.status.textContent = mediaInfo.type === 'video' ? 'Video cargado' : 'Imagen cargada';
      
      if (mediaInfo.type === 'video') {
        // Inicializar timeline
        if (timelineManager) {
          timelineManager.init();
        }
        
        // Habilitar controles de video
        ui.elements.playBtn.textContent = 'Play';
        ui.elements.playBtn.disabled = false;
        ui.elements.recBtn.disabled = false;
        ui.elements.mediaType.textContent = 'VIDEO';
        ui.elements.mediaType.className = 'bg-blue-600 px-2 py-1 rounded text-xs';
        ui.elements.mediaDimensions.textContent = `${media.width}x${media.height} - ${formatTime(media.duration())}`;
        ui.elements.timelinePanel.classList.remove('hidden');
        ui.elements.gifExportPanel.classList.remove('hidden');
        ui.elements.spriteSheetPanel.classList.remove('hidden');
        ui.elements.exportSequenceBtn.classList.remove('hidden');
        
        p.loop();
      } else {
        ui.elements.playBtn.textContent = 'N/A';
        ui.elements.playBtn.disabled = true;
        ui.elements.recBtn.disabled = true;
        ui.elements.mediaType.textContent = 'IMAGEN';
        ui.elements.mediaType.className = 'bg-purple-600 px-2 py-1 rounded text-xs';
        ui.elements.mediaDimensions.textContent = `${mediaInfo.resizedWidth}x${mediaInfo.resizedHeight}`;
        ui.elements.timelinePanel.classList.add('hidden');
        ui.elements.gifExportPanel.classList.add('hidden');
        ui.elements.spriteSheetPanel.classList.add('hidden');
        ui.elements.exportSequenceBtn.classList.add('hidden');
        
        p.noLoop();
      }
      
      // Actualizar info de tamaño de exportación
      updateExportSizeInfo(canvasW, canvasH, mediaInfo);
      
      window.triggerRedraw();
      showToast(mediaInfo.type === 'video' ? 'Video cargado' : 'Imagen cargada');
    }
    
    // ====================================================================
    // HANDLE FILE — Ahora simplificado, sin listener interno
    // ====================================================================
    async function handleFile(file) {
      if (window.mediaManager) {
        try {
          await window.mediaManager.loadFile(file);
          // media:loaded será emitido por MediaManager → onMediaLoaded responde
        } catch (error) {
          console.error('Error cargando archivo:', error);
          showToast('Error al cargar archivo');
        }
      }
    }
    
    // ====================================================================
    // CANVAS DIMENSIONS
    // ====================================================================
    function calculateCanvasDimensions(mediaWidth, mediaHeight) {
      const container = document.getElementById('canvasContainer');
      let containerWidth = container.clientWidth || window.innerWidth;
      let containerHeight = container.clientHeight || window.innerHeight;

      if (containerWidth < 100) containerWidth = 800;
      if (containerHeight < 100) containerHeight = 600;

      const padding = 16;
      const availableWidth = containerWidth - padding;
      const availableHeight = containerHeight - padding;

      if (availableWidth <= 0 || availableHeight <= 0) {
        return { width: 400, height: 225 };
      }

      const mediaAspect = mediaWidth / mediaHeight;
      const containerAspect = availableWidth / availableHeight;

      let canvasW, canvasH;
      if (mediaAspect > containerAspect) {
        canvasW = availableWidth;
        canvasH = canvasW / mediaAspect;
      } else {
        canvasH = availableHeight;
        canvasW = canvasH * mediaAspect;
      }

      canvasW = Math.min(availableWidth, Math.max(100, Math.floor(canvasW)));
      canvasH = Math.min(availableHeight, Math.max(100, Math.floor(canvasH)));

      return { width: canvasW, height: canvasH };
    }
    
    // ====================================================================
    // EXPORT SIZE INFO
    // ====================================================================
    function updateExportSizeInfo(canvasW, canvasH, mediaInfo) {
      const exportSizeRadio = document.querySelector('input[name="exportSize"]:checked');
      const infoEl = document.getElementById('exportSizeInfo');
      if (!exportSizeRadio || !infoEl || !mediaInfo) return;
      
      const value = exportSizeRadio.value;
      if (value === 'canvas') {
        infoEl.textContent = `${canvasW} × ${canvasH}px`;
      } else if (value === 'large') {
        const maxDim = 1024;
        const w = mediaInfo.resizedWidth > mediaInfo.resizedHeight ? maxDim : Math.floor(mediaInfo.resizedWidth * (maxDim / mediaInfo.resizedHeight));
        const h = mediaInfo.resizedWidth > mediaInfo.resizedHeight ? Math.floor(mediaInfo.resizedHeight * (maxDim / mediaInfo.resizedWidth)) : maxDim;
        infoEl.textContent = `${w} × ${h}px`;
      } else if (value === 'original') {
        infoEl.textContent = `${mediaInfo.width} × ${mediaInfo.height}px (Original)`;
      }
      
      // Listener para cambios de radio buttons
      document.querySelectorAll('input[name="exportSize"]').forEach(radio => {
        // Usar un flag para no duplicar listeners
        if (radio._ditherLabBound) return;
        radio._ditherLabBound = true;
        
        radio.addEventListener('change', (e) => {
          const media = appState.get('media.file');
          if (!media || !infoEl) return;
          
          if (e.target.value === 'canvas') {
            infoEl.textContent = `${p.width} × ${p.height}px`;
          } else if (e.target.value === 'large') {
            const maxDim = 1024;
            const w = media.width > media.height ? maxDim : Math.floor(media.width * (maxDim / media.height));
            const h = media.width > media.height ? Math.floor(media.height * (maxDim / media.width)) : maxDim;
            infoEl.textContent = `${w} × ${h}px`;
          } else if (e.target.value === 'original') {
            infoEl.textContent = `${media.width} × ${media.height}px (Original)`;
          }
        });
      });
    }

    // ====================================================================
    // PLAY / PAUSE
    // ====================================================================
    function togglePlay() {
      if (window.mediaManager) {
        window.mediaManager.togglePlay();
        // media:paused o media:playing serán emitidos
      }
    }

    // ====================================================================
    // RECORDING (WebM)
    // ====================================================================
    function startRecording(options = {}) {
      const media = appState.get('media.file');
      const mediaType = appState.get('media.type');
      const isRecording = appState.get('media.isRecording') || false;
      
      if (isRecording || !media || mediaType !== 'video') return;
      
      originalDitherScale = appState.get('config.ditherScale');
      originalCanvasWidth = p.width;
      originalCanvasHeight = p.height;
      
      let startTime = 0;
      let endTime = media.duration();
      
      const useMarkers = options.useMarkers !== undefined ? options.useMarkers : 
        (ui.elements.webmUseMarkersToggle && ui.elements.webmUseMarkersToggle.checked);
      
      if (useMarkers) {
        const markerIn = appState.get('timeline.markerInTime');
        const markerOut = appState.get('timeline.markerOutTime');
        if (markerIn !== null) startTime = markerIn;
        if (markerOut !== null) endTime = markerOut;
      }
      
      media.time(startTime);
      
      const maxDimension = 1080;
      let exportWidth = media.width;
      let exportHeight = media.height;
      
      const longestSide = Math.max(exportWidth, exportHeight);
      if (longestSide > maxDimension) {
        const scale = maxDimension / longestSide;
        exportWidth = Math.floor(exportWidth * scale);
        exportHeight = Math.floor(exportHeight * scale);
      }
      
      p.resizeCanvas(exportWidth, exportHeight);
      
      if (!appState.get('media.isPlaying')) {
        media.loop();
        appState.set('media.isPlaying', true);
        ui.elements.playBtn.textContent = 'Pause';
        p.loop();
      }
      
      appState.set('media.isRecording', true);
      chunks = [];
      
      const stream = canvas.elt.captureStream(30);
      recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 12000000
      });
      
      recorder.ondataavailable = ev => { if (ev.data.size > 0) chunks.push(ev.data); };
      
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dithering_${appState.get('config.effect')}_${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 100);
        
        p.resizeCanvas(originalCanvasWidth, originalCanvasHeight);
        
        ui.elements.status.textContent = 'WebM descargado';
        ui.elements.recBtn.disabled = false;
        ui.elements.stopBtn.classList.add('hidden');
        ui.elements.recIndicator.classList.add('hidden');
        showToast('Video exportado');
      };
      
      let checkInterval = null;
      if (useMarkers && endTime !== null) {
        checkInterval = setInterval(() => {
          if (media.time() >= endTime) stopRecording();
        }, 100);
      }
      
      recorder.checkInterval = checkInterval;
      recorder.start();
      ui.elements.recBtn.disabled = true;
      ui.elements.stopBtn.classList.remove('hidden');
      ui.elements.status.textContent = 'Grabando...';
      ui.elements.recIndicator.classList.remove('hidden');
    }
    
    function stopRecording() {
      const isRecording = appState.get('media.isRecording');
      if (!isRecording || !recorder) return;
      if (recorder.checkInterval) {
        clearInterval(recorder.checkInterval);
        recorder.checkInterval = null;
      }
      if (recorder.state !== 'inactive') recorder.stop();
      appState.set('media.isRecording', false);
    }
    
    // ====================================================================
    // LEGACY GIF EXPORT (fallback si ExportManager no está)
    // ====================================================================
    async function exportGifLegacy() {
      const media = appState.get('media.file');
      const mediaType = appState.get('media.type');
      if (!media || mediaType !== 'video') return;
      
      const fps = parseInt(ui.elements.gifFpsSlider.value);
      const useMarkers = ui.elements.gifUseMarkersToggle.checked;
      
      let startTime = 0;
      let endTime = media.duration();
      
      if (useMarkers) {
        const markerIn = appState.get('timeline.markerInTime');
        const markerOut = appState.get('timeline.markerOutTime');
        if (markerIn !== null) startTime = markerIn;
        if (markerOut !== null) endTime = markerOut;
      }
      
      ui.elements.exportGifBtn.disabled = true;
      ui.elements.gifProgress.classList.remove('hidden');
      
      try {
        const config = appState.get('config');
        const blob = await exportGifCore(p, media, config, startTime, endTime, fps, progress => {
          const percent = Math.round(progress * 100);
          ui.elements.gifProgressText.textContent = `${percent}%`;
          ui.elements.gifProgressBar.style.width = `${percent}%`;
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dithering_${config.effect}_${Date.now()}.gif`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 100);
        
        showToast('GIF exportado');
      } catch (error) {
        console.error('Error:', error);
        showToast('Error al exportar GIF');
      }
      
      ui.elements.exportGifBtn.disabled = false;
      ui.elements.gifProgress.classList.add('hidden');
    }

    // ====================================================================
    // MÉTRICAS
    // ====================================================================
    function updateMetrics() {
      const media = appState.get('media.file');
      if (!media) { showToast('Carga un medio primero'); return; }
      
      const origBuffer = p.createGraphics(p.width, p.height);
      origBuffer.pixelDensity(1);
      origBuffer.image(media, 0, 0, p.width, p.height);
      
      const processedBuffer = p.get();
      
      const psnr = calculatePSNR(origBuffer, processedBuffer);
      const ssim = calculateSSIM(origBuffer, processedBuffer);
      const compression = calculateCompression(processedBuffer);
      
      appState.setMultiple({
        'metrics.psnr': psnr,
        'metrics.ssim': ssim,
        'metrics.compression': compression.ratio,
        'metrics.paletteSize': appState.get('config.colorCount')
      });
      
      document.getElementById('metricPSNR').textContent = psnr === Infinity ? '∞ dB' : psnr.toFixed(2) + ' dB';
      document.getElementById('metricSSIM').textContent = ssim.toFixed(4);
      document.getElementById('metricCompression').textContent = compression.ratio.toFixed(2) + '% (' + compression.unique + ' colores únicos)';
      document.getElementById('metricPaletteSize').textContent = appState.get('config.colorCount') + ' colores';
      document.getElementById('metricProcessTime').textContent = appState.get('metrics.processTime').toFixed(2) + ' ms';
      
      origBuffer.remove();
      showToast('Métricas actualizadas');
    }

    // ====================================================================
    // PRESETS
    // ====================================================================
    function savePreset(name) {
      if (!name) return;
      const presets = JSON.parse(localStorage.getItem("dither_presets") || "{}");
      const config = appState.get('config');
      presets[name] = { ...config, curves: curvesEditor.curves };
      localStorage.setItem("dither_presets", JSON.stringify(presets));
      ui.elements.presetNameInput.value = "";
      updatePresetList();
      showToast(`Preset "${name}" guardado`);
    }
    
    function deletePreset(name) {
      if (!name) return;
      const presets = JSON.parse(localStorage.getItem("dither_presets") || "{}");
      delete presets[name];
      localStorage.setItem("dither_presets", JSON.stringify(presets));
      updatePresetList();
      showToast(`Preset "${name}" eliminado`);
    }

    function updatePresetList() {
      const presets = JSON.parse(localStorage.getItem("dither_presets") || "{}");
      ui.elements.presetSelect.innerHTML = '<option value="">Cargar Preset...</option>';
      for (const name in presets) {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        ui.elements.presetSelect.appendChild(option);
      }
    }

    function applyPreset(name) {
      const presets = JSON.parse(localStorage.getItem("dither_presets") || "{}");
      if (!presets[name]) return;
      
      const presetData = presets[name];
      const cfg = { ...presetData };
      delete cfg.curves;

      for (const [key, value] of Object.entries(cfg)) {
        appState.set(`config.${key}`, value, true); // silent
      }
      
      if (presetData.curves) {
        curvesEditor.curves = presetData.curves;
        curvesEditor.render();
      }
      
      // Sync UI elements con los valores del preset
      ui.elements.effectSelect.value = cfg.effect;
      ui.elements.monochromeToggle.checked = cfg.isMonochrome;
      ui.elements.originalColorToggle.checked = cfg.useOriginalColor;
      ui.elements.colorCountSlider.value = cfg.colorCount;
      ui.elements.ditherScale.value = cfg.ditherScale;
      ui.elements.serpentineToggle.checked = cfg.serpentineScan;
      ui.elements.diffusionStrengthSlider.value = cfg.diffusionStrength * 100;
      ui.elements.patternStrengthSlider.value = cfg.patternStrength * 100;
      
      ui.elements.brightnessSlider.value = cfg.brightness || 0;
      ui.elements.contrastSlider.value = (cfg.contrast || 1.0) * 100;
      ui.elements.saturationSlider.value = (cfg.saturation || 1.0) * 100;
      ui.elements.brightnessVal.textContent = cfg.brightness || 0;
      ui.elements.contrastVal.textContent = (cfg.contrast || 1.0) * 100;
      ui.elements.saturationVal.textContent = (cfg.saturation || 1.0) * 100;

      ui.elements.colorCountVal.textContent = cfg.colorCount;
      ui.elements.ditherScaleVal.textContent = cfg.ditherScale;
      ui.elements.diffusionStrengthVal.textContent = cfg.diffusionStrength * 100;
      ui.elements.patternStrengthVal.textContent = cfg.patternStrength * 100;
      
      ui.updateColorPickers(appState, colorCache, lumaLUT, p);
      ui.updatePanelsVisibility(cfg);
      ui.togglePaletteControls(cfg.useOriginalColor);
      window.triggerRedraw();
      showToast(`Preset "${name}" cargado`);
    }

    // ====================================================================
    // FULLSCREEN
    // ====================================================================
    function toggleFullscreen() {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
        showToast('Pantalla completa');
      } else {
        document.exitFullscreen();
        showToast('Salir de pantalla completa');
      }
    }

    // ====================================================================
    // FRAME STATS
    // ====================================================================
    function updateFrameStats() {
      const fps = p.frameRate();
      fpsHistory.push(fps);
      frameTimeHistory.push(p.deltaTime);
      
      const avgFps = fpsHistory.average();
      const avgFt = frameTimeHistory.average();
      
      ui.elements.fps.textContent = isNaN(avgFps) || avgFps === 0 ? "--" : Math.round(avgFps);
      ui.elements.frameTime.textContent = isNaN(avgFt) || avgFt === 0 ? "--" : avgFt.toFixed(1);
      
      appState.set('metrics.processTime', avgFt, true);
      
      const mediaType = appState.get('media.type');
      const media = appState.get('media.file');
      if (mediaType === 'video' && media && media.duration() > 0) {
        ui.elements.timeDisplay.textContent = `${formatTime(media.time())} / ${formatTime(media.duration())}`;
      } else {
        ui.elements.timeDisplay.textContent = mediaType === 'image' ? 'Imagen Estática' : '00:00 / 00:00';
      }
      
      const playbackSpeed = appState.get('media.playbackSpeed');
      if (playbackSpeed !== 1 && mediaType === 'video') {
        ui.elements.speedDisplay.classList.remove('hidden');
        ui.elements.speedDisplay.querySelector('span').textContent = playbackSpeed.toFixed(2) + 'x';
      } else {
        ui.elements.speedDisplay.classList.add('hidden');
      }
      
      ui.elements.effectName.textContent = ALGORITHM_NAMES[appState.get('config.effect')] || "Desconocido";
    }
    
    // Cleanup periódico de buffers
    setInterval(() => bufferPool.cleanup(60000), 60000);
  };
  
  new p5(sketch);
});
