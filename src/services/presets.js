/**
 * presets.js
 * Servicio para gestionar los presets del usuario.
 * Encapsula toda la lógica de interacción con localStorage.
 */

const PRESETS_STORAGE_KEY = 'ditherlab_v7_presets';

/**
 * Obtiene todos los presets guardados.
 * @returns {object} Un objeto con todos los presets.
 */
function getPresets() {
  try {
    const presets = localStorage.getItem(PRESETS_STORAGE_KEY);
    return presets ? JSON.parse(presets) : {};
  } catch (error) {
    console.error("Error al cargar presets:", error);
    return {};
  }
}

/**
 * Guarda un nuevo preset o actualiza uno existente.
 * @param {string} name - El nombre del preset.
 * @param {object} config - El objeto de configuración a guardar.
 */
function savePreset(name, config) {
  if (!name || !config) return;
  const presets = getPresets();
  presets[name] = config;
  try {
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
  } catch (error) {
    console.error("Error al guardar preset:", error);
  }
}

/**
 * Elimina un preset por su nombre.
 * @param {string} name - El nombre del preset a eliminar.
 */
function deletePreset(name) {
  if (!name) return;
  const presets = getPresets();
  delete presets[name];
  try {
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
  } catch (error) {
    console.error("Error al eliminar preset:", error);
  }
}

/**
 * Carga la configuración de un preset específico.
 * @param {string} name - El nombre del preset a cargar.
 * @returns {object|null} El objeto de configuración o null si no se encuentra.
 */
function loadPreset(name) {
  const presets = getPresets();
  return presets[name] || null;
}

export const presetsService = {
  getAll: getPresets,
  save: savePreset,
  delete: deletePreset,
  load: loadPreset
};