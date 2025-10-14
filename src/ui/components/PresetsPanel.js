/**
 * @file PresetsPanel.js
 * @description Componente de UI para la gestión de presets de configuración.
 */
import { BasePanel } from './BasePanel.js';
import { $ } from '../utils/DOMHelpers.js';

export class PresetsPanel extends BasePanel {
  constructor() {
    super('presetsPanel');
    this.elements = {
      nameInput: $('#presetNameInput'),
      saveBtn: $('#savePresetBtn'),
      loadSelect: $('#presetSelect'),
      deleteBtn: $('#deletePresetBtn'),
    };
  }

  bindEvents() {
    this.elements.saveBtn.addEventListener('click', () => {
      const name = this.elements.nameInput.value.trim();
      if (name) {
        this.eventBus.publish('presets:save', name);
        this.elements.nameInput.value = ''; // Limpiar input después de guardar
      } else {
        this.eventBus.publish('ui:showToast', { message: 'Por favor, introduce un nombre para el preset.' });
      }
    });

    this.elements.loadSelect.addEventListener('change', (e) => {
      const name = e.target.value;
      if (name) {
        this.eventBus.publish('presets:load', name);
      }
    });

    this.elements.deleteBtn.addEventListener('click', () => {
      const name = this.elements.loadSelect.value;
      if (name) {
        this.eventBus.publish('presets:delete', name);
      }
    });
    
    // Escuchar la lista actualizada de presets desde el PresetManager
    this.eventBus.subscribe('presets:list-updated', (presets) => this.updatePresetList(presets));
  }

  /**
   * Actualiza el <select> con la lista de presets disponibles.
   * @param {object} presets - El objeto con los presets.
   */
  updatePresetList(presets) {
    const currentSelection = this.elements.loadSelect.value;
    this.elements.loadSelect.innerHTML = '<option value="">Cargar Preset...</option>';
    
    for (const name in presets) {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      this.elements.loadSelect.appendChild(option);
    }

    // Restaurar la selección si todavía existe
    if (presets[currentSelection]) {
        this.elements.loadSelect.value = currentSelection;
    }
  }

  render(state) {
    // Este panel no necesita sincronizarse continuamente con el estado global.
    // Su estado se gestiona a través de la interacción del usuario y el evento 'presets:list-updated'.
  }
}
