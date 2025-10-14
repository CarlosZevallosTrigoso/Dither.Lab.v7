/**
 * @file TimelinePanel.js
 * @description Componente de UI para la línea de tiempo del video y controles de reproducción avanzados.
 */
import { BasePanel } from './BasePanel.js';
import { $, $$ } from '../utils/DOMHelpers.js';
import { formatTime } from '../../utils/formatters.js';

export class TimelinePanel extends BasePanel {
  constructor() {
    super('timelinePanel');
    this.elements = {
      panel: this.panelElement,
      // Timeline y marcadores
      timeline: $('#timeline'),
      progress: $('#timelineProgress'),
      scrubber: $('#timelineScrubber'),
      timeDisplay: $('#timelineTime'),
      markerIn: $('#markerIn'),
      markerOut: $('#markerOut'),
      // Botones de control
      setInBtn: $('#setInBtn'),
      setOutBtn: $('#setOutBtn'),
      clearMarkersBtn: $('#clearMarkersBtn'),
      loopToggle: $('#loopSectionToggle'),
      // Velocidad de reproducción
      speedSlider: $('#playbackSpeedSlider'),
      speedVal: $('#playbackSpeedVal'),
      speedPresets: $$('.speed-preset'),
      // Control por frames
      prevFrameBtn: $('#prevFrameBtn'),
      nextFrameBtn: $('#nextFrameBtn'),
    };
    this.isDragging = false;
    this.isDraggingMarker = null; // 'in' | 'out' | null
  }

  bindEvents() {
    // Eventos de la línea de tiempo
    this.elements.timeline.addEventListener('mousedown', this.handleMouseDown.bind(this));
    document.addEventListener('mousemove', this.handleMouseMove.bind(this));
    document.addEventListener('mouseup', this.handleMouseUp.bind(this));

    // Botones de marcadores
    this.elements.setInBtn.addEventListener('click', () => this.eventBus.publish('timeline:set-marker', 'in'));
    this.elements.setOutBtn.addEventListener('click', () => this.eventBus.publish('timeline:set-marker', 'out'));
    this.elements.clearMarkersBtn.addEventListener('click', () => this.eventBus.publish('timeline:clear-markers'));
    this.elements.loopToggle.addEventListener('change', (e) => this.store.setKey('timeline.loopSection', e.target.checked));

    // Controles de velocidad
    this.elements.speedSlider.addEventListener('input', (e) => {
      const speed = parseInt(e.target.value, 10) / 100;
      this.eventBus.publish('playback:set-speed', speed);
    });
    this.elements.speedPresets.forEach(btn => {
      btn.addEventListener('click', () => {
        const speed = parseInt(btn.dataset.speed, 10) / 100;
        this.eventBus.publish('playback:set-speed', speed);
      });
    });

    // Controles de frame
    this.elements.prevFrameBtn.addEventListener('click', () => this.eventBus.publish('playback:step-frame', -1));
    this.elements.nextFrameBtn.addEventListener('click', () => this.eventBus.publish('playback:step-frame', 1));
  }

  render(state) {
    const { media, timeline, playback } = state;
    this.elements.panel.classList.toggle('hidden', media.type !== 'video');
    if (media.type !== 'video' || !media.isLoaded) return;

    // Actualizar scrubber y progreso
    const percent = (media.duration > 0) ? (playback.currentTime / media.duration) * 100 : 0;
    this.elements.scrubber.style.left = `${percent}%`;
    this.elements.progress.style.width = `${percent}%`;
    this.elements.timeDisplay.textContent = formatTime(playback.currentTime);

    // Actualizar marcadores
    if (timeline.markerInTime !== null) {
      const inPercent = (media.duration > 0) ? (timeline.markerInTime / media.duration) * 100 : 0;
      this.elements.markerIn.style.left = `${inPercent}%`;
      this.elements.markerIn.style.display = 'block';
    } else {
      this.elements.markerIn.style.display = 'none';
    }

    if (timeline.markerOutTime !== null) {
      const outPercent = (media.duration > 0) ? (timeline.markerOutTime / media.duration) * 100 : 0;
      this.elements.markerOut.style.left = `${outPercent}%`;
      this.elements.markerOut.style.display = 'block';
    } else {
      this.elements.markerOut.style.display = 'none';
    }

    // Actualizar controles
    this.elements.loopToggle.checked = timeline.loopSection;
    this.elements.speedSlider.value = playback.speed * 100;
    this.elements.speedVal.textContent = playback.speed.toFixed(2);
  }
  
  // --- Manejadores de eventos de arrastre ---
  
  handleMouseDown(e) {
    if (e.target === this.elements.markerIn) {
      this.isDraggingMarker = 'in';
    } else if (e.target === this.elements.markerOut) {
      this.isDraggingMarker = 'out';
    } else {
      this.isDragging = true;
      this.updateScrubPosition(e);
    }
  }

  handleMouseMove(e) {
    if (this.isDragging) {
      this.updateScrubPosition(e);
    } else if (this.isDraggingMarker) {
      this.updateMarkerPosition(e);
    }
  }

  handleMouseUp() {
    this.isDragging = false;
    this.isDraggingMarker = null;
  }
  
  updateScrubPosition(e) {
    const rect = this.elements.timeline.getBoundingClientRect();
    const percent = Math.max(0, Math.min((e.clientX - rect.left) / rect.width, 1));
    this.eventBus.publish('playback:seek', percent);
  }

  updateMarkerPosition(e) {
    const rect = this.elements.timeline.getBoundingClientRect();
    const percent = Math.max(0, Math.min((e.clientX - rect.left) / rect.width, 1));
    this.eventBus.publish('timeline:drag-marker', { marker: this.isDraggingMarker, percent });
  }
}
