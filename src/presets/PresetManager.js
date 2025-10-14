/**
 * @file PresetManager.js
 * @description Gestiona la lógica de negocio para guardar, cargar y eliminar presets.
 */
import { store } from '../core/Store.js';
import { eventBus } from '../core/EventBus.js';
import { PresetStorage } from './PresetStorage.js';
import { configValidator } from '../core/ConfigValidator.js';
import { APP_DEFAULTS } from '../constants/defaults.js';

export class PresetManager {
  constructor() {
    this.storage = new PresetStorage();
    this.presets = this.storage.loadAll();

    eventBus.subscribe('presets:save', (name) => this.save(name));
    eventBus.subscribe('presets:load', (name) => this.load(name));
    eventBus.subscribe('presets:delete', (name) => this.delete(name));
  }
  
  init() {
      // Publicar la lista inicial de presets para que la UI se actualice
      this.publishList();
  }

  save(name) {
    const currentState = store.getState();
    const presetData = {
      config: currentState.config
      // En el futuro, podríamos guardar también el estado de la timeline, etc.
    };
    
    this.presets[name] = presetData;
    this.storage.saveAll(this.presets);
    this.publishList();
    eventBus.publish('ui:showToast', { message: `Preset "${name}" guardado.` });
  }

  load(name) {
    const presetData = this.presets[name];
    if (!presetData) {
      eventBus.publish('ui:showToast', { message: `Preset "${name}" no encontrado.` });
      return;
    }
    
    // Validar y sanear la configuración cargada antes de aplicarla
    const { sanitizedConfig, errors } = configValidator.validate(presetData.config, APP_DEFAULTS.config);
    
    if (errors.length > 0) {
        console.warn("Se encontraron errores en el preset, se usarán valores por defecto:", errors);
    }
    
    store.setState({ config: sanitizedConfig });
    eventBus.publish('ui:showToast', { message: `Preset "${name}" cargado.` });
  }

  delete(name) {
    if (this.presets[name]) {
      delete this.presets[name];
      this.storage.saveAll(this.presets);
      this.publishList();
      eventBus.publish('ui:showToast', { message: `Preset "${name}" eliminado.` });
    }
  }

  /**
   * Notifica a la UI sobre la lista actualizada de presets.
   */
  publishList() {
    eventBus.publish('presets:list-updated', this.presets);
  }
}
