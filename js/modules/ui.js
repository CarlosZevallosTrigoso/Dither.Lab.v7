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
import { getState, updateConfig } from '../app/state.js';
import { ALGORITHM_INFO, ALGORITHM_NAMES, KERNELS } from '../core/constants.js';
import { throttle, debounce } from '../utils/helpers.js';

// Un objeto para mantener referencias a todos los elementos del DOM.
const elements = {};
let lastColorCount = 0; // Cache para evitar recrear el DOM innecesariamente

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

    // ✅ AÑADIDO: Listener para resetear ajustes de imagen
    elements.resetImageAdjustmentsBtn.addEventListener('click', () => {
        updateConfig({
            brightness: 0,
            contrast: 1.0,
            saturation: 1.0
        });
        // También resetear curvas
        events.emit('curves:reset-all');
    });

    elements.toggleCurvesBtn.addEventListener('click', () => {
        elements.basicImageControls.classList.toggle('hidden');
        elements.curvesEditor.classList.toggle('hidden');
        events.emit('ui:curves-editor-toggled');
    });

    // Panel de Paleta de Colores
    elements.colorCountSlider.addEventListener('input', debounce((e) => {
        const newCount = parseInt(e.target.value);
        updateConfig({ colorCount: newCount });
        
        // ✅ MEJORADO: Regenerar paleta automáticamente al cambiar cantidad
        const { config } = getState();
        if (config.isMonochrome) {
            generateMonochromePalette(newCount);
        }
    }, 150));
    
    // ✅ MEJORADO: Generar paleta en escala de grises al activar monocromático
    elements.monochromeToggle.addEventListener('change', (e) => {
        const isMonochrome = e.target.checked;
        updateConfig({ isMonochrome });
        
        if (isMonochrome) {
            const { config } = getState();
            generateMonochromePalette(config.colorCount);
        }
    });
    
    elements.originalColorToggle.addEventListener('change', (e) => {
        updateConfig({ useOriginalColor: e.target.checked });
    });

    // Panel de Controles Avanzados
    elements.ditherScale.addEventListener('input', throttle((e) => {
        updateConfig({ ditherScale: parseInt(e.target.value) });
    }, 16));
    
    elements.serpentineToggle.addEventListener('change', (e) => {
        updateConfig({ serpentineScan: e.target.checked });
    });
    
    elements.diffusionStrengthSlider.addEventListener('input', throttle((e) => {
        updateConfig({ diffusionStrength: parseInt(e.target.value) / 100 });
    }, 16));
    
    elements.patternStrengthSlider.addEventListener('input', throttle((e) => {
        updateConfig({ patternStrength: parseInt(e.target.value) / 100 });
    }, 16));

    // Modals
    elements.shortcutsBtn.addEventListener('click', () => elements.shortcutsModal.style.display = 'flex');
    elements.closeShortcutsBtn.addEventListener('click', () => elements.shortcutsModal.style.display = 'none');
    elements.metricsBtn.addEventListener('click', () => elements.metricsModal.style.display = 'flex');
    elements.closeMetricsBtn.addEventListener('click', () => elements.metricsModal.style.display = 'none');
    
    // ✅ AÑADIDO: Cerrar modales con evento
    events.on('ui:close-modals', () => {
        elements.shortcutsModal.style.display = 'none';
        elements.metricsModal.style.display = 'none';
    });
    
    // ✅ AÑADIDO: Abrir/cerrar modales con eventos de teclado
    events.on('ui:toggle-shortcuts-modal', () => {
        const isVisible = elements.shortcutsModal.style.display === 'flex';
        elements.shortcutsModal.style.display = isVisible ? 'none' : 'flex';
    });
    
    events.on('ui:toggle-metrics-modal', () => {
        const isVisible = elements.metricsModal.style.display === 'flex';
        elements.metricsModal.style.display = isVisible ? 'none' : 'flex';
    });
    
    // ✅ AÑADIDO: Pantalla completa
    events.on('ui:toggle-fullscreen', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.warn('No se pudo activar pantalla completa:', err);
            });
        } else {
            document.exitFullscreen();
        }
    });
}

