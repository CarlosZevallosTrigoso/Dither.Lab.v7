// src/services/presetsManager.js

import { showToast } from '../utils/helpers.js';

const PRESETS_KEY = 'ditherlab_v7_presets';

let appState;
let uiManager; // Necesitaremos acceso a la UI para actualizar el select

const elements = {
    savePresetBtn: document.getElementById('savePresetBtn'),
    deletePresetBtn: document.getElementById('deletePresetBtn'),
    presetSelect: document.getElementById('presetSelect'),
    presetNameInput: document.getElementById('presetNameInput'),
};

function savePreset() {
    const name = elements.presetNameInput.value.trim();
    if (!name) {
        showToast('Por favor, introduce un nombre para el preset.');
        return;
    }

    const presets = getPresets();
    // Guardamos solo la configuración, no todo el estado
    presets[name] = { ...appState.config }; 
    
    localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
    elements.presetNameInput.value = '';
    updatePresetList();
    showToast(`Preset "${name}" guardado`);
}

function loadPreset() {
    const name = elements.presetSelect.value;
    if (!name) return;

    const presets = getPresets();
    const presetConfig = presets[name];

    if (presetConfig) {
        // Actualizamos el estado de la aplicación con la configuración del preset
        appState.updateConfig(presetConfig);
        showToast(`Preset "${name}" cargado`);
    }
}

function deletePreset() {
    const name = elements.presetSelect.value;
    if (!name) return;

    const presets = getPresets();
    delete presets[name];
    
    localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
    updatePresetList();
    showToast(`Preset "${name}" eliminado`);
}

function getPresets() {
    return JSON.parse(localStorage.getItem(PRESETS_KEY) || '{}');
}

function updatePresetList() {
    const presets = getPresets();
    elements.presetSelect.innerHTML = '<option value="">Cargar Preset...</option>';
    for (const name in presets) {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        elements.presetSelect.appendChild(option);
    }
}

/**
 * Inicializa el gestor de presets, vinculando eventos y cargando la lista inicial.
 * @param {AppState} state
 * @param {UIManager} ui
 */
export function initializePresets(state, ui) {
    appState = state;
    uiManager = ui;

    elements.savePresetBtn.addEventListener('click', savePreset);
    elements.deletePresetBtn.addEventListener('click', deletePreset);
    elements.presetSelect.addEventListener('change', loadPreset);

    updatePresetList();
}
