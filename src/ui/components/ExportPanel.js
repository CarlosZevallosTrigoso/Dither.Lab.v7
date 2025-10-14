/**
 * @file ExportPanel.js
 * @description Componente de UI con todas las opciones para exportar el trabajo final.
 */
import { BasePanel } from './BasePanel.js';
import { $ } from '../utils/DOMHelpers.js';

export class ExportPanel extends BasePanel {
  constructor() {
    super('exportPanel');
    this.elements = {
      // Indicador REC
      recIndicator: $('#recIndicator'),
      // WebM
      recBtn: $('#recBtn'),
      stopBtn: $('#stopBtn'),
      webmUseMarkersToggle: $('#webmUseMarkersToggle'),
      // GIF
      gifExportPanel: $('#gifExportPanel'),
      gifFpsSlider: $('#gifFpsSlider'),
      gifFpsVal: $('#gifFpsVal'),
      gifQualitySlider: $('#gifQualitySlider'),
      gifQualityVal: $('#gifQualityVal'),
      gifUseMarkersToggle: $('#gifUseMarkersToggle'),
      exportGifBtn: $('#exportGifBtn'),
      gifProgress: $('#gifProgress'),
      gifProgressText: $('#gifProgressText'),
      gifProgressBar: $('#gifProgressBar'),
      // Sprite Sheet
      spriteSheetPanel: $('#spriteSheetPanel'),
      spriteColsSlider: $('#spriteColsSlider'),
      spriteCols: $('#spriteCols'),
      spriteFrameCountSlider: $('#spriteFrameCountSlider'),
      spriteFrameCount: $('#spriteFrameCount'),
      exportSpriteBtn: $('#exportSpriteBtn'),
      // PNG
      downloadImageBtn: $('#downloadImageBtn'),
      exportSequenceBtn: $('#exportSequenceBtn'),
      // Status
      status: $('#status'),
    };
  }

  bindEvents() {
    // --- Exportación WebM ---
    this.elements.recBtn.addEventListener('click', () => {
      const options = { useMarkers: this.elements.webmUseMarkersToggle.checked };
      this.eventBus.publish('export:start', { format: 'webm', options });
    });
    this.elements.stopBtn.addEventListener('click', () => this.eventBus.publish('export:stop', { format: 'webm' }));

    // --- Exportación GIF ---
    this.elements.exportGifBtn.addEventListener('click', () => {
      const options = {
        fps: parseInt(this.elements.gifFpsSlider.value, 10),
        quality: parseInt(this.elements.gifQualitySlider.value, 10),
        useMarkers: this.elements.gifUseMarkersToggle.checked,
      };
      this.eventBus.publish('export:start', { format: 'gif', options });
    });
    this.elements.gifFpsSlider.addEventListener('input', (e) => this.elements.gifFpsVal.textContent = e.target.value);
    this.elements.gifQualitySlider.addEventListener('input', (e) => this.elements.gifQualityVal.textContent = e.target.value);

    // --- Exportación Sprite Sheet ---
    this.elements.exportSpriteBtn.addEventListener('click', () => {
      const options = {
        cols: parseInt(this.elements.spriteColsSlider.value, 10),
        frameCount: parseInt(this.elements.spriteFrameCountSlider.value, 10),
      };
      this.eventBus.publish('export:start', { format: 'sprite', options });
    });
    this.elements.spriteColsSlider.addEventListener('input', (e) => this.elements.spriteCols.textContent = e.target.value);
    this.elements.spriteFrameCountSlider.addEventListener('input', (e) => this.elements.spriteFrameCount.textContent = e.target.value);

    // --- Exportación PNG ---
    this.elements.downloadImageBtn.addEventListener('click', () => this.eventBus.publish('export:start', { format: 'png' }));
    this.elements.exportSequenceBtn.addEventListener('click', () => this.eventBus.publish('export:start', { format: 'sequence' }));
    
    // Escuchar eventos de progreso
    this.eventBus.subscribe('export:progress', this.updateProgress.bind(this));
  }
  
  updateProgress({ format, progress, message }) {
    if (format === 'gif') {
      const percent = Math.round(progress * 100);
      this.elements.gifProgress.classList.remove('hidden');
      this.elements.gifProgressText.textContent = `${percent}%`;
      this.elements.gifProgressBar.style.width = `${percent}%`;
    }
    if(message) {
      this.elements.status.textContent = message;
    }
  }

  render(state) {
    const { media, playback } = state;
    const isVideo = media.type === 'video';

    // Controles de grabación
    this.elements.recBtn.disabled = !isVideo;
    this.elements.stopBtn.classList.toggle('hidden', !playback.isRecording);
    this.elements.recIndicator.classList.toggle('hidden', !playback.isRecording);

    // Paneles de exportación de video
    this.elements.gifExportPanel.classList.toggle('hidden', !isVideo);
    this.elements.spriteSheetPanel.classList.toggle('hidden', !isVideo);
    this.elements.exportSequenceBtn.classList.toggle('hidden', !isVideo);
  }
}
