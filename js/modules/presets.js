/**
 * ============================================================================
 * DitherLab v7 - Módulo de Presets
 * ============================================================================
 * - Gestiona la lógica para guardar, cargar, eliminar y listar configuraciones
 * personalizadas (presets) usando localStorage.
 * - Interactúa con la UI para obtener nombres de presets y actualizar la lista.
 * - Emite eventos para notificar a la aplicación cuándo se debe aplicar un preset.
 * ============================================================================
 */
import { events } from '../app/events.js';
import { getState, updateConfig } from '../app/state.js';
import { showToast } from '../utils/helpers.js';

const PRESETS_STORAGE_KEY = 'ditherlab_v7_presets';
let elements = {};

function queryElements() {
    elements.presetNameInput = document.getElementById('presetNameInput');
    elements.savePresetBtn = document.getElementById('savePresetBtn');
    elements.presetSelect = document.getElementById('presetSelect');
    elements.deletePresetBtn = document.getElementById('deletePresetBtn');
}

/**
 * Carga los presets desde localStorage y actualiza el menú desplegable.
 */
function updatePresetList() {
    const presets = JSON.parse(localStorage.getItem(PRESETS_STORAGE_KEY) || '{}');
    elements.presetSelect.innerHTML = '<option value="">Cargar Preset...</option>';
    for (const name in presets) {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        elements.presetSelect.appendChild(option);
    }
}

/**
 * Guarda la configuración actual como un nuevo preset.
 */
function savePreset() {
    const name = elements.presetNameInput.value.trim();
    if (!name) {
        showToast('Por favor, introduce un nombre para el preset.');
        return;
    }

    const currentState = getState();
    const presets = JSON.parse(localStorage.getItem(PRESETS_STORAGE_KEY) || '{}');

    // Guardamos la configuración y las curvas
    presets[name] = {
        config: currentState.config,
        curves: currentState.curves // Suponemos que el estado tendrá las curvas
    };

    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
    elements.presetNameInput.value = '';
    updatePresetList();
    showToast(`Preset "${name}" guardado.`);
}

/**
 * Carga un preset seleccionado del menú desplegable.
 */
function loadPreset() {
    const name = elements.presetSelect.value;
    if (!name) return;

    const presets = JSON.parse(localStorage.getItem(PRESETS_STORAGE_KEY) || '{}');
    if (!presets[name]) {
        showToast(`El preset "${name}" no fue encontrado.`, 3000, 'error');
        return;
    }

    const presetData = presets[name];

    // Actualizamos la configuración principal
    updateConfig(presetData.config);

    // Emitimos un evento para que módulos específicos (como curvesEditor)
    // puedan manejar datos adicionales del preset.
    events.emit('presets:loaded', presetData);

    showToast(`Preset "${name}" cargado.`);
}

/**
 * Elimina el preset seleccionado.
 */
function deletePreset() {
    const name = elements.presetSelect.value;
    if (!name) {
        showToast('Selecciona un preset para eliminar.');
        return;
    }

    const presets = JSON.parse(localStorage.getItem(PRESETS_STORAGE_KEY) || '{}');
    delete presets[name];
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
    updatePresetList();
    showToast(`Preset "${name}" eliminado.`);
}

/**
 * Inicializa el módulo de presets.
 */
export function initializePresets() {
    queryElements();

    elements.savePresetBtn.addEventListener('click', savePreset);
    elements.presetSelect.addEventListener('change', loadPreset);
    elements.deletePresetBtn.addEventListener('click', deletePreset);

    // Llenar la lista de presets al iniciar la app
    updatePresetList();

    console.log('Presets Module inicializado.');
}