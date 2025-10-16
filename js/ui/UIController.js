// ============================================================================
// UI CONTROLLER - Coordinador de interfaz de usuario
// ============================================================================
// Gestiona todos los elementos de la UI y los conecta con el EventBus y State

class UIController {
  constructor(state, eventBus) {
    this.state = state;
    this.eventBus = eventBus;
    
    // Caché de elementos DOM
    this.elements = {};
    
    // Estado interno de UI
    this.lastColorCount = 0;
    
    // Referencia a componentes especializados
    this.curvesEditor = null;
    
    console.log('🎛️ UIController inicializado');
  }
  
  /**
   * Inicializar el controlador
   */
  init() {
    console.log('🎛️ Inicializando elementos de UI...');
    
    // Cachear todos los elementos DOM
    this.cacheElements();
    
    // Inicializar editor de curvas si existe
    if (typeof CurvesEditor !== 'undefined' && this.elements.curvesCanvas) {
      this.curvesEditor = new CurvesEditor('curvesCanvas');
    }
    
    // Configurar listeners de eventos
    this.setupEventListeners();
    
    // Suscribirse a cambios de estado
    this.subscribeToStateChanges();
    
    // Actualizar UI inicial
    this.updateUI();
    
    console.log('✅ UIController inicializado completamente');
  }
  
  /**
   * Cachear todos los elementos DOM
   */
  cacheElements() {
    const elementIds = [
      // Media controls
      'dropZone', 'fileInput', 'playBtn', 'restartBtn',
      'mediaType', 'mediaDimensions', 'mediaInfo',
      
      // Algorithm controls
      'effectSelect', 'infoText',
      
      // Palette controls
      'monochromeToggle', 'originalColorToggle',
      'colorCountSlider', 'colorCountVal', 'colorPickerContainer',
      
      // Dither controls
      'ditherControls', 'ditherScale', 'ditherScaleVal',
      'serpentineToggle', 'diffusionStrengthSlider', 'diffusionStrengthVal',
      'patternStrengthSlider', 'patternStrengthVal',
      'errorDiffusionControls', 'orderedDitherControls',
      
      // Image adjustments
      'resetImageAdjustmentsBtn', 'toggleCurvesBtn',
      'brightnessSlider', 'brightnessVal',
      'contrastSlider', 'contrastVal',
      'saturationSlider', 'saturationVal',
      'basicImageControls', 'curvesEditor', 'curvesCanvas',
      'resetCurveBtn', 'resetAllCurvesBtn',
      
      // Timeline
      'timelinePanel', 'timeline', 'timelineProgress',
      'timelineScrubber', 'timelineTime',
      'markerIn', 'markerOut',
      'setInBtn', 'setOutBtn', 'clearMarkersBtn',
      'loopSectionToggle', 'playbackSpeedSlider', 'playbackSpeedVal',
      'prevFrameBtn', 'nextFrameBtn',
      
      // Export
      'recBtn', 'stopBtn', 'recIndicator',
      'downloadImageBtn', 'exportSequenceBtn',
      'webmUseMarkersToggle',
      'gifExportPanel', 'gifFpsSlider', 'gifFpsVal',
      'gifQualitySlider', 'gifQualityVal', 'gifUseMarkersToggle',
      'exportGifBtn', 'gifProgress', 'gifProgressText', 'gifProgressBar',
      'spriteSheetPanel', 'spriteColsSlider', 'spriteCols',
      'spriteFrameCountSlider', 'spriteFrameCount', 'exportSpriteBtn',
      
      // Presets
      'presetNameInput', 'savePresetBtn', 'presetSelect', 'deletePresetBtn',
      
      // Stats & Metrics
      'fps', 'frameTime', 'effectName', 'timeDisplay', 'speedDisplay',
      'metricsBtn', 'metricsModal', 'closeMetricsBtn', 'updateMetricsBtn',
      
      // Modals
      'shortcutsBtn', 'shortcutsModal', 'closeShortcutsBtn',
      
      // Status
      'status'
    ];
    
    for (const id of elementIds) {
      const element = document.getElementById(id);
      if (element) {
        this.elements[id] = element;
      } else {
        // console.warn(`[UIController] Elemento no encontrado: ${id}`);
      }
    }
    
    console.log(`  ✓ ${Object.keys(this.elements).length} elementos cacheados`);
  }
  
