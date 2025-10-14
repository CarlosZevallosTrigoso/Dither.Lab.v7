/**
 * ============================================================================
 * DitherLab v7 - Módulo de Interfaz de Usuario (UI) - VERSIÓN COMPLETA
 * ============================================================================
 * - Gestiona todos los elementos del DOM, sus eventos y actualizaciones visuales.
 * - Escucha las acciones del usuario y emite eventos para notificar a otros módulos.
 * - Se suscribe a los cambios de estado para mantener la UI sincronizada.
 * ============================================================================
 */
import { events } from '../app/events.js';
import { getState, updateConfig } from '../app/state.js';
import { ALGORITHM_INFO, ALGORITHM_NAMES, KERNELS } from '../core/constants.js';
import { throttle, debounce, showToast, formatTime } from '../utils/helpers.js';

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
        'metricPSNR', 'metricSSIM', 'metricCompression', 'metricPaletteSize', 'metricProcessTime',
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
 * Genera una paleta monocromática (escala de grises).
 */
function generateMonochromePalette(colorCount) {
    const grayPalette = [];
    for (let i = 0; i < colorCount; i++) {
        const value = Math.floor((i / Math.max(1, colorCount - 1)) * 255);
        const hex = '#' + value.toString(16).padStart(2, '0').repeat(3);
        grayPalette.push(hex);
    }
    updateConfig({ colors: grayPalette });
}

/**
 * Crea y actualiza los inputs de color (color pickers) dinámicamente.
 */
function updateColorInputs() {
    const { config } = getState();
    const { colors, colorCount } = config;
    
    // Evitar recrear el DOM innecesariamente
    if (lastColorCount === colorCount && elements.colorPickerContainer.children.length === colorCount) {
        // Solo actualizar valores existentes
        for (let i = 0; i < colorCount; i++) {
            const input = elements.colorPickerContainer.children[i]?.querySelector('input[type="color"]');
            if (input && input.value !== colors[i]) {
                input.value = colors[i];
            }
        }
        return;
    }
    
    lastColorCount = colorCount;
    elements.colorPickerContainer.innerHTML = '';
    
    for (let i = 0; i < colorCount; i++) {
        const colorDiv = document.createElement('div');
        colorDiv.className = 'flex flex-col items-center gap-1';
        
        const input = document.createElement('input');
        input.type = 'color';
        input.value = colors[i] || '#000000';
        input.className = 'w-full h-12 cursor-pointer rounded border-2 border-slate-600 hover:border-cyan-400 transition-colors';
        input.dataset.index = i;
        
        input.addEventListener('input', debounce((e) => {
            const newColors = [...config.colors];
            newColors[parseInt(e.target.dataset.index)] = e.target.value;
            updateConfig({ colors: newColors });
        }, 100));
        
        const label = document.createElement('span');
        label.className = 'text-xs text-gray-400';
        label.textContent = `#${i + 1}`;
        
        colorDiv.appendChild(input);
        colorDiv.appendChild(label);
        elements.colorPickerContainer.appendChild(colorDiv);
    }
}

/**
 * Actualiza el contador de FPS y tiempo por frame.
 */
function updateFPSCounter() {
    frameCount++;
    const now = Date.now();
    const elapsed = now - lastFrameTime;
    
    if (elapsed >= 1000) {
        const fps = (frameCount / elapsed) * 1000;
        const frameTime = elapsed / frameCount;
        
        if (elements.fps) {
            elements.fps.textContent = fps.toFixed(1);
        }
        
        if (elements.frameTime) {
            elements.frameTime.textContent = frameTime.toFixed(1);
        }
        
        frameCount = 0;
        lastFrameTime = now;
    }
}

/**
 * Alterna el modo de pantalla completa.
 */
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            showToast(`Error al entrar en pantalla completa: ${err.message}`, 3000);
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

/**
 * Alterna la visibilidad del modal de métricas.
 */
