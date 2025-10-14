/**
 * @file AlgorithmPanel.js
 * @description Componente de UI para seleccionar el algoritmo de dithering y sus parámetros.
 */
import { BasePanel } from './BasePanel.js';
import { $ } from '../utils/DOMHelpers.js';
import { ALGORITHMS } from '../../constants/algorithms.js';

export class AlgorithmPanel extends BasePanel {
  constructor() {
    super('algorithmPanel'); // Contenedor con id="algorithmPanel"
    this.elements = {
      select: $('#effectSelect'),
      infoText: $('#infoText'),
      ditherControls: $('#ditherControls'),
      errorDiffusionControls: $('#errorDiffusionControls'),
      orderedDitherControls: $('#orderedDitherControls'),
      ditherScaleSlider: $('#ditherScale'),
      ditherScaleVal: $('#ditherScaleVal'),
      serpentineToggle: $('#serpentineToggle'),
      diffusionStrengthSlider: $('#diffusionStrengthSlider'),
      diffusionStrengthVal: $('#diffusionStrengthVal'),
      patternStrengthSlider: $('#patternStrengthSlider'),
      patternStrengthVal: $('#patternStrengthVal'),
    };
  }

  bindEvents() {
    this.elements.select.addEventListener('change', (e) => {
      this.store.setKey('config.effect', e.target.value);
    });

    this.elements.ditherScaleSlider.addEventListener('input', (e) => {
      const value = parseInt(e.target.value, 10);
      this.elements.ditherScaleVal.textContent = value;
      this.store.setKey('config.ditherScale', value);
    });

    this.elements.serpentineToggle.addEventListener('change', (e) => {
      this.store.setKey('config.serpentineScan', e.target.checked);
    });

    this.elements.diffusionStrengthSlider.addEventListener('input', (e) => {
      const value = parseInt(e.target.value, 10);
      this.elements.diffusionStrengthVal.textContent = value;
      this.store.setKey('config.diffusionStrength', value / 100);
    });

    this.elements.patternStrengthSlider.addEventListener('input', (e) => {
      const value = parseInt(e.target.value, 10);
      this.elements.patternStrengthVal.textContent = value;
      this.store.setKey('config.patternStrength', value / 100);
    });
  }

  render(state) {
    const { effect, ditherScale, serpentineScan, diffusionStrength, patternStrength } = state.config;

    // Sincronizar select
    if (this.elements.select.value !== effect) {
      this.elements.select.value = effect;
    }
    
    // Sincronizar información y visibilidad de paneles
    this.elements.infoText.textContent = ALGORITHMS[effect]?.description || 'Selecciona un algoritmo.';
    
    const isDithering = effect !== 'none' && effect !== 'posterize';
    this.elements.ditherControls.classList.toggle('hidden', !isDithering);

    if (isDithering) {
        // En DitherLab v6 original, se basaba en KERNELS. Ahora podemos usar categorías.
        const algorithmInfo = ALGORITHMS[effect];
        const isErrorDiffusion = ['floyd-steinberg', 'atkinson', 'stucki', 'jarvis-judice-ninke', 'sierra', 'sierra-lite', 'burkes', 'variable-error'].includes(effect);
        const isOrdered = ['bayer', 'blue-noise'].includes(effect);

        this.elements.errorDiffusionControls.classList.toggle('hidden', !isErrorDiffusion);
        this.elements.orderedDitherControls.classList.toggle('hidden', !isOrdered);
    }
    
    // Sincronizar sliders y toggles
    this.elements.ditherScaleSlider.value = ditherScale;
    this.elements.ditherScaleVal.textContent = ditherScale;
    this.elements.serpentineToggle.checked = serpentineScan;
    this.elements.diffusionStrengthSlider.value = diffusionStrength * 100;
    this.elements.diffusionStrengthVal.textContent = diffusionStrength * 100;
    this.elements.patternStrengthSlider.value = patternStrength * 100;
    this.elements.patternStrengthVal.textContent = patternStrength * 100;
  }
}
