// src/components/timeline.js

import { formatTime } from '../utils/helpers.js';

/**
 * Timeline - Gestiona la UI y la lógica de la línea de tiempo del video.
 */
export default class Timeline {
  constructor(appState) {
    this.appState = appState;
    this.elements = {
      timeline: document.getElementById('timeline'),
      scrubber: document.getElementById('timelineScrubber'),
      progress: document.getElementById('timelineProgress'),
      timeDisplay: document.getElementById('timelineTime'),
      markerIn: document.getElementById('markerIn'),
      markerOut: document.getElementById('markerOut'),
      setInBtn: document.getElementById('setInBtn'),
      setOutBtn: document.getElementById('setOutBtn'),
      clearMarkersBtn: document.getElementById('clearMarkersBtn'),
      loopSectionToggle: document.getElementById('loopSectionToggle'),
    };
    
    this.isDragging = false;
    this.isDraggingMarker = null;

    this.bindEvents();
    this.appState.subscribe(this.update.bind(this));
  }

  bindEvents() {
    this.elements.setInBtn.addEventListener('click', () => {
      if (this.appState.mediaType === 'video') {
        this.appState.updateTimeline({ markerInTime: this.appState.media.time() });
      }
    });

    this.elements.setOutBtn.addEventListener('click', () => {
      if (this.appState.mediaType === 'video') {
        this.appState.updateTimeline({ markerOutTime: this.appState.media.time() });
      }
    });

    this.elements.clearMarkersBtn.addEventListener('click', () => {
      this.appState.updateTimeline({ markerInTime: null, markerOutTime: null });
    });

    this.elements.loopSectionToggle.addEventListener('change', (e) => {
      this.appState.updateTimeline({ loopSection: e.target.checked });
    });

    // Eventos de arrastre
    this.elements.timeline.addEventListener('mousedown', (e) => {
        if (this.appState.mediaType !== 'video') return;
        if (e.target === this.elements.markerIn || e.target === this.elements.markerOut) {
            this.isDraggingMarker = e.target;
        } else {
            this.isDragging = true;
            this.updateScrubPosition(e);
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (this.isDragging) this.updateScrubPosition(e);
        if (this.isDraggingMarker) this.updateMarkerPosition(e, this.isDraggingMarker);
    });

    document.addEventListener('mouseup', () => {
        this.isDragging = false;
        this.isDraggingMarker = null;
    });
  }
  
  updateScrubPosition(e) {
      const media = this.appState.media;
      if (!media) return;
      const rect = this.elements.timeline.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const percent = x / rect.width;
      const time = percent * media.duration();
      media.time(time); // Controla el tiempo del video directamente
  }

  updateMarkerPosition(e, marker) {
      const media = this.appState.media;
      if (!media) return;
      const rect = this.elements.timeline.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const percent = x / rect.width;
      const time = percent * media.duration();
      
      const newTimelineState = {};
      if (marker === this.elements.markerIn) {
          newTimelineState.markerInTime = time;
          if (this.appState.timeline.markerOutTime !== null && time > this.appState.timeline.markerOutTime) {
              newTimelineState.markerOutTime = time;
          }
      } else {
          newTimelineState.markerOutTime = time;
           if (this.appState.timeline.markerInTime !== null && time < this.appState.timeline.markerInTime) {
              newTimelineState.markerInTime = time;
          }
      }
      this.appState.updateTimeline(newTimelineState);
  }

  /**
   * Actualiza la UI de la línea de tiempo basándose en el estado actual.
   * @param {object} state
   */
  update(state) {
    if (state.mediaType !== 'video' || !state.media) {
      return;
    }
    
    const { currentTime, duration, markerInTime, markerOutTime } = state.timeline;
    const percent = duration > 0 ? (currentTime / duration) * 100 : 0;
    
    this.elements.scrubber.style.left = `${percent}%`;
    this.elements.progress.style.width = `${percent}%`;
    this.elements.timeDisplay.textContent = formatTime(currentTime);

    if (markerInTime !== null) {
      this.elements.markerIn.style.left = `${(markerInTime / duration) * 100}%`;
      this.elements.markerIn.style.display = 'block';
    } else {
      this.elements.markerIn.style.display = 'none';
    }

    if (markerOutTime !== null) {
      this.elements.markerOut.style.left = `${(markerOutTime / duration) * 100}%`;
      this.elements.markerOut.style.display = 'block';
    } else {
      this.elements.markerOut.style.display = 'none';
    }
  }
}
