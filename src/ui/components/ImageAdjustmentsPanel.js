/**
 * @file ImageAdjustmentsPanel.js
 * @description Componente de UI para los ajustes de imagen (brillo, contraste, saturación) y el editor de curvas.
 */
import { BasePanel } from './BasePanel.js';
import { $ } from '../utils/DOMHelpers.js';
import { throttle } from '../../utils/throttle.js';

export class ImageAdjustmentsPanel extends BasePanel {
  constructor() {
    super('imageAdjustmentsPanel'); // Contenedor con id="imageAdjustmentsPanel"
    this.elements = {
      // Sliders básicos
      brightnessSlider: $('#brightnessSlider'),
      brightnessVal: $('#brightnessVal'),
      contrastSlider: $('#contrastSlider'),
      contrastVal: $('#contrastVal'),
      saturationSlider: $('#saturationSlider'),
      saturationVal: $('#saturationVal'),
      // Contenedores y botones
      basicControls: $('#basicImageControls'),
      curvesEditor: $('#curvesEditor'),
      toggleCurvesBtn: $('#toggleCurvesBtn'),
      resetImageAdjustmentsBtn: $('#resetImageAdjustmentsBtn'),
    };
    this.isCurvesEditorVisible = false;
  }

  bindEvents() {
    // Throttled handlers para un rendimiento fluido de los sliders
    const brightnessHandler = throttle((value) => this.store.setKey('config.brightness', value), 16);
    const contrastHandler = throttle((value) => this.store.setKey('config.contrast', value / 100), 16);
    const saturationHandler = throttle((value) => this.store.setKey('config.saturation', value / 100), 16);

    this.elements.brightnessSlider.addEventListener('input', (e) => {
      brightnessHandler(parseInt(e.target.value, 10));
    });

    this.elements.contrastSlider.addEventListener('input', (e) => {
      contrastHandler(parseInt(e.target.value, 10));
    });

    this.elements.saturationSlider.addEventListener('input', (e) => {
      saturationHandler(parseInt(e.target.value, 10));
    });

    // Botón para alternar vistas
    this.elements.toggleCurvesBtn.addEventListener('click', () => {
      this.isCurvesEditorVisible = !this.isCurvesEditorVisible;
      this.toggleViews();
      if (this.isCurvesEditorVisible) {
        // Notificar al editor de curvas que necesita renderizarse
        this.eventBus.publish('curves:request-render');
      }
    });

    // Botón de reseteo
    this.elements.resetImageAdjustmentsBtn.addEventListener('click', () => {
      this.store.setState({
        config: {
          brightness: 0,
          contrast: 1.0,
          saturation: 1.0,
          // Notificar al editor de curvas que debe resetearse
          curves: null, // Esto disparará el reseteo en el componente CurvesEditor
        }
      });
      this.eventBus.publish('curves:reset-all');
    });
  }

  toggleViews() {
    this.elements.basicControls.classList.toggle('hidden', this.isCurvesEditorVisible);
    this.elements.curvesEditor.classList.toggle('hidden', !this.isCurvesEditorVisible);
    this.elements.toggleCurvesBtn.textContent = this.isCurvesEditorVisible ? '📏 Básicos' : '📈 Curvas';
  }

  render(state) {
    const { brightness, contrast, saturation } = state.config;

    // Sincronizar UI con el estado
    this.elements.brightnessSlider.value = brightness;
    this.elements.brightnessVal.textContent = brightness;

    const contrastPercent = Math.round(contrast * 100);
    this.elements.contrastSlider.value = contrastPercent;
    this.elements.contrastVal.textContent = `${contrastPercent}%`;

    const saturationPercent = Math.round(saturation * 100);
    this.elements.saturationSlider.value = saturationPercent;
    this.elements.saturationVal.textContent = `${saturationPercent}%`;
  }
}
