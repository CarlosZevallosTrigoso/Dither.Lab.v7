/**
 * ============================================================================
 * DitherLab v7 - Módulo de Interfaz de Usuario (UI)
 * ============================================================================
 * - Gestiona todos los elementos del DOM, sus eventos y actualizaciones visuales.
 * - Escucha las acciones del usuario y emite eventos para notificar a otros módulos.
 * - Se suscribe a los cambios de estado para mantener la UI sincronizada.
 * ============================================================================
 */
import { events } from '../app/events.js';
import { updateConfig } from '../app/state.js';
import { ALGORITHM_INFO, ALGORITHM_NAMES } from '../core/constants.js';
import { throttle, debounce } from '../utils/helpers.js';

// Un objeto para mantener referencias a todos los elementos del DOM.
const elements = {};

/**
 * Selecciona todos los elementos necesarios del DOM y los guarda en el objeto 'elements'.
 */
function queryElements() {
    const ids = [
        'dropZone', 'fileInput', 'playBtn', 'restartBtn', 'effectSelect',
        'monochromeToggle', 'colorCountSlider', 'colorCountVal', 'colorPickerContainer',
        'ditherControls', 'ditherScale', 'ditherScaleVal', 'serpentineToggle',
        'diffusionStrengthSlider', 'diffusionStrengthVal', 'patternStrengthSlider',
        'patternStrengthVal', 'recBtn', 'stopBtn', 'downloadImageBtn', 'status',
        'recIndicator', 'presetNameInput', 'savePresetBtn', 'presetSelect',
        'deletePresetBtn', 'originalColorToggle', 'shortcutsBtn', 'shortcutsModal', 'closeShortcutsBtn',
        'mediaType', 'mediaDimensions', 'timelinePanel', 'infoText',
        'errorDiffusionControls', 'orderedDitherControls',
        'fps', 'frameTime', 'effectName', 'timeDisplay', 'speedDisplay',
        'resetImageAdjustmentsBtn', 'brightnessSlider', 'brightnessVal',
        'contrastSlider', 'contrastVal', 'saturationSlider', 'saturationVal',
        'toggleCurvesBtn', 'basicImageControls', 'curvesEditor',
        'metricsBtn', 'metricsModal', 'closeMetricsBtn'
    ];
    ids.forEach(id => (elements[id] = document.getElementById(id)));
}

/**
 * Vincula los listeners a los eventos de los elementos de la UI.
 */
function bindEventListeners() {
    // Panel de Algoritmo
    elements.effectSelect.addEventListener('change', (e) => {
        updateConfig({ effect: e.target.value });
    });

    // Panel de Ajustes de Imagen
    elements.brightnessSlider.addEventListener('input', throttle((e) => {
        updateConfig({ brightness: parseInt(e.target.value) });
    }, 16));

    elements.contrastSlider.addEventListener('input', throttle((e) => {
        updateConfig({ contrast: parseInt(e.target.value) / 100 });
    }, 16));
    
    elements.saturationSlider.addEventListener('input', throttle((e) => {
        updateConfig({ saturation: parseInt(e.target.value) / 100 });
    }, 16));

    elements.resetImageAdjustmentsBtn.addEventListener('click', () => {
        events.emit('controls:resetImageAdjustments');
    });

    elements.toggleCurvesBtn.addEventListener('click', () => {
        elements.basicImageControls.classList.toggle('hidden');
        elements.curvesEditor.classList.toggle('hidden');
        events.emit('ui:curves-editor-toggled');
    });

    // Panel de Paleta de Colores
    elements.colorCountSlider.addEventListener('input', debounce((e) => {
        updateConfig({ colorCount: parseInt(e.target.value) });
    }, 150));
    
    // ... (Se añadirán más listeners para otros paneles aquí)

    // Modals
    elements.shortcutsBtn.addEventListener('click', () => elements.shortcutsModal.style.display = 'flex');
    elements.closeShortcutsBtn.addEventListener('click', () => elements.shortcutsModal.style.display = 'none');
    elements.metricsBtn.addEventListener('click', () => elements.metricsModal.style.display = 'flex');
    elements.closeMetricsBtn.addEventListener('click', () => elements.metricsModal.style.display = 'none');
}

/**
 * Actualiza los elementos visuales de la UI en base al estado de la aplicación.
 * @param {object} state - El estado actual de la aplicación.
 */
function updateUI(state) {
    const { config, mediaType, mediaInfo } = state;

    // Actualizar valores de sliders y textos
    elements.brightnessVal.textContent = config.brightness;
    elements.contrastVal.textContent = Math.round(config.contrast * 100);
    elements.saturationVal.textContent = Math.round(config.saturation * 100);
    elements.colorCountVal.textContent = config.colorCount;
    elements.ditherScaleVal.textContent = config.ditherScale;
    
    elements.brightnessSlider.value = config.brightness;
    elements.contrastSlider.value = config.contrast * 100;
    elements.saturationSlider.value = config.saturation * 100;
    elements.colorCountSlider.value = config.colorCount;
    
    // Sincronizar select de algoritmo
    elements.effectSelect.value = config.effect;

    // Actualizar panel de información del algoritmo
    elements.infoText.textContent = ALGORITHM_INFO[config.effect] || 'Selecciona un algoritmo.';
    elements.effectName.textContent = ALGORITHM_NAMES[config.effect] || 'Desconocido';

    // Visibilidad de paneles de control de dithering
    const isDithering = config.effect !== "none" && config.effect !== "posterize";
    elements.ditherControls.classList.toggle("hidden", !isDithering);

    if (isDithering) {
        const isErrorDiffusion = KERNELS[config.effect] || config.effect === 'variable-error';
        const isOrdered = config.effect === "bayer" || config.effect === "blue-noise";
        elements.errorDiffusionControls.classList.toggle("hidden", !isErrorDiffusion);
        elements.orderedDitherControls.classList.toggle("hidden", !isOrdered);
    }
    
    // Actualizar info del medio cargado
    if (mediaType) {
        elements.mediaType.textContent = mediaType.toUpperCase();
        elements.mediaDimensions.textContent = `${mediaInfo.width}x${mediaInfo.height}`;
    } else {
        elements.mediaType.textContent = 'No cargado';
        elements.mediaDimensions.textContent = '';
    }
}


/**
 * Inicializa el módulo de UI.
 */
export function initializeUI() {
    queryElements();
    bindEventListeners();

    // Suscribirse a los eventos de cambio de estado para mantener la UI sincronizada.
    events.on('state:updated', updateUI);
    events.on('config:updated', updateUI);
    
    console.log('UI Module inicializado.');
}