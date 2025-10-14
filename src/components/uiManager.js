// src/components/uiManager.js

import { ALGORITHM_INFO, ALGORITHM_NAMES } from '../utils/constants.js';
import { debounce, throttle, formatTime } from '../utils/helpers.js';

/**
 * UIManager - Gestiona todos los elementos del DOM, los eventos de la interfaz
 * y actualiza el estado de la aplicación en respuesta a la interacción del usuario.
 */
export default class UIManager {
  constructor(appState) {
    this.appState = appState;
    this.elements = {};
    this.readyCallback = null;

    // Cache para optimizar la actualización de los selectores de color
    this.lastColorCount = 0;

    this.init();
    this.appState.subscribe(this.updateUIComponents.bind(this));
  }

  /**
   * Se ejecuta cuando el UIManager está listo.
   * @param {function} callback
   */
  onReady(callback) {
      this.readyCallback = callback;
  }

  /**
   * Inicializa los selectores de elementos y los listeners de eventos.
   */
  init() {
    // Seleccionar todos los elementos del DOM necesarios
    const ids = [
      'playBtn', 'restartBtn', 'effectSelect', 'monochromeToggle', 'colorCountSlider',
      'colorCountVal', 'colorPickerContainer', 'ditherControls', 'ditherScale',
      'ditherScaleVal', 'serpentineToggle', 'diffusionStrengthSlider', 'diffusionStrengthVal',
      'patternStrengthSlider', 'patternStrengthVal', 'originalColorToggle', 'brightnessSlider',
      'brightnessVal', 'contrastSlider', 'contrastVal', 'saturationSlider', 'saturationVal',
      'resetImageAdjustmentsBtn', 'toggleCurvesBtn', 'basicImageControls', 'curvesEditor',
      'infoText', 'errorDiffusionControls', 'orderedDitherControls',
      'mediaType', 'mediaDimensions', 'timelinePanel', 'gifExportPanel', 'spriteSheetPanel',
      'exportSequenceBtn'
      // Añadir aquí otros IDs que necesites controlar
    ];
    ids.forEach(id => this.elements[id] = document.getElementById(id));

    this.bindEvents();
    
    if (this.readyCallback) {
        this.readyCallback();
    }
  }

  /**
   * Vincula todos los eventos de la UI a los métodos correspondientes.
   */
  bindEvents() {
    // --- Controles Principales ---
    this.elements.effectSelect.addEventListener('change', e => {
      this.appState.updateConfig({ effect: e.target.value });
    });
    
    // --- Controles de Paleta ---
    this.elements.originalColorToggle.addEventListener('change', e => {
      this.appState.updateConfig({ useOriginalColor: e.target.checked });
    });
    this.elements.monochromeToggle.addEventListener('change', e => {
      this.appState.updateConfig({ isMonochrome: e.target.checked });
      // Forzar regeneración del gradiente
      this.updateColorPickers(this.appState, true);
    });
    this.elements.colorCountSlider.addEventListener('input', debounce(e => {
      this.appState.updateConfig({ colorCount: parseInt(e.target.value) });
      this.updateColorPickers(this.appState, true);
    }, 100));

    // --- Controles de Ajuste de Imagen ---
    this.elements.brightnessSlider.addEventListener('input', throttle(e => {
      this.appState.updateConfig({ brightness: parseInt(e.target.value) });
    }, 16));
    this.elements.contrastSlider.addEventListener('input', throttle(e => {
      this.appState.updateConfig({ contrast: parseInt(e.target.value) / 100 });
    }, 16));
    this.elements.saturationSlider.addEventListener('input', throttle(e => {
      this.appState.updateConfig({ saturation: parseInt(e.target.value) / 100 });
    }, 16));
    this.elements.resetImageAdjustmentsBtn.addEventListener('click', () => {
        this.appState.updateConfig({ brightness: 0, contrast: 1.0, saturation: 1.0 });
        // También habría que resetear las curvas aquí, si se implementa
    });

    // --- Controles Avanzados de Dithering ---
    this.elements.ditherScale.addEventListener('input', throttle(e => {
      this.appState.updateConfig({ ditherScale: parseInt(e.target.value) });
    }, 16));
    this.elements.serpentineToggle.addEventListener('change', e => {
      this.appState.updateConfig({ serpentineScan: e.target.checked });
    });
    this.elements.diffusionStrengthSlider.addEventListener('input', throttle(e => {
      this.appState.updateConfig({ diffusionStrength: parseInt(e.target.value) / 100 });
    }, 16));
    this.elements.patternStrengthSlider.addEventListener('input', throttle(e => {
      this.appState.updateConfig({ patternStrength: parseInt(e.target.value) / 100 });
    }, 16));
  }
  
  /**
   * Se ejecuta cuando se carga un nuevo medio para mostrar/ocultar paneles.
   * @param {string} mediaType 'image' o 'video'
   */
  handleMediaLoaded(mediaType) {
      const isVideo = mediaType === 'video';
      this.elements.timelinePanel.classList.toggle('hidden', !isVideo);
      this.elements.gifExportPanel.classList.toggle('hidden', !isVideo);
      this.elements.spriteSheetPanel.classList.toggle('hidden', !isVideo);
      this.elements.exportSequenceBtn.classList.toggle('hidden', !isVideo);
      this.elements.playBtn.disabled = !isVideo;
  }

