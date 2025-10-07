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
import { getState, updateConfig, updateCurves } from '../app/state.js';
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
 * ✅ MEJORADO: Guarda la configuración actual como un nuevo preset.
 */
function savePreset() {
    const name = elements.presetNameInput.value.trim();
    if (!name) {
        showToast('Por favor, introduce un nombre para el preset.');
        return;
    }

    const currentState = getState();
    const presets = JSON.parse(localStorage.getItem(PRESETS_STORAGE_KEY) || '{}');

    // ✅ CORREGIDO: Guardamos tanto config como curves
    presets[name] = {
        config: {
            effect: currentState.config.effect,
            isMonochrome: currentState.config.isMonochrome,
            useOriginalColor: currentState.config.useOriginalColor,
            colorCount: currentState.config.colorCount,
            colors: [...currentState.config.colors], // Copia del array
            ditherScale: currentState.config.ditherScale,
            serpentineScan: currentState.config.serpentineScan,
            diffusionStrength: currentState.config.diffusionStrength,
            patternStrength: currentState.config.patternStrength,
            brightness: currentState.config.brightness,
            contrast: currentState.config.contrast,
            saturation: currentState.config.saturation
        },
        // ✅ Guardamos las curvas (deep copy)
        curves: {
            rgb: JSON.parse(JSON.stringify(currentState.curves.rgb)),
            r: JSON.parse(JSON.stringify(currentState.curves.r)),
            g: JSON.parse(JSON.stringify(currentState.curves.g)),
            b: JSON.parse(JSON.stringify(currentState.curves.b))
        },
        // ✅ Metadatos útiles
        timestamp: new Date().toISOString(),
        version: '7.0'
    };

    try {
        localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
        elements.presetNameInput.value = '';
        updatePresetList();
        showToast(`Preset "${name}" guardado correctamente.`);
    } catch (error) {
        console.error('Error al guardar preset:', error);
        showToast('Error: El preset es demasiado grande para guardar.', 5000);
    }
}

/**
 * ✅ MEJORADO: Carga un preset seleccionado del menú desplegable.
 */
function loadPreset() {
    const name = elements.presetSelect.value;
    if (!name) return;

    const presets = JSON.parse(localStorage.getItem(PRESETS_STORAGE_KEY) || '{}');
    if (!presets[name]) {
        showToast(`El preset "${name}" no fue encontrado.`, 3000);
        return;
    }

    const presetData = presets[name];

    // ✅ CORREGIDO: Actualizamos config y curves por separado
    if (presetData.config) {
        updateConfig(presetData.config);
    }

    if (presetData.curves) {
        updateCurves(presetData.curves);
        // ✅ Emitir evento para que el editor de curvas actualice su UI
        events.emit('presets:loaded', presetData);
    }

    showToast(`Preset "${name}" cargado correctamente.`);
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
    
    if (!presets[name]) {
        showToast(`El preset "${name}" no existe.`, 3000);
        return;
    }

    // Confirmación antes de eliminar
    if (!confirm(`¿Estás seguro de eliminar el preset "${name}"?`)) {
        return;
    }

    delete presets[name];
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
    updatePresetList();
    showToast(`Preset "${name}" eliminado.`);
}

/**
 * ✅ AÑADIDO: Exportar preset como archivo JSON
 */
function exportPreset() {
    const name = elements.presetSelect.value;
    if (!name) {
        showToast('Selecciona un preset para exportar.');
        return;
    }

    const presets = JSON.parse(localStorage.getItem(PRESETS_STORAGE_KEY) || '{}');
    if (!presets[name]) {
        showToast(`El preset "${name}" no fue encontrado.`, 3000);
        return;
    }

    const presetData = presets[name];
    const dataStr = JSON.stringify(presetData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `ditherlab_preset_${name.replace(/\s+/g, '_')}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
    showToast(`Preset "${name}" exportado.`);
}

/**
 * ✅ AÑADIDO: Importar preset desde archivo JSON
 */
function importPreset(file) {
    const reader = new FileReader();
    
    reader.onload = (e) => {
        try {
            const presetData = JSON.parse(e.target.result);
            
            // Validar estructura del preset
            if (!presetData.config || !presetData.curves) {
                showToast('Archivo de preset inválido.', 3000);
                return;
            }

            const presets = JSON.parse(localStorage.getItem(PRESETS_STORAGE_KEY) || '{}');
            
            // Generar nombre único si ya existe
            let presetName = 'Importado';
            let counter = 1;
            while (presets[presetName]) {
                presetName = `Importado_${counter}`;
                counter++;
            }

            presets[presetName] = presetData;
            localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
            updatePresetList();
            showToast(`Preset importado como "${presetName}".`);
            
        } catch (error) {
            console.error('Error al importar preset:', error);
            showToast('Error al leer el archivo de preset.', 3000);
        }
    };
    
    reader.onerror = () => {
        showToast('Error al leer el archivo.', 3000);
    };
    
    reader.readAsText(file);
}

/**
 * Inicializa el módulo de presets.
 */
export function initializePresets() {
    queryElements();

    elements.savePresetBtn.addEventListener('click', savePreset);
    elements.presetSelect.addEventListener('change', loadPreset);
    elements.deletePresetBtn.addEventListener('click', deletePreset);

    // ✅ MEJORADO: Soporte para tecla Enter al escribir nombre
    elements.presetNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            savePreset();
        }
    });

    // Llenar la lista de presets al iniciar la app
    updatePresetList();

    console.log('Presets Module inicializado.');
    
    // ✅ Log de debug para verificar presets existentes
    const presets = JSON.parse(localStorage.getItem(PRESETS_STORAGE_KEY) || '{}');
    console.log(`Presets cargados: ${Object.keys(presets).length}`);
}
