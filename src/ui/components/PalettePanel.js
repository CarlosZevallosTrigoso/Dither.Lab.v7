/**
 * @file PalettePanel.js
 * @description Componente de UI para la gestión de la paleta de colores.
 */
import { BasePanel } from './BasePanel.js';
import { $ } from '../utils/DOMHelpers.js';
import { debounce } from '../../utils/debounce.js';

export class PalettePanel extends BasePanel {
  constructor() {
    super('palettePanel'); // Contenedor con id="palettePanel"
    this.elements = {
      originalColorToggle: $('#originalColorToggle'),
      monochromeToggle: $('#monochromeToggle'),
      colorCountSlider: $('#colorCountSlider'),
      colorCountVal: $('#colorCountVal'),
      colorPickerContainer: $('#colorPickerContainer'),
    };
    this.lastColorCount = 0; // Caché para evitar recrear el DOM innecesariamente
  }

  bindEvents() {
    this.elements.originalColorToggle.addEventListener('change', (e) => {
      this.store.setKey('config.useOriginalColor', e.target.checked);
    });

    this.elements.monochromeToggle.addEventListener('change', (e) => {
      this.store.setKey('config.isMonochrome', e.target.checked);
      // Forzar la regeneración de la paleta al cambiar a/desde monocromo
      this.eventBus.publish('palette:request-regeneration');
    });

    const debouncedColorCountChange = debounce((value) => {
        this.store.setKey('config.colorCount', value);
        // Notificar que se necesita una nueva paleta con la nueva cantidad de colores
        this.eventBus.publish('palette:request-regeneration');
    }, 250);

    this.elements.colorCountSlider.addEventListener('input', (e) => {
      const value = parseInt(e.target.value, 10);
      this.elements.colorCountVal.textContent = value;
      debouncedColorCountChange(value);
    });
  }

  render(state) {
    const { useOriginalColor, isMonochrome, colorCount, colors } = state.config;

    // Sincronizar toggles y sliders
    this.elements.originalColorToggle.checked = useOriginalColor;
    this.elements.monochromeToggle.checked = isMonochrome;
    this.elements.monochromeToggle.disabled = useOriginalColor;
    this.elements.colorCountSlider.value = colorCount;
    this.elements.colorCountSlider.disabled = useOriginalColor || isMonochrome;
    this.elements.colorCountVal.textContent = colorCount;

    // Sincronizar selectores de color (la parte más compleja)
    this.updateColorPickers(colorCount, colors, useOriginalColor || isMonochrome);
  }
  
  updateColorPickers(colorCount, colors, isDisabled) {
    // Optimización: Solo reconstruir el DOM si el número de colores cambia
    if (colorCount !== this.lastColorCount) {
      this.elements.colorPickerContainer.innerHTML = ''; // Limpiar
      for (let i = 0; i < colorCount; i++) {
        const color = colors[i] || '#000000';
        const label = this.createColorPicker(i, color, isDisabled);
        this.elements.colorPickerContainer.appendChild(label);
      }
      this.lastColorCount = colorCount;
    } else {
      // Si no, solo actualizar los valores y el estado de deshabilitado
      const inputs = this.elements.colorPickerContainer.querySelectorAll('input[type="color"]');
      inputs.forEach((input, i) => {
        if (colors && colors[i]) {
            input.value = colors[i];
        }
        input.disabled = isDisabled;
      });
    }
  }

  createColorPicker(index, hexColor, isDisabled) {
    const label = document.createElement('label');
    label.className = 'block';
    label.innerHTML = `
      <span class="text-xs text-gray-400">Color ${index + 1}</span>
      <input type="color" value="${hexColor}" 
             data-index="${index}"
             class="w-full h-10 p-0 border-none rounded cursor-pointer"/>
    `;
    const colorInput = label.querySelector('input');
    colorInput.disabled = isDisabled;

    colorInput.addEventListener('input', (e) => {
      const newColors = [...this.store.getState().config.colors];
      newColors[index] = e.target.value;
      this.store.setKey('config.colors', newColors);
    });

    return label;
  }
}
