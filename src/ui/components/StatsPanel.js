/**
 * @file StatsPanel.js
 * @description Componente de UI para mostrar estadísticas en tiempo real.
 */
import { BasePanel } from './BasePanel.js';
import { $ } from '../utils/DOMHelpers.js';
import { ALGORITHMS } from '../../constants/algorithms.js';
import { formatTime } from '../../utils/formatters.js';

export class StatsPanel extends BasePanel {
  constructor() {
    super('statsPanel');
    this.elements = {
      fps: $('#fps'),
      frameTime: $('#frameTime'),
      effectName: $('#effectName'),
      timeDisplay: $('#timeDisplay'),
      speedDisplay: $('#speedDisplay'),
      speedDisplayValue: $('#speedDisplay span'),
    };
  }
  
  bindEvents() {
    // Este panel es de solo lectura, por lo que no emite eventos.
  }

  render(state) {
    const { media, playback, config } = state;

    // Actualizar FPS y Frame Time (estos datos vendrán de un evento del CanvasManager)
    // Por ahora, dejamos placeholders.

    this.elements.effectName.textContent = ALGORITHMS[config.effect]?.name || "Desconocido";

    if (media.isLoaded) {
      if (media.type === 'video') {
        this.elements.timeDisplay.textContent = `${formatTime(playback.currentTime)} / ${formatTime(media.duration)}`;
        if (playback.speed !== 1) {
            this.elements.speedDisplay.classList.remove('hidden');
            this.elements.speedDisplayValue.textContent = `${playback.speed.toFixed(2)}x`;
        } else {
            this.elements.speedDisplay.classList.add('hidden');
        }
      } else {
        this.elements.timeDisplay.textContent = 'Imagen Estática';
        this.elements.speedDisplay.classList.add('hidden');
      }
    } else {
      this.elements.timeDisplay.textContent = '00:00 / 00:00';
      this.elements.speedDisplay.classList.add('hidden');
    }
  }

  updateFrameStats({ fps, frameTime }) {
      this.elements.fps.textContent = isNaN(fps) || fps === 0 ? '--' : Math.round(fps);
      this.elements.frameTime.textContent = isNaN(frameTime) || frameTime === 0 ? '--' : frameTime.toFixed(1);
  }
}
