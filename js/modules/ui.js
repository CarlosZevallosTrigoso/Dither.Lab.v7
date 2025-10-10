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
        'metricPSNR', 'metricSSIM', 'metricCompression', // ✅ Añadidos IDs para métricas
        'gifFpsSlider', 'gifFpsVal', 'gifQualitySlider', 'gifQualityVal',
        'spriteColsSlider', 'spriteCols', 'spriteFrameCountSlider', 'spriteFrameCount'
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
            
            const { config } = getState();
            if (config.isMonochrome) {
                generateMonochromePalette(newCount);
            }
        }, 150));
    }
    
    if (elements.monochromeToggle) {
        elements.monochromeToggle.addEventListener('change', (e) => {
            const isMonochrome = e.target.checked;
            updateConfig({ isMonochrome });
            
            if (isMonochrome) {
                const { config } = getState();
                generateMonochromePalette(config.colorCount);
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

    // ========== Sliders de Exportación GIF ==========
    if (elements.gifFpsSlider) {
        elements.gifFpsSlider.addEventListener('input', (e) => {
            if (elements.gifFpsVal) {
                elements.gifFpsVal.textContent = e.target.value;
            }
        });
    }

    if (elements.gifQualitySlider) {
        elements.gifQualitySlider.addEventListener('input', (e) => {
            if (elements.gifQualityVal) {
                elements.gifQualityVal.textContent = e.target.value;
            }
        });
    }

    // ========== Sliders de Exportación Sprite Sheet (CORREGIDO) ==========
    if (elements.spriteColsSlider) {
        elements.spriteColsSlider.addEventListener('input', (e) => {
            if (elements.spriteCols) {
                elements.spriteCols.textContent = e.target.value;
            }
        });
    }

    if (elements.spriteFrameCountSlider) {
        elements.spriteFrameCountSlider.addEventListener('input', (e) => {
            if (elements.spriteFrameCount) {
                elements.spriteFrameCount.textContent = e.target.value;
            }
        });
    }

    // ========== Modals ==========
    if (elements.shortcutsBtn) {
        elements.shortcutsBtn.addEventListener('click', () => {
            if (elements.shortcutsModal) {
                elements.shortcutsModal.style.display = 'flex';
            }
        });
    }

    if (elements.closeShortcutsBtn) {
        elements.closeShortcutsBtn.addEventListener('click', () => {
            if (elements.shortcutsModal) {
                elements.shortcutsModal.style.display = 'none';
            }
        });
    }

    if (elements.metricsBtn) {
        elements.metricsBtn.addEventListener('click', () => {
            if (elements.metricsModal) {
                elements.metricsModal.style.display = 'flex';
            }
        });
    }

    if (elements.closeMetricsBtn) {
        elements.closeMetricsBtn.addEventListener('click', () => {
            if (elements.metricsModal) {
                elements.metricsModal.style.display = 'none';
            }
        });
    }

    if (elements.updateMetricsBtn) {
        elements.updateMetricsBtn.addEventListener('click', () => {
            const state = getState();
            if (!state.media) {
                showToast('Carga una imagen o video primero.');
                return;
            }
            events.emit('metrics:calculate');
            showToast('Calculando métricas...');
        });
    }
    
    events.on('ui:close-modals', () => {
        if (elements.shortcutsModal) elements.shortcutsModal.style.display = 'none';
        if (elements.metricsModal) elements.metricsModal.style.display = 'none';
    });
    
    events.on('ui:toggle-shortcuts-modal', () => {
        if (elements.shortcutsModal) {
            const isVisible = elements.shortcutsModal.style.display === 'flex';
            elements.shortcutsModal.style.display = isVisible ? 'none' : 'flex';
        }
    });
    
    events.on('ui:toggle-metrics-modal', () => {
        if (elements.metricsModal) {
            const isVisible = elements.metricsModal.style.display === 'flex';
            elements.metricsModal.style.display = isVisible ? 'none' : 'flex';
        }
    });
    
    events.on('ui:toggle-fullscreen', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.warn('No se pudo activar pantalla completa:', err);
            });
        } else {
            document.exitFullscreen();
        }
    });

    // ========== FPS Counter ==========
    events.on('render:frame-drawn', () => {
        frameCount++;
        const now = Date.now();
        const delta = now - lastFrameTime;
        
        if (delta >= 1000) { // Actualizar cada segundo
            const fps = Math.round((frameCount * 1000) / delta);
            const avgFrameTime = Math.round(delta / frameCount);
            
            if (elements.fps) elements.fps.textContent = fps;
            if (elements.frameTime) elements.frameTime.textContent = avgFrameTime;
            
            frameCount = 0;
            lastFrameTime = now;
        }
    });

    console.log('Event listeners vinculados correctamente.');
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
    const { config } = getState();
    const { colors, colorCount, useOriginalColor, isMonochrome } = config;

    if (!elements.colorPickerContainer) return;

    if (elements.monochromeToggle) {
        elements.monochromeToggle.disabled = useOriginalColor;
    }
    if (elements.colorCountSlider) {
        elements.colorCountSlider.disabled = useOriginalColor;
    }

    const container = elements.colorPickerContainer;
    const currentInputs = container.querySelectorAll('input[type="color"]');

    if (colorCount !== lastColorCount) {
        container.innerHTML = "";
        
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
        currentInputs.forEach((input, i) => {
            if (colors[i] && input.value !== colors[i]) {
                input.value = colors[i];
            }
        });
    }
    
    container.querySelectorAll('input[type="color"]').forEach(input => {
        input.disabled = useOriginalColor || isMonochrome;
    });
}