/**
 * ✅ AÑADIDO: Genera una paleta en escala de grises
 */
function generateMonochromePalette(colorCount) {
    const grayPalette = [];
    for (let i = 0; i < colorCount; i++) {
        const value = Math.floor((i / (colorCount - 1)) * 255);
        const hex = '#' + value.toString(16).padStart(2, '0').repeat(3);
        grayPalette.push(hex);
    }
    updateConfig({ colors: grayPalette });
}

/**
 * Crea o actualiza los selectores de color en el DOM.
 * Esta función es crucial y fue portada de la v6.
 */
function updateColorInputs() {
    const { config } = getState();
    const { colors, colorCount, useOriginalColor, isMonochrome } = config;

    elements.monochromeToggle.disabled = useOriginalColor;
    elements.colorCountSlider.disabled = useOriginalColor;

    const container = elements.colorPickerContainer;
    const currentInputs = container.querySelectorAll('input[type="color"]');

    if (colorCount !== lastColorCount) {
        container.innerHTML = ""; // Limpiar y recrear
        for (let i = 0; i < colorCount; i++) {
            const hexColor = colors[i] || '#000000';
            const label = document.createElement("label");
            label.className = "block";
            label.innerHTML = `
              <span class="text-xs text-gray-400">Color ${i + 1}</span>
              <input type="color" value="${hexColor}" data-index="${i}"
                     class="w-full h-10 p-0 border-none rounded cursor-pointer"/>
            `;
            const colorInput = label.querySelector("input");
            colorInput.addEventListener("input", (e) => {
                const newColors = [...getState().config.colors];
                newColors[i] = e.target.value;
                updateConfig({ colors: newColors });
            });
            container.appendChild(label);
        }
        lastColorCount = colorCount;
    } else {
        // Solo actualizar valores si no se recrea
        currentInputs.forEach((input, i) => {
            if (colors[i] && input.value !== colors[i]) {
                input.value = colors[i];
            }
        });
    }
    
    // Deshabilitar inputs si es necesario
    container.querySelectorAll('input[type="color"]').forEach(input => {
        input.disabled = useOriginalColor || isMonochrome;
    });
}


/**
 * Actualiza los elementos visuales de la UI en base al estado de la aplicación.
 * @param {object} state - El estado actual de la aplicación.
 */
function updateUI(state) {
    if (!state) return;
    const { config, mediaType, mediaInfo } = state;

    // Sincronizar sliders y valores de texto
    elements.brightnessVal.textContent = config.brightness;
    elements.contrastVal.textContent = Math.round(config.contrast * 100);
    elements.saturationVal.textContent = Math.round(config.saturation * 100);
    elements.colorCountVal.textContent = config.colorCount;
    elements.ditherScaleVal.textContent = config.ditherScale;
    elements.diffusionStrengthVal.textContent = Math.round(config.diffusionStrength * 100);
    elements.patternStrengthVal.textContent = Math.round(config.patternStrength * 100);

    elements.brightnessSlider.value = config.brightness;
    elements.contrastSlider.value = config.contrast * 100;
    elements.saturationSlider.value = config.saturation * 100;
    elements.colorCountSlider.value = config.colorCount;
    elements.ditherScale.value = config.ditherScale;
    elements.diffusionStrengthSlider.value = config.diffusionStrength * 100;
    elements.patternStrengthSlider.value = config.patternStrength * 100;

    // Sincronizar checkboxes y selects
    elements.effectSelect.value = config.effect;
    elements.serpentineToggle.checked = config.serpentineScan;
    elements.monochromeToggle.checked = config.isMonochrome;
    elements.originalColorToggle.checked = config.useOriginalColor;

    // Actualizar la paleta de colores en la UI
    updateColorInputs();

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
        elements.playBtn.disabled = mediaType === 'image';
        elements.restartBtn.disabled = mediaType === 'image';
    } else {
        elements.mediaType.textContent = 'No cargado';
        elements.mediaDimensions.textContent = '';
        elements.playBtn.disabled = true;
        elements.restartBtn.disabled = true;
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
    events.on('config:updated', (state) => updateUI(state)); 

    console.log('UI Module inicializado.');
}