  /**
   * Actualiza los componentes de la UI que dependen del estado.
   * Se llama automáticamente cada vez que el estado cambia.
   * @param {object} state - El estado completo de la aplicación.
   */
  updateUIComponents(state) {
    // Actualizar valores de los sliders
    this.elements.colorCountVal.textContent = state.config.colorCount;
    this.elements.brightnessVal.textContent = state.config.brightness;
    this.elements.contrastVal.textContent = Math.round(state.config.contrast * 100);
    this.elements.saturationVal.textContent = Math.round(state.config.saturation * 100);
    this.elements.ditherScaleVal.textContent = state.config.ditherScale;
    this.elements.diffusionStrengthVal.textContent = Math.round(state.config.diffusionStrength * 100);
    this.elements.patternStrengthVal.textContent = Math.round(state.config.patternStrength * 100);
    
    // Sincronizar sliders si el estado se cambió programáticamente (ej. al cargar preset)
    this.elements.colorCountSlider.value = state.config.colorCount;
    this.elements.brightnessSlider.value = state.config.brightness;
    this.elements.contrastSlider.value = state.config.contrast * 100;
    this.elements.saturationSlider.value = state.config.saturation * 100;
    this.elements.ditherScale.value = state.config.ditherScale;
    this.elements.diffusionStrengthSlider.value = state.config.diffusionStrength * 100;
    this.elements.patternStrengthSlider.value = state.config.patternStrength * 100;

    // Actualizar toggles
    this.elements.originalColorToggle.checked = state.config.useOriginalColor;
    this.elements.monochromeToggle.checked = state.config.isMonochrome;
    this.elements.serpentineToggle.checked = state.config.serpentineScan;

    // Actualizar visibilidad de paneles
    this.updatePanelsVisibility(state.config);

    // Actualizar selectores de color
    this.updateColorPickers(state);
    
    // Actualizar información del medio
    if (state.media) {
        this.elements.mediaType.textContent = state.mediaType.toUpperCase();
        const mediaInfo = state.mediaType === 'video' 
            ? `${state.media.width}x${state.media.height} - ${formatTime(state.timeline.duration)}`
            : `${state.media.width}x${state.media.height}`;
        this.elements.mediaDimensions.textContent = mediaInfo;
    } else {
        this.elements.mediaType.textContent = 'No cargado';
        this.elements.mediaDimensions.textContent = '';
    }
  }

  /**
   * Gestiona la visibilidad de los paneles de control según el algoritmo seleccionado.
   * @param {object} config - La configuración actual.
   */
  updatePanelsVisibility(config) {
    const effect = config.effect;
    const isDithering = effect !== "none" && effect !== "posterize";
    this.elements.ditherControls.classList.toggle("hidden", !isDithering);

    if (isDithering) {
      const isErrorDiffusion = !!KERNELS[effect] || effect === 'variable-error';
      const isOrdered = effect === "bayer" || effect === "blue-noise";
      this.elements.errorDiffusionControls.classList.toggle("hidden", !isErrorDiffusion);
      this.elements.orderedDitherControls.classList.toggle("hidden", !isOrdered);
    }

    this.elements.infoText.textContent = ALGORITHM_INFO[effect] || "Selecciona un algoritmo.";
  }

  /**
   * Actualiza la UI de los selectores de color.
   * @param {object} state - El estado actual de la aplicación.
   * @param {boolean} forceGradient - Si es true, recalcula los colores como un gradiente.
   */
  updateColorPickers(state, forceGradient = false) {
    const cfg = state.config;
    const colorCountChanged = cfg.colorCount !== this.lastColorCount;
    const container = this.elements.colorPickerContainer;
    const currentInputs = container.querySelectorAll('input[type="color"]');

    let newColors = [...cfg.colors];

    if (cfg.isMonochrome) {
        newColors = [];
        for (let i = 0; i < cfg.colorCount; i++) {
            const grayVal = Math.round(i / (cfg.colorCount - 1) * 255);
            const hex = grayVal.toString(16).padStart(2, "0");
            newColors.push(`#${hex}${hex}${hex}`);
        }
        this.appState.updateConfig({ colors: newColors });
    } else if (forceGradient) {
        // Lógica de gradiente simplificada. Asume p5.js en global o necesita refactor.
        // Por ahora, solo actualiza el estado. El ditherProcessor se encarga del lerpColor.
        // Aquí solo actualizamos la UI.
    }

    if (colorCountChanged || currentInputs.length !== cfg.colorCount) {
      container.innerHTML = ""; // Recrear DOM
      cfg.colors.forEach((hexColor, i) => {
        const label = document.createElement("label");
        label.className = "block";
        label.innerHTML = `
          <span class="text-xs text-gray-400">Color ${i + 1}</span>
          <input type="color" value="${hexColor}" data-index="${i}" class="w-full h-10 p-0 border-none rounded cursor-pointer"/>
        `;
        const colorInput = label.querySelector("input");
        colorInput.addEventListener("input", e => {
          if (!cfg.isMonochrome) {
            const updatedColors = [...this.appState.config.colors];
            updatedColors[i] = e.target.value;
            this.appState.updateConfig({ colors: updatedColors });
          }
        });
        container.appendChild(label);
      });
      this.lastColorCount = cfg.colorCount;
    } else {
      // Solo actualizar valores
      currentInputs.forEach((input, i) => {
        if (input.value.toLowerCase() !== cfg.colors[i].toLowerCase()) {
          input.value = cfg.colors[i];
        }
      });
    }

    // Habilitar/deshabilitar controles de paleta
    const isDisabled = cfg.useOriginalColor;
    this.elements.monochromeToggle.disabled = isDisabled;
    this.elements.colorCountSlider.disabled = isDisabled;
    container.querySelectorAll("input").forEach(input => input.disabled = isDisabled);
  }
}
