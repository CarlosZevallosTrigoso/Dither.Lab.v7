/**
 * @file MediaPanel.js
 * @description Componente de la UI para la carga de medios y controles de reproducción.
 */
import { BasePanel } from './BasePanel.js';
import { $, $$ } from '../utils/DOMHelpers.js';
import { formatTime } from '../../utils/formatters.js';

export class MediaPanel extends BasePanel {
  constructor() {
    // Asumimos que el HTML tiene un contenedor con id="media-panel"
    super('mediaPanel'); 
    
    // Selectores específicos del panel
    this.elements = {
      dropZone: $('#dropZone'),
      fileInput: $('#fileInput'),
      playBtn: $('#playBtn'),
      restartBtn: $('#restartBtn'),
      mediaType: $('#mediaType'),
      mediaDimensions: $('#mediaDimensions'),
    };
  }

  bindEvents() {
    // Drag & Drop
    document.body.addEventListener("dragover", (e) => {
      e.preventDefault();
      this.elements.dropZone.classList.add("border-cyan-400");
    });
    document.body.addEventListener("dragleave", () => {
      this.elements.dropZone.classList.remove("border-cyan-400");
    });
    document.body.addEventListener("drop", (e) => {
      e.preventDefault();
      this.elements.dropZone.classList.remove("border-cyan-400");
      if (e.dataTransfer.files.length > 0) {
        this.eventBus.publish('media:load-file', e.dataTransfer.files[0]);
      }
    });

    this.elements.dropZone.addEventListener("click", () => this.elements.fileInput.click());
    this.elements.fileInput.addEventListener("change", (e) => {
      if (e.target.files.length > 0) {
        this.eventBus.publish('media:load-file', e.target.files[0]);
      }
    });
    
    // Controles de reproducción
    this.elements.playBtn.addEventListener('click', () => {
        this.eventBus.publish('playback:toggle');
    });

    this.elements.restartBtn.addEventListener('click', () => {
        this.eventBus.publish('playback:restart');
    });
  }

  render(state) {
    const { media, playback } = state;

    if (media.isLoaded) {
      this.elements.mediaType.textContent = media.type.toUpperCase();
      this.elements.mediaType.className = media.type === 'video' 
        ? 'bg-blue-600 px-2 py-1 rounded text-xs' 
        : 'bg-purple-600 px-2 py-1 rounded text-xs';
      
      const durationText = media.type === 'video' ? ` - ${formatTime(media.duration)}` : '';
      this.elements.mediaDimensions.textContent = `${media.width}x${media.height}${durationText}`;
    } else {
      this.elements.mediaType.textContent = 'No cargado';
      this.elements.mediaType.className = 'bg-slate-700 px-2 py-1 rounded text-xs';
      this.elements.mediaDimensions.textContent = '';
    }

    if (media.type === 'video') {
        this.elements.playBtn.disabled = false;
        this.elements.playBtn.textContent = playback.isPlaying ? 'Pause' : 'Play';
    } else {
        this.elements.playBtn.disabled = true;
        this.elements.playBtn.textContent = 'Play';
    }
  }
}