function toggleMetricsModal() {
    if (!elements.metricsModal) return;
    const isVisible = elements.metricsModal.style.display === 'flex';
    elements.metricsModal.style.display = isVisible ? 'none' : 'flex';
    
    // Si se abre, calcular métricas automáticamente
    if (!isVisible) {
        events.emit('metrics:calculate');
    }
}

/**
 * Alterna la visibilidad del modal de atajos de teclado.
 */
function toggleShortcutsModal() {
    if (!elements.shortcutsModal) return;
    const isVisible = elements.shortcutsModal.style.display === 'flex';
    elements.shortcutsModal.style.display = isVisible ? 'none' : 'flex';
}

/**
 * Cierra todos los modales abiertos.
 */
function closeAllModals() {
    if (elements.shortcutsModal) elements.shortcutsModal.style.display = 'none';
    if (elements.metricsModal) elements.metricsModal.style.display = 'none';
}

/**
 * Actualiza la visualización de las métricas de calidad.
 */
function updateMetricsDisplay(data) {
    if (elements.metricPSNR) {
        elements.metricPSNR.textContent = data.psnr === Infinity ? '∞ dB' : `${data.psnr.toFixed(2)} dB`;
    }
    if (elements.metricSSIM) {
        elements.metricSSIM.textContent = data.ssim.toFixed(4);
    }
    if (elements.metricCompression) {
        elements.metricCompression.textContent = `${data.compression.ratio.toFixed(2)}%`;
    }
    if (elements.metricPaletteSize) {
        elements.metricPaletteSize.textContent = `${data.compression.unique} colores`;
    }
    if (elements.metricProcessTime) {
        elements.metricProcessTime.textContent = `${data.processTime || 0} ms`;
    }
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
            if (media) {
                if (config.isMonochrome) {
                    generateMonochromePalette(newCount);
                } else {
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
            if (media) {
                if (isMonochrome) {
                    generateMonochromePalette(config.colorCount);
                } else {
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

    // ========== Panel de Controles de Dither ==========
    if (elements.ditherScale) {
        elements.ditherScale.addEventListener('input', throttle((e) => {
            updateConfig({ ditherScale: parseInt(e.target.value) });
        }, 16));
    }
    
    if (elements.halftoneSizeSlider) {
        elements.halftoneSizeSlider.addEventListener('input', throttle((e) => {
            updateConfig({ halftoneSize: parseInt(e.target.value) });
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

    // ========== Panel de Calidad ==========
    if (elements.nativeQualityToggle) {
        elements.nativeQualityToggle.addEventListener('change', (e) => {
            updateConfig({ nativeQualityMode: e.target.checked });
            showToast(e.target.checked ? 'Modo calidad nativa activado' : 'Modo calidad optimizada');
        });
    }

    if (elements.sharpeningSlider) {
        elements.sharpeningSlider.addEventListener('input', throttle((e) => {
            updateConfig({ sharpeningStrength: parseInt(e.target.value) / 100 });
        }, 16));
    }

    // ========== Panel de Controles Artísticos ==========
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

    // ========== Modales ==========
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
            toggleMetricsModal();
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
            events.emit('metrics:calculate');
            showToast('Calculando métricas...');
        });
    }

    // Cerrar modales al hacer click fuera de ellos
    [elements.shortcutsModal, elements.metricsModal].forEach(modal => {
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        }
    });

    // ========== Sliders que actualizan sus valores visuales ==========
    const sliderPairs = [
        ['gifFpsSlider', 'gifFpsVal'],
        ['gifQualitySlider', 'gifQualityVal'],
        ['spriteColsSlider', 'spriteCols'],
        ['spriteFrameCountSlider', 'spriteFrameCount'],
        ['halftoneSizeSlider', 'halftoneSizeVal']
    ];
    
    sliderPairs.forEach(([sliderId, valId]) => {
        if (elements[sliderId] && elements[valId]) {
            elements[sliderId].addEventListener('input', (e) => {
                elements[valId].textContent = e.target.value;
            });
        }
    });

    // ========== Eventos Globales de Teclado ==========
    events.on('ui:toggle-fullscreen', toggleFullscreen);
    events.on('ui:toggle-metrics-modal', toggleMetricsModal);
    events.on('ui:toggle-shortcuts-modal', toggleShortcutsModal);
    events.on('ui:close-modals', closeAllModals);
    
    // ========== Eventos de Métricas ==========
    events.on('metrics:results', updateMetricsDisplay);
    
    // ========== Contador de FPS ==========
    events.on('render:frame-drawn', updateFPSCounter);
}

/**
 * Actualiza toda la UI basándose en el estado actual de la aplicación.
 * @param {object} state - El estado actual completo.
 */
function updateUI(state) {
    const { media, mediaType, mediaInfo, config, isPlaying, isRecording } = state;
    
    // ========== INFORMACIÓN DEL MEDIO ==========
    if (elements.mediaType) {
        elements.mediaType.textContent = mediaType === 'video' ? 'Video' : 
                                         mediaType === 'image' ? 'Imagen' : 'No cargado';
        elements.mediaType.className = `bg-slate-700 px-2 py-1 rounded ${
            mediaType === 'video' ? 'text-blue-400' : 
            mediaType === 'image' ? 'text-green-400' : 'text-gray-400'
        }`;
    }
    
    if (elements.mediaDimensions && mediaInfo && mediaInfo.width > 0) {
        elements.mediaDimensions.textContent = 
            `${mediaInfo.width}x${mediaInfo.height}${mediaType === 'video' ? ` • ${formatTime(mediaInfo.duration)}` : ''}`;
    } else if (elements.mediaDimensions) {
        elements.mediaDimensions.textContent = '';
    }
    
    // ========== BOTONES DE CONTROL ==========
    const hasMedia = media !== null;
    const isVideo = mediaType === 'video';
    
    if (elements.playBtn) elements.playBtn.disabled = !isVideo;
    if (elements.restartBtn) elements.restartBtn.disabled = !isVideo;
    
    // ========== ALGORITMO Y DESCRIPCIÓN ==========
    if (elements.effectSelect) {
        elements.effectSelect.value = config.effect;
    }
    
    if (elements.infoText) {
        elements.infoText.textContent = ALGORITHM_INFO[config.effect] || 'Sin información disponible.';
    }
    
    if (elements.effectName) {
        elements.effectName.textContent = ALGORITHM_NAMES[config.effect] || config.effect;
    }
    
    // ========== CONTROLES DE DITHER (Visibilidad según algoritmo) ==========
    const isErrorDiffusion = KERNELS[config.effect] !== undefined;
    const isOrderedDither = ['bayer', 'blue-noise'].includes(config.effect);
    const isDitherActive = config.effect !== 'none';
    
    if (elements.errorDiffusionControls) {
        elements.errorDiffusionControls.classList.toggle('hidden', !isErrorDiffusion);
    }
    
    if (elements.orderedDitherControls) {
        elements.orderedDitherControls.classList.toggle('hidden', !isOrderedDither);
    }
    
    if (elements.ditherControls) {
        // Hacer menos visible si no hay dithering activo
        if (isDitherActive) {
            elements.ditherControls.classList.remove('opacity-50');
        } else {
            elements.ditherControls.classList.add('opacity-50');
        }
    }
    
    // ========== CONTROLES ARTÍSTICOS (Mostrar/Ocultar según algoritmo) ==========
    if (elements.errorArtisticControls) {
        elements.errorArtisticControls.classList.toggle('hidden', !isErrorDiffusion);
    }
    
    if (elements.orderedArtisticControls) {
        elements.orderedArtisticControls.classList.toggle('hidden', !isOrderedDither);
    }
    
    if (elements.artisticControls) {
        elements.artisticControls.classList.toggle('hidden', !isDitherActive);
    }
    
    // ========== CONTROLES DE CALIDAD (Mostrar solo si hay medio cargado) ==========
    if (elements.qualityControls) {
        elements.qualityControls.classList.toggle('hidden', !hasMedia);
    }
    
    // ========== VALORES DE SLIDERS (Actualizar textos) ==========
    const sliderValues = {
        colorCountVal: config.colorCount,
        ditherScaleVal: config.ditherScale,
        diffusionStrengthVal: Math.round(config.diffusionStrength * 100),
        patternStrengthVal: Math.round(config.patternStrength * 100),
        brightnessVal: config.brightness,
        contrastVal: Math.round(config.contrast * 100),
        saturationVal: Math.round(config.saturation * 100),
        sharpeningVal: Math.round((config.sharpeningStrength || 0) * 100),
        errorGammaVal: (config.errorGamma || 1).toFixed(2),
        diffusionNoiseVal: config.diffusionNoise || 0,
        patternMixVal: Math.round((config.patternMix || 0.5) * 100),
        halftoneSizeVal: config.halftoneSize || 10
    };
    
    Object.entries(sliderValues).forEach(([elemId, value]) => {
        if (elements[elemId]) elements[elemId].textContent = value;
    });
    
    // ========== SINCRONIZAR VALORES DE SLIDERS (Por si se cargó un preset) ==========
    if (elements.colorCountSlider) elements.colorCountSlider.value = config.colorCount;
    if (elements.ditherScale) elements.ditherScale.value = config.ditherScale;
    if (elements.diffusionStrengthSlider) elements.diffusionStrengthSlider.value = config.diffusionStrength * 100;
    if (elements.patternStrengthSlider) elements.patternStrengthSlider.value = config.patternStrength * 100;
    if (elements.brightnessSlider) elements.brightnessSlider.value = config.brightness;
    if (elements.contrastSlider) elements.contrastSlider.value = config.contrast * 100;
    if (elements.saturationSlider) elements.saturationSlider.value = config.saturation * 100;
    if (elements.sharpeningSlider) elements.sharpeningSlider.value = (config.sharpeningStrength || 0) * 100;
    if (elements.errorGammaSlider) elements.errorGammaSlider.value = (config.errorGamma || 1) * 100;
    if (elements.diffusionNoiseSlider) elements.diffusionNoiseSlider.value = config.diffusionNoise || 0;
    if (elements.patternMixSlider) elements.patternMixSlider.value = (config.patternMix || 0.5) * 100;
    if (elements.halftoneSizeSlider) elements.halftoneSizeSlider.value = config.halftoneSize || 10;
    
    // ========== CHECKBOXES ==========
    if (elements.monochromeToggle) elements.monochromeToggle.checked = config.isMonochrome;
    if (elements.originalColorToggle) elements.originalColorToggle.checked = config.useOriginalColor;
    if (elements.serpentineToggle) elements.serpentineToggle.checked = config.serpentineScan;
    if (elements.nativeQualityToggle) elements.nativeQualityToggle.checked = config.nativeQualityMode || false;
    
    // ========== COLOR INPUTS ==========
    updateColorInputs();
    
    // ========== ESTADO DE GRABACIÓN ==========
    if (elements.status) {
        elements.status.textContent = isRecording ? 'Grabando...' : 'Listo';
    }
}

/**
 * Inicializa el módulo de UI.
 */
export function initializeUI() {
    console.log('Inicializando módulo UI...');
    
    queryElements();
    bindEventListeners();
    
    // Suscribirse a cambios de estado
    events.on('state:updated', updateUI);
    events.on('config:updated', (state) => updateUI(state));
    events.on('presets:loaded', () => updateUI(getState()));
    
    // Actualizar UI inicial
    updateUI(getState());
    
    console.log('Módulo UI inicializado correctamente.');
}
