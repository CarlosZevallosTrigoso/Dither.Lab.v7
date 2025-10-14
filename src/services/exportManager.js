// src/services/exportManager.js

import { showToast } from '../utils/helpers.js';

/**
 * ExportManager - Gestiona la exportación de los resultados a diferentes formatos.
 */
export default class ExportManager {
  constructor(appState, ditherProcessor) {
    this.appState = appState;
    this.p5 = ditherProcessor.p5;
    this.ditherProcessor = ditherProcessor;
    this.recorder = null;
    this.chunks = [];

    this.bindEvents();
  }

  bindEvents() {
    document.getElementById('downloadImageBtn').addEventListener('click', () => this.exportPNG());
    document.getElementById('exportGifBtn').addEventListener('click', () => this.exportGIF());
    document.getElementById('recBtn').addEventListener('click', () => this.startRecordingWebM());
    document.getElementById('stopBtn').addEventListener('click', () => this.stopRecordingWebM());
    // Aquí se vincularían los eventos para sprite sheets y secuencias PNG
  }

  /**
   * Exporta el canvas actual como una imagen PNG.
   */
  exportPNG() {
    if (this.appState.media) {
      const effect = this.appState.config.effect;
      this.p5.saveCanvas(this.p5.canvas, `ditherlab-v7_${effect}_${Date.now()}`, 'png');
      showToast('PNG exportado');
    }
  }

  /**
   * Inicia la grabación de un video en formato WebM.
   */
  startRecordingWebM() {
    if (this.appState.isRecording || !this.appState.media || this.appState.mediaType !== 'video') return;

    this.appState.update({ isRecording: true });
    this.chunks = [];

    // Lógica de grabación (simplificada, podría requerir ajustes)
    const stream = this.p5.canvas.elt.captureStream(30);
    this.recorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: 12000000
    });

    this.recorder.ondataavailable = ev => {
      if (ev.data.size > 0) this.chunks.push(ev.data);
    };

    this.recorder.onstop = () => {
      const blob = new Blob(this.chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ditherlab-v7_${this.appState.config.effect}_${Date.now()}.webm`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('WebM exportado');
    };

    this.recorder.start();
    document.getElementById('recBtn').disabled = true;
    document.getElementById('stopBtn').classList.remove('hidden');
    document.getElementById('recIndicator').classList.remove('hidden');
    showToast('Grabando...');
  }

  /**
   * Detiene la grabación de WebM.
   */
  stopRecordingWebM() {
    if (!this.appState.isRecording || !this.recorder) return;
    
    if (this.recorder.state !== 'inactive') {
        this.recorder.stop();
    }
    this.appState.update({ isRecording: false });
    
    document.getElementById('recBtn').disabled = false;
    document.getElementById('stopBtn').classList.add('hidden');
    document.getElementById('recIndicator').classList.add('hidden');
  }

  /**
   * Exporta la animación como un GIF.
   */
  async exportGIF() {
    if (!this.appState.media || this.appState.mediaType !== 'video') return;
    
    const ui = {
        gifFpsSlider: document.getElementById('gifFpsSlider'),
        gifQualitySlider: document.getElementById('gifQualitySlider'),
        gifUseMarkersToggle: document.getElementById('gifUseMarkersToggle'),
        exportGifBtn: document.getElementById('exportGifBtn'),
        gifProgress: document.getElementById('gifProgress'),
        gifProgressText: document.getElementById('gifProgressText'),
        gifProgressBar: document.getElementById('gifProgressBar'),
    };

    ui.exportGifBtn.disabled = true;
    ui.gifProgress.classList.remove('hidden');

    const fps = parseInt(ui.gifFpsSlider.value);
    const quality = parseInt(ui.gifQualitySlider.value);
    const useMarkers = ui.gifUseMarkersToggle.checked;
    
    const { startTime, endTime } = this.getStartEndTimes(useMarkers);
    const duration = endTime - startTime;
    const frameCount = Math.ceil(duration * fps);
    const frameDelay = 1000 / fps;

    const gif = new GIF({
        workers: 2,
        quality: quality,
        width: this.p5.width,
        height: this.p5.height,
        workerScript: '/js/gif.worker.js' // Ruta actualizada
    });

    gif.on('finished', blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ditherlab-v7_${this.appState.config.effect}_${Date.now()}.gif`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('GIF exportado');
      
      ui.exportGifBtn.disabled = false;
      ui.gifProgress.classList.add('hidden');
    });

    gif.on('progress', prog => {
        const percent = Math.round(prog * 100);
        ui.gifProgressText.textContent = `${percent}%`;
        ui.gifProgressBar.style.width = `${percent}%`;
    });

    // Proceso de renderizado de frames
    const media = this.appState.media;
    const wasPlaying = !media.elt.paused;
    if (wasPlaying) media.pause();

    for (let i = 0; i < frameCount; i++) {
        const time = startTime + (i / fps);
        media.time(time);
        await new Promise(r => setTimeout(r, 50)); // Esperar a que el frame se cargue
        this.ditherProcessor.triggerRedraw();
        await new Promise(r => setTimeout(r, 50)); // Esperar a que p5 dibuje

        gif.addFrame(this.p5.canvas.elt, { copy: true, delay: frameDelay });
    }

    if (wasPlaying) media.loop();
    gif.render();
  }
  
  /**
   * Determina los tiempos de inicio y fin para la exportación.
   * @param {boolean} useMarkers
   * @returns {{startTime: number, endTime: number}}
   */
  getStartEndTimes(useMarkers) {
      let startTime = 0;
      let endTime = this.appState.timeline.duration;

      if (useMarkers) {
          startTime = this.appState.timeline.markerInTime ?? 0;
          endTime = this.appState.timeline.markerOutTime ?? this.appState.timeline.duration;
      }
      return { startTime, endTime };
  }
}
