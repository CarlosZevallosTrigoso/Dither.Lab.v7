/**
 * ============================================================================
 * DitherLab v7 - Módulo de Interfaz de Usuario (UI) (VERSIÓN CORREGIDA)
 * ============================================================================
 * - Gestiona todos los elementos del DOM, sus eventos y actualizaciones visuales.
 * - Escucha las acciones del usuario y emite eventos para notificar a otros módulos.
 * - Se suscribe a los cambios de estado para mantener la UI sincronizada.
 * ============================================================================
 */
import { events } from '../app/events.js';
import { getState, updateConfig } from '../app/state.js';
import { ALGORITHM_INFO, ALGORITHM_NAMES, KERNELS } from '../core/constants.js';
import { throttle, debounce, showToast } from '../utils/helpers.js';

// Un objeto para mantener referencias a todos los elementos del DOM.
const elements = {};
let lastColorCount = 0; // Cache para evitar recrear el DOM innecesariamente

// Variables para FPS counter
let lastFrameTime = Date.now();
let frameCount = 0;

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
        'metricsBtn', 'metricsModal', 'closeMetricsBtn', 'updateMetricsBtn',
        'metricPSNR', 'metricSSIM', 'metricCompression',
        'gifFpsSlider', 'gifFpsVal', 'gifQualitySlider', 'gifQualityVal',
        'spriteColsSlider', 'spriteCols', 'spriteFrameCountSlider', 'spriteFrameCount',
        'ditherScaleLabel', 'halftoneSizeLabel', 'halftoneSizeSlider', 'halftoneSizeVal',
        'qualityControls', 'nativeQualityToggle', 'sharpeningSlider', 'sharpeningVal',
        'artisticControls', 'errorGammaSlider', 'errorGammaVal', 'diffusionNoiseSlider', 'diffusionNoiseVal',
        'patternMixSlider', 'patternMixVal', 'errorArtisticControls', 'orderedArtisticControls'
    ];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            elements[id] = el;
        }
    });
}

/**
 * Vincula los listeners a los eventos de los elementos de la UI.
 */
