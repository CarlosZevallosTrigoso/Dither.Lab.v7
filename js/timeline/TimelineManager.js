// ============================================================================
// TIMELINE MANAGER - Gestión de timeline para videos
// ============================================================================

class TimelineManager {
  constructor(state, eventBus) {
    this.state = state;
    this.eventBus = eventBus;
    
    // Referencias DOM
    this.elements = {};
    
    // Estado interno
    this.isDragging = false;
    this.isDraggingMarker = null;
    
    console.log('⏱️ TimelineManager inicializado');
  }

  /**
   * Inicializar timeline
   */
  init() {
    this.cacheElements();
    this.setupEventListeners();
    console.log('  ✓ Timeline configurado');
  }

  /**
   * Cachear elementos DOM
   */
  cacheElements() {
    const ids = [
      'timeline', 'timelineProgress', 'timelineScrubber', 
      'timelineTime', 'markerIn', 'markerOut'
    ];
    
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) this.elements[id] = el;
    });
  }

  /**
   * Configurar event listeners
   */
  setupEventListeners() {
    if (!this.elements.timeline) return;
    
    const timeline = this.elements.timeline;
    
    timeline.addEventListener('mousedown', this.onMouseDown.bind(this));
    document.addEventListener('mousemove', this.onMouseMove.bind(this));
    document.addEventListener('mouseup', this.onMouseUp.bind(this));
  }

  /**
   * Mouse down en timeline
   */
  onMouseDown(e) {
    const markerIn = this.elements.markerIn;
    const markerOut = this.elements.markerOut;
    
    // Verificar si clickeamos un marcador
    if (e.target === markerIn || e.target === markerOut) {
      this.isDraggingMarker = e.target;
      return;
    }
    
    // Clickeamos el timeline
    this.isDragging = true;
    this.updateScrubPosition(e);
  }

  /**
   * Mouse move
   */
  onMouseMove(e) {
    if (this.isDragging) {
      this.updateScrubPosition(e);
    } else if (this.isDraggingMarker) {
      this.updateMarkerPosition(e, this.isDraggingMarker);
    }
  }

  /**
   * Mouse up
   */
  onMouseUp() {
    this.isDragging = false;
    this.isDraggingMarker = null;
  }

  /**
   * Actualizar posición del scrubber
   */
  updateScrubPosition(e) {
    const media = this.state.get('media.file');
    if (!media) return;
    
    const timeline = this.elements.timeline;
    const rect = timeline.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percent = x / rect.width;
    const time = percent * media.duration();
    
    media.time(time);
    this.eventBus.emit('timeline:seeked', { time });
    this.update();
  }

  /**
   * Actualizar posición de marcador
   */
  updateMarkerPosition(e, marker) {
    const media = this.state.get('media.file');
    if (!media) return;
    
    const timeline = this.elements.timeline;
    const rect = timeline.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percent = x / rect.width;
    const time = percent * media.duration();
    
    if (marker === this.elements.markerIn) {
      this.state.set('timeline.markerInTime', time);
      
      // Asegurar que In < Out
      const outTime = this.state.get('timeline.markerOutTime');
      if (outTime !== null && time > outTime) {
        this.state.set('timeline.markerOutTime', time);
      }
    } else {
      this.state.set('timeline.markerOutTime', time);
      
      // Asegurar que Out > In
      const inTime = this.state.get('timeline.markerInTime');
      if (inTime !== null && time < inTime) {
        this.state.set('timeline.markerInTime', time);
      }
    }
    
    this.update();
  }

  /**
   * Actualizar visualización del timeline
   */
  update() {
    const media = this.state.get('media.file');
    if (!media || media.duration() === 0) return;
    
    const currentTime = media.time();
    const duration = media.duration();
    const percent = (currentTime / duration) * 100;
    
    // Actualizar scrubber y progreso
    if (this.elements.timelineScrubber) {
      this.elements.timelineScrubber.style.left = percent + '%';
    }
    
    if (this.elements.timelineProgress) {
      this.elements.timelineProgress.style.width = percent + '%';
    }
    
    if (this.elements.timelineTime) {
      this.elements.timelineTime.textContent = this.formatTime(currentTime);
    }
    
    // Actualizar marcadores
    this.updateMarkers(duration);
  }

  /**
   * Actualizar marcadores In/Out
   */
  updateMarkers(duration) {
    const markerInTime = this.state.get('timeline.markerInTime');
    const markerOutTime = this.state.get('timeline.markerOutTime');
    
    if (markerInTime !== null && this.elements.markerIn) {
      const inPercent = (markerInTime / duration) * 100;
      this.elements.markerIn.style.left = inPercent + '%';
      this.elements.markerIn.style.display = 'block';
    } else if (this.elements.markerIn) {
      this.elements.markerIn.style.display = 'none';
    }
    
    if (markerOutTime !== null && this.elements.markerOut) {
      const outPercent = (markerOutTime / duration) * 100;
      this.elements.markerOut.style.left = outPercent + '%';
      this.elements.markerOut.style.display = 'block';
    } else if (this.elements.markerOut) {
      this.elements.markerOut.style.display = 'none';
    }
  }

  /**
   * Formatear tiempo MM:SS
   */
  formatTime(seconds) {
    if (isNaN(seconds) || seconds === Infinity) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  /**
   * Limpiar marcadores
   */
  clearMarkers() {
    this.state.setMultiple({
      'timeline.markerInTime': null,
      'timeline.markerOutTime': null
    });
    this.update();
  }
}

// Exportar
if (typeof window !== 'undefined') {
  window.TimelineManager = TimelineManager;
}