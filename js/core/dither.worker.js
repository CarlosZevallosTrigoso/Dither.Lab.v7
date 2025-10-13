/**
 * ============================================================================
 * DitherLab v7 - Módulo de Interfaz de Usuario (UI) (VERSIÓN MEJORADA)
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

const elements = {};
let lastColorCount = 0;
let lastFrameTime = Date.now();
let frameCount = 0;

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
        if (el) elements[id] = el;
    });
}

function bindEventListeners() {
    if (elements.effectSelect) elements.effectSelect.addEventListener('change', (e) => updateConfig({ effect: e.target.value }));
    if (elements.brightnessSlider) elements.brightnessSlider.addEventListener('input', throttle((e) => updateConfig({ brightness: parseInt(e.target.value) }), 16));
    if (elements.contrastSlider) elements.contrastSlider.addEventListener('input', throttle((e) => updateConfig({ contrast: parseInt(e.target.value) / 100 }), 16));
    if (elements.saturationSlider) elements.saturationSlider.addEventListener('input', throttle((e) => updateConfig({ saturation: parseInt(e.target.value) / 100 }), 16));
    if (elements.resetImageAdjustmentsBtn) {
        elements.resetImageAdjustmentsBtn.addEventListener('click', () => {
            updateConfig({ brightness: 0, contrast: 1.0, saturation: 1.0 });
            events.emit('curves:reset-all');
            showToast('Ajustes de imagen reseteados');
        });
    }
    if (elements.toggleCurvesBtn) {
        elements.toggleCurvesBtn.addEventListener('click', () => {
            elements.basicImageControls?.classList.toggle('hidden');
            elements.curvesEditor?.classList.toggle('hidden');
            events.emit('ui:curves-editor-toggled');
        });
    }

    if (elements.colorCountSlider) {
        elements.colorCountSlider.addEventListener('input', debounce((e) => {
            const newCount = parseInt(e.target.value);
            updateConfig({ colorCount: newCount });
            if (getState().config.isMonochrome) {
                generateMonochromePalette(newCount);
            } else {
                events.emit('palette:regenerate-color');
            }
        }, 150));
    }
    
    if (elements.monochromeToggle) {
        elements.monochromeToggle.addEventListener('change', (e) => {
            const isMonochrome = e.target.checked;
            updateConfig({ isMonochrome });
            if (isMonochrome) {
                generateMonochromePalette(getState().config.colorCount);
            } else {
                events.emit('palette:regenerate-color');
            }
        });
    }
    
    if (elements.originalColorToggle) elements.originalColorToggle.addEventListener('change', (e) => updateConfig({ useOriginalColor: e.target.checked }));
    if (elements.ditherScale) elements.ditherScale.addEventListener('input', throttle((e) => updateConfig({ ditherScale: parseInt(e.target.value) }), 16));
    if (elements.halftoneSizeSlider) elements.halftoneSizeSlider.addEventListener('input', throttle((e) => updateConfig({ halftoneSize: parseInt(e.target.value) }), 16));
    if (elements.serpentineToggle) elements.serpentineToggle.addEventListener('change', (e) => updateConfig({ serpentineScan: e.target.checked }));
    if (elements.diffusionStrengthSlider) elements.diffusionStrengthSlider.addEventListener('input', throttle((e) => updateConfig({ diffusionStrength: parseInt(e.target.value) / 100 }), 16));
    if (elements.patternStrengthSlider) elements.patternStrengthSlider.addEventListener('input', throttle((e) => updateConfig({ patternStrength: parseInt(e.target.value) / 100 }), 16));
    if (elements.nativeQualityToggle) elements.nativeQualityToggle.addEventListener('change', (e) => updateConfig({ nativeQualityMode: e.target.checked }));
    if (elements.sharpeningSlider) elements.sharpeningSlider.addEventListener('input', throttle((e) => updateConfig({ sharpeningStrength: parseInt(e.target.value) / 100 }), 16));
    if (elements.errorGammaSlider) elements.errorGammaSlider.addEventListener('input', throttle((e) => updateConfig({ errorGamma: parseInt(e.target.value) / 100 }), 16));
    if (elements.diffusionNoiseSlider) elements.diffusionNoiseSlider.addEventListener('input', throttle((e) => updateConfig({ diffusionNoise: parseInt(e.target.value) }), 16));
    if (elements.patternMixSlider) elements.patternMixSlider.addEventListener('input', throttle((e) => updateConfig({ patternMix: parseInt(e.target.value) / 100 }), 16));

    // El resto de listeners... (se omiten por brevedad, son iguales)
}

function generateMonochromePalette(colorCount) {
    const grayPalette = Array.from({ length: colorCount }, (_, i) => {
        const value = Math.floor((i / Math.max(1, colorCount - 1)) * 255);
        return '#' + value.toString(16).padStart(2, '0').repeat(3);
    });
    updateConfig({ colors: grayPalette });
}

function updateColorInputs() {
    const { config } = getState();
    const { colors, colorCount, useOriginalColor, isMonochrome } = config;

    if (!elements.colorPickerContainer) return;

    elements.monochromeToggle.disabled = useOriginalColor;
    elements.colorCountSlider.disabled = useOriginalColor;

    const container = elements.colorPickerContainer;
    if (colorCount !== lastColorCount) {
        container.innerHTML = "";
        for (let i = 0; i < colorCount; i++) {
            const hexColor = colors[i] || '#000000';
            const label = document.createElement("label");
            label.className = "block";
            label.innerHTML = `<span class="text-xs text-gray-400">Color ${i + 1}</span><input type="color" value="${hexColor}" data-index="${i}" class="w-full h-10 p-0 border-none rounded cursor-pointer"/>`;
            
            // ========= LÓGICA DE UI MEJORADA =========
            label.querySelector("input").addEventListener("input", (e) => {
                const newColors = [...getState().config.colors];
                newColors[i] = e.target.value;
                // Al elegir un color, forzamos el modo color
                updateConfig({ colors: newColors, isMonochrome: false });
            });
            container.appendChild(label);
        }
        lastColorCount = colorCount;
    } else {
        container.querySelectorAll('input[type="color"]').forEach((input, i) => {
            if (colors[i] && input.value !== colors[i]) input.value = colors[i];
        });
    }
    
    container.querySelectorAll('input[type="color"]').forEach(input => input.disabled = useOriginalColor || isMonochrome);
}

function updateUI(state) {
    if (!state || !state.config) return;
    const { config } = state;
    
    // Sincronizar el estado de 'isMonochrome' con el checkbox
    if (elements.monochromeToggle) elements.monochromeToggle.checked = config.isMonochrome;

    // El resto de la función se mantiene igual...
    // ...
    updateColorInputs();
    // ...
}

export function initializeUI() {
    queryElements();
    bindEventListeners();
    events.on('state:updated', updateUI);
    events.on('config:updated', (state) => updateUI(state)); 
    events.on('metrics:results', ({ psnr, ssim, compression }) => {
        if (elements.metricPSNR) elements.metricPSNR.textContent = psnr === Infinity ? '∞ dB' : `${psnr.toFixed(2)} dB`;
        if (elements.metricSSIM) elements.metricSSIM.textContent = ssim.toFixed(4);
        if (elements.metricCompression) elements.metricCompression.textContent = `${compression.ratio.toFixed(2)}% (${compression.unique} colores)`;
        showToast('Métricas actualizadas.');
    });
    console.log('UI Module inicializado.');
}