function updateUI(state) {
    if (!state || !state.config) return;
    const { config, mediaType, mediaInfo } = state;

    if (elements.brightnessVal) elements.brightnessVal.textContent = config.brightness;
    if (elements.contrastVal) elements.contrastVal.textContent = Math.round(config.contrast * 100);
    if (elements.saturationVal) elements.saturationVal.textContent = Math.round(config.saturation * 100);
    if (elements.colorCountVal) elements.colorCountVal.textContent = config.colorCount;
    if (elements.ditherScaleVal) elements.ditherScaleVal.textContent = config.ditherScale;
    if (elements.diffusionStrengthVal) elements.diffusionStrengthVal.textContent = Math.round(config.diffusionStrength * 100);
    if (elements.patternStrengthVal) elements.patternStrengthVal.textContent = Math.round(config.patternStrength * 100);

    if (elements.brightnessSlider) elements.brightnessSlider.value = config.brightness;
    if (elements.contrastSlider) elements.contrastSlider.value = config.contrast * 100;
    if (elements.saturationSlider) elements.saturationSlider.value = config.saturation * 100;
    if (elements.colorCountSlider) elements.colorCountSlider.value = config.colorCount;
    if (elements.ditherScale) elements.ditherScale.value = config.ditherScale;
    if (elements.diffusionStrengthSlider) elements.diffusionStrengthSlider.value = config.diffusionStrength * 100;
    if (elements.patternStrengthSlider) elements.patternStrengthSlider.value = config.patternStrength * 100;

    if (elements.effectSelect) elements.effectSelect.value = config.effect;
    if (elements.serpentineToggle) elements.serpentineToggle.checked = config.serpentineScan;
    if (elements.monochromeToggle) elements.monochromeToggle.checked = config.isMonochrome;
    if (elements.originalColorToggle) elements.originalColorToggle.checked = config.useOriginalColor;

    updateColorInputs();

    if (elements.infoText) {
        elements.infoText.textContent = ALGORITHM_INFO[config.effect] || 'Selecciona un algoritmo.';
    }
    if (elements.effectName) {
        elements.effectName.textContent = ALGORITHM_NAMES[config.effect] || 'Desconocido';
    }

    const isDithering = config.effect !== "none" && config.effect !== "posterize";
    if (elements.ditherControls) {
        elements.ditherControls.classList.toggle("hidden", !isDithering);
    }

    if (isDithering) {
        const isErrorDiffusion = KERNELS[config.effect] || config.effect === 'variable-error';
        const isOrdered = ["bayer", "blue-noise", "spiral-dither", "halftone-dither"].includes(config.effect);
        
        if (elements.errorDiffusionControls) {
            elements.errorDiffusionControls.classList.toggle("hidden", !isErrorDiffusion);
        }
        if (elements.orderedDitherControls) {
            elements.orderedDitherControls.classList.toggle("hidden", !isOrdered);
        }
    }

    if (mediaType) {
        if (elements.mediaType) elements.mediaType.textContent = mediaType.toUpperCase();
        if (elements.mediaDimensions && mediaInfo) {
            elements.mediaDimensions.textContent = `${mediaInfo.width}x${mediaInfo.height}`;
        }
        if (elements.playBtn) elements.playBtn.disabled = mediaType === 'image';
        if (elements.restartBtn) elements.restartBtn.disabled = mediaType === 'image';
    } else {
        if (elements.mediaType) elements.mediaType.textContent = 'No cargado';
        if (elements.mediaDimensions) elements.mediaDimensions.textContent = '';
        if (elements.playBtn) elements.playBtn.disabled = true;
        if (elements.restartBtn) elements.restartBtn.disabled = true;
    }
}

export function initializeUI() {
    queryElements();
    bindEventListeners();

    events.on('state:updated', updateUI);
    events.on('config:updated', (state) => updateUI(state)); 

    events.on('metrics:results', ({ psnr, ssim, compression }) => {
        if (elements.metricPSNR) {
            elements.metricPSNR.textContent = psnr === Infinity ? '∞ dB' : `${psnr.toFixed(2)} dB`;
        }
        if (elements.metricSSIM) {
            elements.metricSSIM.textContent = ssim.toFixed(4);
        }
        if (elements.metricCompression) {
            elements.metricCompression.textContent = `${compression.ratio.toFixed(2)}% (${compression.unique} colores)`;
        }
        showToast('Métricas actualizadas.');
    });

    console.log('UI Module inicializado.');
}