function bindEventListeners() {
    // ========== Panel de Algoritmo ==========
    if (elements.effectSelect) {
        elements.effectSelect.addEventListener('change', (e) => {
            updateConfig({ effect: e.target.value });
        });
    }

    // ========== Panel de Ajustes de Imagen ==========
    if (elements.brightnessSlider) {
        elements.brightnessSlider.addEventListener('input', throttle((e) => {
            updateConfig({ brightness: parseInt(e.target.value) });
        }, 16));
    }

    if (elements.contrastSlider) {
        elements.contrastSlider.addEventListener('input', throttle((e) => {
            updateConfig({ contrast: parseInt(e.target.value) / 100 });
        }, 16));
    }

    if (elements.saturationSlider) {
        elements.saturationSlider.addEventListener('input', throttle((e) => {
            updateConfig({ saturation: parseInt(e.target.value) / 100 });
        }, 16));
    }

    if (elements.resetImageAdjustmentsBtn) {
        elements.resetImageAdjustmentsBtn.addEventListener('click', () => {
            updateConfig({
                brightness: 0,
                contrast: 1.0,
                saturation: 1.0
            });
            events.emit('curves:reset-all');
            showToast('Ajustes de imagen reseteados');
        });
    }

    if (elements.toggleCurvesBtn) {
        elements.toggleCurvesBtn.addEventListener('click', () => {
            if (elements.basicImageControls) {
                elements.basicImageControls.classList.toggle('hidden');
            }
            if (elements.curvesEditor) {
                elements.curvesEditor.classList.toggle('hidden');
            }
            events.emit('ui:curves-editor-toggled');
        });
    }

    // ========== Panel de Paleta de Colores ==========
    if (elements.colorCountSlider) {
        elements.colorCountSlider.addEventListener('input', debounce((e) => {
            const newCount = parseInt(e.target.value);
            updateConfig({ colorCount: newCount });
            
            const { config, media } = getState();
            if (media) { // Solo regenerar si hay un medio cargado
                if (config.isMonochrome) {
                    generateMonochromePalette(newCount);
                } else {
                    // ✅ CORRECCIÓN: Si no es monocromo, emitir evento para regenerar la paleta desde el medio
                    events.emit('palette:regenerate-from-media');
                }
            }
        }, 150));
    }
    
    if (elements.monochromeToggle) {
        elements.monochromeToggle.addEventListener('change', (e) => {
            const isMonochrome = e.target.checked;
            updateConfig({ isMonochrome });
            
            const { config, media } = getState();
            if (media) { // Solo regenerar si hay un medio cargado
                if (isMonochrome) {
                    generateMonochromePalette(config.colorCount);
                } else {
                    // ✅ MEJORA: Al desactivar monocromo, regenerar la paleta de color
                    events.emit('palette:regenerate-from-media');
                }
            }
        });
    }
    
    if (elements.originalColorToggle) {
        elements.originalColorToggle.addEventListener('change', (e) => {
            updateConfig({ useOriginalColor: e.target.checked });
        });
    }

    // ========== Panel de Controles Avanzados ==========
    if (elements.ditherScale) {
        elements.ditherScale.addEventListener('input', throttle((e) => {
            updateConfig({ ditherScale: parseInt(e.target.value) });
        }, 16));
    }
    
    if (elements.serpentineToggle) {
        elements.serpentineToggle.addEventListener('change', (e) => {
            updateConfig({ serpentineScan: e.target.checked });
        });
    }
    
    if (elements.diffusionStrengthSlider) {
        elements.diffusionStrengthSlider.addEventListener('input', throttle((e) => {
            updateConfig({ diffusionStrength: parseInt(e.target.value) / 100 });
        }, 16));
    }
    
    if (elements.patternStrengthSlider) {
        elements.patternStrengthSlider.addEventListener('input', throttle((e) => {
            updateConfig({ patternStrength: parseInt(e.target.value) / 100 });
        }, 16));
    }
    
    if (elements.nativeQualityToggle) {
        elements.nativeQualityToggle.addEventListener('change', (e) => {
            updateConfig({ nativeQualityMode: e.target.checked });
        });
    }

    if (elements.sharpeningSlider) {
        elements.sharpeningSlider.addEventListener('input', throttle((e) => {
            updateConfig({ sharpeningStrength: parseInt(e.target.value) / 100 });
        }, 16));
    }
    
    if (elements.errorGammaSlider) {
        elements.errorGammaSlider.addEventListener('input', throttle((e) => {
            updateConfig({ errorGamma: parseInt(e.target.value) / 100 });
        }, 16));
    }

    if (elements.diffusionNoiseSlider) {
        elements.diffusionNoiseSlider.addEventListener('input', throttle((e) => {
            updateConfig({ diffusionNoise: parseInt(e.target.value) });
        }, 16));
    }
    
    if (elements.patternMixSlider) {
        elements.patternMixSlider.addEventListener('input', throttle((e) => {
            updateConfig({ patternMix: parseInt(e.target.value) / 100 });
        }, 16));
    }
    
    // El resto de la función bindEventListeners (modals, exportación, etc.) no necesita cambios
    // ...
}

function generateMonochromePalette(colorCount) {
    const grayPalette = [];
    for (let i = 0; i < colorCount; i++) {
        const value = Math.floor((i / Math.max(1, colorCount - 1)) * 255);
        const hex = '#' + value.toString(16).padStart(2, '0').repeat(3);
        grayPalette.push(hex);
    }
    updateConfig({ colors: grayPalette });
}

function updateColorInputs() {
    // Esta función no necesita cambios, su lógica es correcta
    // ...
}

function updateUI(state) {
    // Esta función no necesita cambios, su lógica es correcta
    // ...
}

// Inicialización del módulo
export function initializeUI() {
    queryElements();
    bindEventListeners();
    events.on('state:updated', updateUI);
    events.on('config:updated', (state) => updateUI(state)); 
    // ... (resto de la inicialización sin cambios)
}