  /**
   * Configurar listeners de eventos del DOM
   */
  setupEventListeners() {
    console.log('  ⚡ Configurando event listeners...');
    
    // Drag & Drop
    this.setupDragAndDrop();
    
    // Media controls
    this.setupMediaControls();
    
    // Algorithm controls
    this.setupAlgorithmControls();
    
    // Palette controls
    this.setupPaletteControls();
    
    // Dither controls
    this.setupDitherControls();
    
    // Image adjustments
    this.setupImageAdjustments();
    
    // Timeline controls
    this.setupTimelineControls();
    
    // Export controls
    this.setupExportControls();
    
    // Preset controls
    this.setupPresetControls();
    
    // Modals
    this.setupModals();
    
    // Keyboard shortcuts
    this.setupKeyboardShortcuts();
    
    console.log('  ✓ Event listeners configurados');
  }
  
  /**
   * Configurar drag & drop
   */
  setupDragAndDrop() {
    if (!this.elements.dropZone || !this.elements.fileInput) return;
    
    // Drag over
    document.body.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.elements.dropZone.classList.add('border-cyan-400');
    });
    
    // Drag leave
    document.body.addEventListener('dragleave', () => {
      this.elements.dropZone.classList.remove('border-cyan-400');
    });
    
    // Drop
    document.body.addEventListener('drop', (e) => {
      e.preventDefault();
      this.elements.dropZone.classList.remove('border-cyan-400');
      
      if (e.dataTransfer.files.length > 0) {
        this.eventBus.emit('media:file-dropped', { file: e.dataTransfer.files[0] });
      }
    });
    
    // Click to open file dialog
    this.elements.dropZone.addEventListener('click', () => {
      this.elements.fileInput.click();
    });
    
    // File input change
    this.elements.fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        this.eventBus.emit('media:file-selected', { file: e.target.files[0] });
      }
    });
  }
  
  /**
   * Configurar controles de media
   */
  setupMediaControls() {
    if (this.elements.playBtn) {
      this.elements.playBtn.addEventListener('click', () => {
        this.eventBus.emit('media:toggle-play');
      });
    }
    
    if (this.elements.restartBtn) {
      this.elements.restartBtn.addEventListener('click', () => {
        this.eventBus.emit('media:restart');
      });
    }
  }
  
  /**
   * Configurar controles de algoritmo
   */
  setupAlgorithmControls() {
    if (this.elements.effectSelect) {
      this.elements.effectSelect.addEventListener('change', (e) => {
        this.state.set('config.effect', e.target.value);
        this.updatePanelsVisibility();
      });
    }
  }
  
  /**
   * Configurar controles de paleta
   */
  setupPaletteControls() {
    if (this.elements.monochromeToggle) {
      this.elements.monochromeToggle.addEventListener('change', (e) => {
        this.state.set('config.isMonochrome', e.target.checked);
      });
    }
    
    if (this.elements.originalColorToggle) {
      this.elements.originalColorToggle.addEventListener('change', (e) => {
        this.state.set('config.useOriginalColor', e.target.checked);
        this.togglePaletteControls(e.target.checked);
      });
    }
    
    if (this.elements.colorCountSlider) {
      this.elements.colorCountSlider.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        if (this.elements.colorCountVal) {
          this.elements.colorCountVal.textContent = value;
        }
        
        // Usar debounce para evitar actualizaciones excesivas
        clearTimeout(this._colorCountTimeout);
        this._colorCountTimeout = setTimeout(() => {
          this.state.set('config.colorCount', value);
        }, 100);
      });
    }
  }
  
  /**
   * Configurar controles de dithering
   */
  setupDitherControls() {
    if (this.elements.ditherScale) {
      this.elements.ditherScale.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        if (this.elements.ditherScaleVal) {
          this.elements.ditherScaleVal.textContent = value;
        }
        this.state.set('config.ditherScale', value);
      });
    }
    
    if (this.elements.serpentineToggle) {
      this.elements.serpentineToggle.addEventListener('change', (e) => {
        this.state.set('config.serpentineScan', e.target.checked);
      });
    }
    
    if (this.elements.diffusionStrengthSlider) {
      this.elements.diffusionStrengthSlider.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        if (this.elements.diffusionStrengthVal) {
          this.elements.diffusionStrengthVal.textContent = value;
        }
        this.state.set('config.diffusionStrength', value / 100);
      });
    }
    
    if (this.elements.patternStrengthSlider) {
      this.elements.patternStrengthSlider.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        if (this.elements.patternStrengthVal) {
          this.elements.patternStrengthVal.textContent = value;
        }
        this.state.set('config.patternStrength', value / 100);
      });
    }
  }
  
  /**
   * Configurar ajustes de imagen
   */
  setupImageAdjustments() {
    if (this.elements.brightnessSlider) {
      this.elements.brightnessSlider.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        if (this.elements.brightnessVal) {
          this.elements.brightnessVal.textContent = value;
        }
        this.state.set('config.brightness', value);
      });
    }
    
    if (this.elements.contrastSlider) {
      this.elements.contrastSlider.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        if (this.elements.contrastVal) {
          this.elements.contrastVal.textContent = value;
        }
        this.state.set('config.contrast', value / 100);
      });
    }
    
    if (this.elements.saturationSlider) {
      this.elements.saturationSlider.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        if (this.elements.saturationVal) {
          this.elements.saturationVal.textContent = value;
        }
        this.state.set('config.saturation', value / 100);
      });
    }
    
    if (this.elements.resetImageAdjustmentsBtn) {
      this.elements.resetImageAdjustmentsBtn.addEventListener('click', () => {
        this.resetImageAdjustments();
      });
    }
    
    if (this.elements.toggleCurvesBtn) {
      this.elements.toggleCurvesBtn.addEventListener('click', () => {
        this.toggleCurvesEditor();
      });
    }
    
    // Botones de curvas
    if (this.elements.resetCurveBtn && this.curvesEditor) {
      this.elements.resetCurveBtn.addEventListener('click', () => {
        this.curvesEditor.resetChannel(this.curvesEditor.currentChannel);
        this.eventBus.emit('render:needed');
      });
    }
    
    if (this.elements.resetAllCurvesBtn && this.curvesEditor) {
      this.elements.resetAllCurvesBtn.addEventListener('click', () => {
        this.curvesEditor.resetAllChannels();
        this.eventBus.emit('render:needed');
      });
    }
    
    // Botones de canal de curvas
    document.querySelectorAll('.curve-channel-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        if (!this.curvesEditor) return;
        
        document.querySelectorAll('.curve-channel-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.curvesEditor.setChannel(e.target.dataset.channel);
      });
    });
  }
  
  /**
   * Configurar controles de timeline
   */
  setupTimelineControls() {
    if (this.elements.setInBtn) {
      this.elements.setInBtn.addEventListener('click', () => {
        const currentTime = this.state.get('media.currentTime');
        this.state.set('timeline.markerInTime', currentTime);
        this.showToast(`Entrada: ${this.formatTime(currentTime)}`);
      });
    }
    
    if (this.elements.setOutBtn) {
      this.elements.setOutBtn.addEventListener('click', () => {
        const currentTime = this.state.get('media.currentTime');
        this.state.set('timeline.markerOutTime', currentTime);
        this.showToast(`Salida: ${this.formatTime(currentTime)}`);
      });
    }
    
    if (this.elements.clearMarkersBtn) {
      this.elements.clearMarkersBtn.addEventListener('click', () => {
        this.state.setMultiple({
          'timeline.markerInTime': null,
          'timeline.markerOutTime': null
        });
        this.showToast('Marcadores limpiados');
      });
    }
    
    if (this.elements.loopSectionToggle) {
      this.elements.loopSectionToggle.addEventListener('change', (e) => {
        this.state.set('timeline.loopSection', e.target.checked);
      });
    }
    
    if (this.elements.playbackSpeedSlider) {
      this.elements.playbackSpeedSlider.addEventListener('input', (e) => {
        const speed = parseInt(e.target.value) / 100;
        if (this.elements.playbackSpeedVal) {
          this.elements.playbackSpeedVal.textContent = speed.toFixed(2);
        }
        this.eventBus.emit('media:speed-change', { speed });
      });
    }
    
    // Botones de speed preset
    document.querySelectorAll('.speed-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        const speed = parseInt(btn.dataset.speed) / 100;
        if (this.elements.playbackSpeedSlider) {
          this.elements.playbackSpeedSlider.value = speed * 100;
        }
        if (this.elements.playbackSpeedVal) {
          this.elements.playbackSpeedVal.textContent = speed.toFixed(2);
        }
        this.eventBus.emit('media:speed-change', { speed });
      });
    });
    
    if (this.elements.prevFrameBtn) {
      this.elements.prevFrameBtn.addEventListener('click', () => {
        this.eventBus.emit('media:step-frames', { frames: -1 });
      });
    }
    
    if (this.elements.nextFrameBtn) {
      this.elements.nextFrameBtn.addEventListener('click', () => {
        this.eventBus.emit('media:step-frames', { frames: 1 });
      });
    }
  }
  
  /**
   * Configurar controles de exportación
   */
  setupExportControls() {
    if (this.elements.downloadImageBtn) {
      this.elements.downloadImageBtn.addEventListener('click', () => {
        this.eventBus.emit('export:png');
      });
    }
    
    if (this.elements.recBtn) {
      this.elements.recBtn.addEventListener('click', () => {
        const useMarkers = this.elements.webmUseMarkersToggle ? 
          this.elements.webmUseMarkersToggle.checked : true;
        this.eventBus.emit('export:webm-start', { useMarkers });
      });
    }
    
    if (this.elements.stopBtn) {
      this.elements.stopBtn.addEventListener('click', () => {
        this.eventBus.emit('export:webm-stop');
      });
    }
    
    if (this.elements.exportGifBtn) {
      this.elements.exportGifBtn.addEventListener('click', () => {
        const fps = this.elements.gifFpsSlider ? 
          parseInt(this.elements.gifFpsSlider.value) : 10;
        const quality = this.elements.gifQualitySlider ? 
          parseInt(this.elements.gifQualitySlider.value) : 10;
        const useMarkers = this.elements.gifUseMarkersToggle ? 
          this.elements.gifUseMarkersToggle.checked : true;
        
        this.eventBus.emit('export:gif', { fps, quality, useMarkers });
      });
    }
    
    if (this.elements.exportSpriteBtn) {
      this.elements.exportSpriteBtn.addEventListener('click', () => {
        const cols = this.elements.spriteColsSlider ? 
          parseInt(this.elements.spriteColsSlider.value) : 8;
        const frameCount = this.elements.spriteFrameCountSlider ? 
          parseInt(this.elements.spriteFrameCountSlider.value) : 30;
        
        this.eventBus.emit('export:sprite-sheet', { cols, frameCount });
      });
    }
    
    if (this.elements.exportSequenceBtn) {
      this.elements.exportSequenceBtn.addEventListener('click', () => {
        this.eventBus.emit('export:png-sequence');
      });
    }
    
    // Sliders de GIF
    if (this.elements.gifFpsSlider) {
      this.elements.gifFpsSlider.addEventListener('input', (e) => {
        if (this.elements.gifFpsVal) {
          this.elements.gifFpsVal.textContent = e.target.value;
        }
      });
    }
    
    if (this.elements.gifQualitySlider) {
      this.elements.gifQualitySlider.addEventListener('input', (e) => {
        if (this.elements.gifQualityVal) {
          this.elements.gifQualityVal.textContent = e.target.value;
        }
      });
    }
    
    // Sliders de Sprite Sheet
    if (this.elements.spriteColsSlider) {
      this.elements.spriteColsSlider.addEventListener('input', (e) => {
        if (this.elements.spriteCols) {
          this.elements.spriteCols.textContent = e.target.value;
        }
      });
    }
    
    if (this.elements.spriteFrameCountSlider) {
      this.elements.spriteFrameCountSlider.addEventListener('input', (e) => {
        if (this.elements.spriteFrameCount) {
          this.elements.spriteFrameCount.textContent = e.target.value;
        }
      });
    }
  }
  
  /**
   * Configurar controles de presets
   */
  setupPresetControls() {
    if (this.elements.savePresetBtn) {
      this.elements.savePresetBtn.addEventListener('click', () => {
        const name = this.elements.presetNameInput ? 
          this.elements.presetNameInput.value.trim() : '';
        
        if (name) {
          this.eventBus.emit('preset:save', { name });
        }
      });
    }
    
    if (this.elements.deletePresetBtn) {
      this.elements.deletePresetBtn.addEventListener('click', () => {
        const name = this.elements.presetSelect ? 
          this.elements.presetSelect.value : '';
        
        if (name) {
          this.eventBus.emit('preset:delete', { name });
        }
      });
    }
    
    if (this.elements.presetSelect) {
      this.elements.presetSelect.addEventListener('change', (e) => {
        if (e.target.value) {
          this.eventBus.emit('preset:load', { name: e.target.value });
        }
      });
    }
  }
  
  /**
   * Configurar modals
   */
  setupModals() {
    // Shortcuts modal
    if (this.elements.shortcutsBtn && this.elements.shortcutsModal) {
      this.elements.shortcutsBtn.addEventListener('click', () => {
        this.elements.shortcutsModal.style.display = 'flex';
      });
    }
    
    if (this.elements.closeShortcutsBtn && this.elements.shortcutsModal) {
      this.elements.closeShortcutsBtn.addEventListener('click', () => {
        this.elements.shortcutsModal.style.display = 'none';
      });
    }
    
    if (this.elements.shortcutsModal) {
      this.elements.shortcutsModal.addEventListener('click', (e) => {
        if (e.target === this.elements.shortcutsModal) {
          this.elements.shortcutsModal.style.display = 'none';
        }
      });
    }
    
    // Metrics modal
    if (this.elements.metricsBtn && this.elements.metricsModal) {
      this.elements.metricsBtn.addEventListener('click', () => {
        this.elements.metricsModal.style.display = 'flex';
      });
    }
    
    if (this.elements.closeMetricsBtn && this.elements.metricsModal) {
      this.elements.closeMetricsBtn.addEventListener('click', () => {
        this.elements.metricsModal.style.display = 'none';
      });
    }
    
    if (this.elements.metricsModal) {
      this.elements.metricsModal.addEventListener('click', (e) => {
        if (e.target === this.elements.metricsModal) {
          this.elements.metricsModal.style.display = 'none';
        }
      });
    }
    
    if (this.elements.updateMetricsBtn) {
      this.elements.updateMetricsBtn.addEventListener('click', () => {
        this.eventBus.emit('metrics:update-requested');
      });
    }
  }
  
  /**
   * Configurar atajos de teclado
   */
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ignorar si se está escribiendo en un input
      if (e.target.tagName === 'INPUT' || 
          e.target.tagName === 'SELECT' || 
          e.target.tagName === 'TEXTAREA') {
        return;
      }
      
      const key = e.key.toLowerCase();
      
      switch(key) {
        case ' ':
          e.preventDefault();
          this.eventBus.emit('media:toggle-play');
          break;
        
        case 'arrowleft':
          e.preventDefault();
          this.eventBus.emit('media:step-frames', { frames: -1 });
          break;
        
        case 'arrowright':
          e.preventDefault();
          this.eventBus.emit('media:step-frames', { frames: 1 });
          break;
        
        case 'i':
          e.preventDefault();
          if (this.elements.setInBtn) this.elements.setInBtn.click();
          break;
        
        case 'o':
          e.preventDefault();
          if (this.elements.setOutBtn) this.elements.setOutBtn.click();
          break;
        
        case 'r':
          e.preventDefault();
          if (this.elements.recBtn && !this.elements.recBtn.disabled) {
            this.elements.recBtn.click();
          }
          break;
        
        case 's':
          e.preventDefault();
          if (this.elements.stopBtn && 
              !this.elements.stopBtn.classList.contains('hidden')) {
            this.elements.stopBtn.click();
          }
          break;
        
        case 'd':
          e.preventDefault();
          this.eventBus.emit('export:png');
          break;
        
        case 'f':
          e.preventDefault();
          this.toggleFullscreen();
          break;
        
        case 'm':
          e.preventDefault();
          if (this.elements.metricsModal) {
            this.elements.metricsModal.style.display = 'flex';
          }
          break;
        
        case '?':
          e.preventDefault();
          if (this.elements.shortcutsModal) {
            this.elements.shortcutsModal.style.display = 'flex';
          }
          break;
        
        case 'escape':
          if (this.elements.shortcutsModal) {
            this.elements.shortcutsModal.style.display = 'none';
          }
          if (this.elements.metricsModal) {
            this.elements.metricsModal.style.display = 'none';
          }
          break;
      }
    });
  }
  
  /**
   * Suscribirse a cambios de estado
   */
  subscribeToStateChanges() {
    this.state.subscribe((path, value, oldValue) => {
      if (typeof path !== 'string') return;
      
      // Actualizar UI según el cambio
      if (path.startsWith('media')) {
        this.updateMediaUI();
      } else if (path.startsWith('config')) {
        this.updateConfigUI();
      } else if (path.startsWith('timeline')) {
        this.updateTimelineUI();
      } else if (path.startsWith('metrics')) {
        this.updateMetricsUI();
      }
    });
  }
  
  /**
   * Actualizar toda la UI
   */
  updateUI() {
    this.updateMediaUI();
    this.updateConfigUI();
    this.updateTimelineUI();
    this.updateMetricsUI();
    this.updatePanelsVisibility();
  }
  
  /**
   * Actualizar UI de media
   */
  updateMediaUI() {
    const mediaType = this.state.get('media.type');
    const media = this.state.get('media.file');
    const isPlaying = this.state.get('media.isPlaying');
    
    if (this.elements.mediaType) {
      if (mediaType === 'video') {
        this.elements.mediaType.textContent = 'VIDEO';
        this.elements.mediaType.className = 'bg-blue-600 px-2 py-1 rounded text-xs';
      } else if (mediaType === 'image') {
        this.elements.mediaType.textContent = 'IMAGEN';
        this.elements.mediaType.className = 'bg-purple-600 px-2 py-1 rounded text-xs';
      } else {
        this.elements.mediaType.textContent = 'No cargado';
        this.elements.mediaType.className = 'bg-slate-700 px-2 py-1 rounded text-xs';
      }
    }
    
    if (this.elements.mediaDimensions && media) {
      if (mediaType === 'video') {
        const duration = this.state.get('media.duration');
        this.elements.mediaDimensions.textContent = 
          `${media.width}x${media.height} - ${this.formatTime(duration)}`;
      } else {
        this.elements.mediaDimensions.textContent = `${media.width}x${media.height}`;
      }
    }
    
    if (this.elements.playBtn) {
      if (mediaType === 'video') {
        this.elements.playBtn.textContent = isPlaying ? 'Pause' : 'Play';
        this.elements.playBtn.disabled = false;
      } else {
        this.elements.playBtn.textContent = 'N/A';
        this.elements.playBtn.disabled = true;
      }
    }
    
    if (this.elements.recBtn) {
      this.elements.recBtn.disabled = mediaType !== 'video';
    }
    
    // Mostrar/ocultar paneles según tipo de media
    const isVideo = mediaType === 'video';
    
    if (this.elements.timelinePanel) {
      this.elements.timelinePanel.classList.toggle('hidden', !isVideo);
    }
    
    if (this.elements.gifExportPanel) {
      this.elements.gifExportPanel.classList.toggle('hidden', !isVideo);
    }
    
    if (this.elements.spriteSheetPanel) {
      this.elements.spriteSheetPanel.classList.toggle('hidden', !isVideo);
    }
    
    if (this.elements.exportSequenceBtn) {
      this.elements.exportSequenceBtn.classList.toggle('hidden', !isVideo);
    }
  }
  
  /**
   * Actualizar UI de configuración
   */
  updateConfigUI() {
    const effect = this.state.get('config.effect');
    
    if (this.elements.effectSelect) {
      this.elements.effectSelect.value = effect;
    }
    
    if (this.elements.effectName) {
      this.elements.effectName.textContent = ALGORITHM_NAMES[effect] || effect;
    }
    
    if (this.elements.infoText) {
      this.elements.infoText.textContent = 
        ALGORITHM_INFO[effect] || 'Selecciona un algoritmo.';
    }
  }
  
  /**
   * Actualizar UI de timeline
   */
  updateTimelineUI() {
    // Esta función será llamada desde el código legacy de app.js
    // por ahora solo aseguramos que los marcadores estén visibles
  }
  
  /**
   * Actualizar UI de métricas
   */
  updateMetricsUI() {
    const fps = this.state.get('metrics.fps');
    const processTime = this.state.get('metrics.processTime');
    
    if (this.elements.fps) {
      this.elements.fps.textContent = fps > 0 ? Math.round(fps) : '--';
    }
    
    if (this.elements.frameTime) {
      this.elements.frameTime.textContent = processTime > 0 ? processTime.toFixed(1) : '--';
    }
  }
  
  /**
   * Actualizar visibilidad de paneles
   */
  updatePanelsVisibility() {
    const effect = this.state.get('config.effect');
    const isDithering = effect !== 'none' && effect !== 'posterize';
    
    if (this.elements.ditherControls) {
      this.elements.ditherControls.classList.toggle('hidden', !isDithering);
    }
    
    if (isDithering) {
      const isErrorDiffusion = !!KERNELS[effect] || effect === 'variable-error';
      const isOrdered = effect === 'bayer' || effect === 'blue-noise';
      
      if (this.elements.errorDiffusionControls) {
        this.elements.errorDiffusionControls.classList.toggle('hidden', !isErrorDiffusion);
      }
      
      if (this.elements.orderedDitherControls) {
        this.elements.orderedDitherControls.classList.toggle('hidden', !isOrdered);
      }
    }
  }
  
  /**
   * Toggle controles de paleta
   * @param {boolean} disabled - Si están deshabilitados
   */
  togglePaletteControls(disabled) {
    if (this.elements.monochromeToggle) {
      this.elements.monochromeToggle.disabled = disabled;
    }
    
    if (this.elements.colorCountSlider) {
      this.elements.colorCountSlider.disabled = disabled;
    }
    
    const colorInputs = this.elements.colorPickerContainer?.querySelectorAll('input');
    colorInputs?.forEach(input => input.disabled = disabled);
  }
  
  /**
   * Resetear ajustes de imagen
   */
  resetImageAdjustments() {
    this.state.setMultiple({
      'config.brightness': 0,
      'config.contrast': 1.0,
      'config.saturation': 1.0
    });
    
    if (this.elements.brightnessSlider) {
      this.elements.brightnessSlider.value = 0;
      if (this.elements.brightnessVal) {
        this.elements.brightnessVal.textContent = 0;
      }
    }
    
    if (this.elements.contrastSlider) {
      this.elements.contrastSlider.value = 100;
      if (this.elements.contrastVal) {
        this.elements.contrastVal.textContent = 100;
      }
    }
    
    if (this.elements.saturationSlider) {
      this.elements.saturationSlider.value = 100;
      if (this.elements.saturationVal) {
        this.elements.saturationVal.textContent = 100;
      }
    }
    
    if (this.curvesEditor) {
      this.curvesEditor.resetAllChannels();
    }
    
    this.eventBus.emit('render:needed');
    this.showToast('Ajustes de imagen reseteados');
  }
  
  /**
   * Toggle editor de curvas
   */
  toggleCurvesEditor() {
    if (!this.elements.basicImageControls || !this.elements.curvesEditor) {
      return;
    }
    
    this.elements.basicImageControls.classList.toggle('hidden');
    this.elements.curvesEditor.classList.toggle('hidden');
    
    if (!this.elements.curvesEditor.classList.contains('hidden') && this.curvesEditor) {
      this.curvesEditor.render();
    }
  }
  
  /**
   * Toggle pantalla completa
   */
  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      this.showToast('Pantalla completa');
    } else {
      document.exitFullscreen();
      this.showToast('Salir de pantalla completa');
    }
  }
  
  /**
   * Mostrar toast notification
   * @param {string} message - Mensaje
   * @param {number} duration - Duración en ms
   */
  showToast(message, duration = 3000) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'slideIn 0.3s ease-out reverse';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
  
  /**
   * Formatear tiempo en formato MM:SS
   * @param {number} seconds - Segundos
   * @returns {string}
   */
  formatTime(seconds) {
    if (isNaN(seconds) || seconds === Infinity) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  
  /**
   * Actualizar estado de status
   * @param {string} message - Mensaje de status
   */
  setStatus(message) {
    if (this.elements.status) {
      this.elements.status.textContent = message;
    }
  }
}

// Exportar
if (typeof window !== 'undefined') {
  window.UIController = UIController;
}