/**
 * @file PresetStorage.js
 * @description Abstracción para interactuar con el almacenamiento del navegador (localStorage).
 */

const STORAGE_KEY = 'ditherlab_v7_presets';

export class PresetStorage {
  /**
   * Guarda todos los presets en localStorage.
   * @param {object} presets - El objeto que contiene todos los presets.
   */
  saveAll(presets) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
    } catch (error) {
      console.error("Error al guardar los presets:", error);
    }
  }

  /**
   * Carga todos los presets desde localStorage.
   * @returns {object} El objeto de presets, o un objeto vacío si no hay nada guardado.
   */
  loadAll() {
    try {
      const presetsJSON = localStorage.getItem(STORAGE_KEY);
      return presetsJSON ? JSON.parse(presetsJSON) : {};
    } catch (error) {
      console.error("Error al cargar los presets:", error);
      return {};
    }
  }
}
