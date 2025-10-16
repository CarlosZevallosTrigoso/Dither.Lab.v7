// ============================================================================
// OPTIMIZACIÓN FASE 1: Circular Buffer para historial de FPS
// ============================================================================
class CircularBuffer {
  constructor(size) {
    this.buffer = new Float32Array(size);
    this.index = 0;
    this.size = size;
    this.filled = false;
  }
  
  push(value) {
    this.buffer[this.index] = value;
    this.index = (this.index + 1) % this.size;
    if (this.index === 0) this.filled = true;
  }
  
  average() {
    const count = this.filled ? this.size : this.index;
    if (count === 0) return 0;
    let sum = 0;
    for (let i = 0; i < count; i++) sum += this.buffer[i];
    return sum / count;
  }
  
  clear() {
    this.index = 0;
    this.filled = false;
  }
}

// Sketch p5.js
document.addEventListener('DOMContentLoaded', () => {
  const sketch = p => {
    let canvas, currentFileURL = null, updateTimelineUI = null;
    let recorder, chunks = [], originalCanvasWidth, originalCanvasHeight;
    
    // OPTIMIZACIÓN FASE 1: Flag para controlar redibujado
    let needsRedraw = true;
    
    // ✅ USAR STATE V7
    const appState = window.state;
    
    const bufferPool = new BufferPool();
    const colorCache = new ColorCache(p);
    const lumaLUT = new LumaLUT();
    const bayerLUT = new BayerLUT();
    const blueNoiseLUT = new BlueNoiseLUT();
    const ui = new UIManager();
    const curvesEditor = new CurvesEditor('curvesCanvas');
    
    // OPTIMIZACIÓN FASE 1: Usar CircularBuffer en lugar de arrays
    const fpsHistory = new CircularBuffer(30);
    const frameTimeHistory = new CircularBuffer(30);
    
    // OPTIMIZACIÓN FASE 1: Función para activar redibujado
    window.triggerRedraw = triggerRedraw = () => {
      needsRedraw = true;
      p.redraw();
    };
    
    p.setup = () => {
      canvas = p.createCanvas(400, 225);
      // FIX: Agregar willReadFrequently al contexto del canvas principal
      canvas.elt.getContext('2d', { 
        willReadFrequently: true,
        alpha: false
      });
      canvas.parent('canvasContainer');
      p.pixelDensity(1);
      
      // ✨ FIX PARA ESCALA: Renderizado pixelado sin blur
      p.noSmooth(); // Desactiva antialiasing en p5.js
      canvas.elt.style.imageRendering = 'pixelated'; // Fuerza nearest-neighbor en CSS
      
      p.textFont('monospace');
      p.textStyle(p.BOLD);
      p.textAlign(p.CENTER, p.CENTER);
      p.textSize(20);
      
      // ========== INICIALIZAR MÓDULOS V7 ==========
      // Inicializar MediaManager
      if (window.MediaManager && window.mediaManager) {
        window.mediaManager.setP5Instance(p);
      }
      
      // Inicializar ExportManager
      if (window.ExportManager && window.exportManager) {
        window.exportManager.setP5Instance(p);
      }
      
      // Inicializar UIController
      if (window.UIController && window.uiController) {
        // Ya está inicializado desde main.js
      }
      // ============================================
      
      // OPTIMIZACIÓN FASE 1: Desactivar loop automático
      p.noLoop();
      
      const colors = appState.get('config.colors');
      const p5colors = colorCache.getColors(colors);
      lumaLUT.build(p5colors, p);
      
      ui.init();
      initializeEventListeners();
      ui.updateColorPickers(appState, colorCache, lumaLUT, p);
      ui.updatePanelsVisibility(appState.get('config'));
      updatePresetList();
      setupKeyboardShortcuts();
      
      // Primera vez dibujar
      triggerRedraw();
    };
    
    p.draw = () => {
      // OPTIMIZACIÓN FASE 1: Lógica de lazy draw
      const mediaType = appState.get('media.type');
      if (mediaType === 'image' && !needsRedraw) {
        return;
      }
      
      p.background(0);
      
      const media = appState.get('media.file');
      if (!media) {
        p.fill(128);
        p.text('Arrastra un video o imagen\npara comenzar', p.width/2, p.height/2);
        updateFrameStats();
        needsRedraw = false;
        return;
      }
      
      if (mediaType === 'video' && appState.get('timeline.loopSection') && 
          appState.get('timeline.markerInTime') !== null && appState.get('timeline.markerOutTime') !== null) {
        const currentTime = media.time();
        if (currentTime >= appState.get('timeline.markerOutTime')) {
          media.time(appState.get('timeline.markerInTime'));
        }
      }
      
      // Actualizar las LUTs de las curvas en el estado de la app
      appState.set('config.curvesLUTs', curvesEditor.getAllLUTs());

      const cfg = appState.get('config');
      const isDitheringActive = cfg.effect !== 'none';
      
      if (isDitheringActive) {
        const p5colors = colorCache.getColors(cfg.colors);
        if (lumaLUT.needsRebuild(p5colors)) lumaLUT.build(p5colors, p);
        
        const pw = Math.floor(p.width / cfg.ditherScale);
        const ph = Math.floor(p.height / cfg.ditherScale);
        const buffer = bufferPool.get(pw, ph, p);
        
        if (cfg.effect === 'posterize') {
          drawPosterize(p, buffer, media, p.width, p.height, cfg, lumaLUT);
        } else if (cfg.effect === 'blue-noise') {
          drawBlueNoise(p, buffer, media, p.width, p.height, cfg, lumaLUT, blueNoiseLUT);
        } else if (cfg.effect === 'variable-error') {
          drawVariableError(p, buffer, media, p.width, p.height, cfg, lumaLUT);
        } else {
          drawDither(p, buffer, media, p.width, p.height, cfg, lumaLUT, bayerLUT);
        }
        
        p.image(buffer, 0, 0, p.width, p.height);
      } else {
        // AUNQUE NO HAYA DITHERING, SE PUEDEN APLICAR AJUSTES DE IMAGEN
        const buffer = bufferPool.get(p.width, p.height, p);
        buffer.image(media, 0, 0, p.width, p.height);
        buffer.loadPixels();
        applyImageAdjustments(buffer.pixels, cfg);
        buffer.updatePixels();
        p.image(buffer, 0, 0, p.width, p.height);
      }
      
      if (updateTimelineUI && mediaType === 'video') updateTimelineUI();
      updateFrameStats();
      
      if (mediaType === 'image') {
        needsRedraw = false;
      }
    };

    async function generatePaletteFromMedia(media, colorCount) {
        ui.elements.status.textContent = 'Analizando colores...';
        showToast('Generando paleta desde el medio...');

        const tempCanvas = p.createGraphics(100, 100);
        tempCanvas.pixelDensity(1);

        const mediaType = appState.get('media.type');
        if (mediaType === 'video') {
            media.pause();
            media.time(0);
            await new Promise(r => setTimeout(r, 200));
        }
        tempCanvas.image(media, 0, 0, tempCanvas.width, tempCanvas.height);
        tempCanvas.loadPixels();
        
        const pixels = [];
        for (let i = 0; i < tempCanvas.pixels.length; i += 4) {
            pixels.push([tempCanvas.pixels[i], tempCanvas.pixels[i+1], tempCanvas.pixels[i+2]]);
        }

        const colorDist = (c1, c2) => {
          const dr = c1[0] - c2[0];
          const dg = c1[1] - c2[1];
          const db = c1[2] - c2[2];
          return Math.sqrt(dr * dr + dg * dg + db * db);
        };
        
        let centroids = [];
        centroids.push([...pixels[Math.floor(Math.random() * pixels.length)]]);
        
        while (centroids.length < colorCount) {
          const distances = pixels.map(p => {
            let minDist = Infinity;
            for (const c of centroids) {
              minDist = Math.min(minDist, colorDist(p, c));
            }
            return minDist * minDist;
          });
          
          const sumDist = distances.reduce((a, b) => a + b, 0);
          let rand = Math.random() * sumDist;
          
          for (let i = 0; i < pixels.length; i++) {
            rand -= distances[i];
            if (rand <= 0) {
              centroids.push([...pixels[i]]);
              break;
            }
          }
        }
        
        const assignments = new Array(pixels.length);
        let previousCentroids = null;
        
        const centroidsEqual = (a, b, threshold = 1) => {
          return a.every((c, i) => 
            Math.abs(c[0] - b[i][0]) < threshold &&
            Math.abs(c[1] - b[i][1]) < threshold &&
            Math.abs(c[2] - b[i][2]) < threshold
          );
        };
        
        for (let iter = 0; iter < 10; iter++) {
            for (let i = 0; i < pixels.length; i++) {
                let minDist = Infinity;
                let bestCentroid = 0;
                for (let j = 0; j < centroids.length; j++) {
                    const dist = colorDist(pixels[i], centroids[j]);
                    if (dist < minDist) {
                        minDist = dist;
                        bestCentroid = j;
                    }
                }
                assignments[i] = bestCentroid;
            }

            const newCentroids = new Array(colorCount).fill(0).map(() => [0,0,0]);
            const counts = new Array(colorCount).fill(0);
            
            for (let i = 0; i < pixels.length; i++) {
                const centroidIndex = assignments[i];
                newCentroids[centroidIndex][0] += pixels[i][0];
                newCentroids[centroidIndex][1] += pixels[i][1];
                newCentroids[centroidIndex][2] += pixels[i][2];
                counts[centroidIndex]++;
            }

            for (let i = 0; i < centroids.length; i++) {
                if (counts[i] > 0) {
                    centroids[i] = [
                        Math.round(newCentroids[i][0] / counts[i]),
                        Math.round(newCentroids[i][1] / counts[i]),
                        Math.round(newCentroids[i][2] / counts[i])
                    ];
                }
            }
            
            if (previousCentroids && centroidsEqual(centroids, previousCentroids)) {
                console.log(`K-Means convergió en ${iter + 1} iteraciones`);
                break;
            }
            previousCentroids = centroids.map(c => [...c]);
        }
        
        tempCanvas.remove();
        
        const toHex = c => '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
        centroids.sort((a,b) => (a[0]*0.299 + a[1]*0.587 + a[2]*0.114) - (b[0]*0.299 + b[1]*0.587 + b[2]*0.114));

        return centroids.map(toHex);
    }
    
       function calculateCanvasDimensions(mediaWidth, mediaHeight) {
        const container = document.getElementById('canvasContainer');
  
        let containerWidth = container.clientWidth || window.innerWidth;
        let containerHeight = container.clientHeight || window.innerHeight;
  
        if (containerWidth < 100) containerWidth = 800;
        if (containerHeight < 100) containerHeight = 600;
  
  // CAMBIO: Reducir padding de 64 a 16 para aprovechar más espacio
        const padding = 16;
        const availableWidth = containerWidth - padding;
        const availableHeight = containerHeight - padding;
  
        if (availableWidth <= 0 || availableHeight <= 0) {
        console.warn('Dimensiones de contenedor inválidas, usando valores por defecto');
        return { width: 400, height: 225 };
  }
  
  const mediaAspect = mediaWidth / mediaHeight;
  const containerAspect = availableWidth / availableHeight;
  
  let canvasW, canvasH;
  
  if (mediaAspect > containerAspect) {
    // CAMBIO: Usar el espacio disponible directamente, sin limitar al tamaño del media
    canvasW = availableWidth;
    canvasH = canvasW / mediaAspect;
  } else {
    canvasH = availableHeight;
    canvasW = canvasH * mediaAspect;
  }
  
  // CAMBIO: Asegurar que no exceda el contenedor pero sin límite artificial
  canvasW = Math.min(availableWidth, Math.max(100, Math.floor(canvasW)));
  canvasH = Math.min(availableHeight, Math.max(100, Math.floor(canvasH)));
  
  console.log(`📐 Canvas dimensions: ${canvasW}x${canvasH} (media: ${mediaWidth}x${mediaHeight}, container: ${containerWidth}x${containerHeight})`);
  
  return { width: canvasW, height: canvasH };
}
      
      const mediaAspect = mediaWidth / mediaHeight;
      const containerAspect = availableWidth / availableHeight;
      
      let canvasW, canvasH;
      
      if (mediaAspect > containerAspect) {
        canvasW = Math.min(mediaWidth, availableWidth);
        canvasH = canvasW / mediaAspect;
      } else {
        canvasH = Math.min(mediaHeight, availableHeight);
        canvasW = canvasH * mediaAspect;
      }
      
      canvasW = Math.max(100, Math.floor(canvasW));
      canvasH = Math.max(100, Math.floor(canvasH));
      
      console.log(`📐 Canvas dimensions: ${canvasW}x${canvasH} (media: ${mediaWidth}x${mediaHeight}, container: ${containerWidth}x${containerHeight})`);
      
      return { width: canvasW, height: canvasH };
    }

    function initializeEventListeners() {
      // Drag & Drop
      document.body.addEventListener("dragover", e => {
        e.preventDefault();
        ui.elements.dropZone.classList.add("border-cyan-400");
      });
      document.body.addEventListener("dragleave", () => ui.elements.dropZone.classList.remove("border-cyan-400"));
      document.body.addEventListener("drop", e => {
        e.preventDefault();
        ui.elements.dropZone.classList.remove("border-cyan-400");
        if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
      });
      
      ui.elements.dropZone.addEventListener("click", () => ui.elements.fileInput.click());
      ui.elements.fileInput.addEventListener("change", e => {
        if (e.target.files.length > 0) handleFile(e.target.files[0]);
      });
      
      // Controles
      ui.elements.playBtn.addEventListener("click", togglePlay);
      ui.elements.restartBtn.addEventListener("click", () => {
        const media = appState.get('media.file');
        const mediaType = appState.get('media.type');
        if (media && mediaType === 'video') {
          media.time(0);
          setTimeout(triggerRedraw, 50);
          showToast('Reiniciado');
        }
      });
      
      ui.elements.effectSelect.addEventListener("change", e => {
        appState.set('config.effect', e.target.value);
        ui.updatePanelsVisibility(appState.get('config'));
        triggerRedraw();
      });
      
      ui.elements.monochromeToggle.addEventListener("change", e => {
        appState.set('config.isMonochrome', e.target.checked);
        ui.updateColorPickers(appState, colorCache, lumaLUT, p, true);
        triggerRedraw();
      });
      
      const debouncedColorCountChange = debounce((value) => {
        appState.set('config.colorCount', parseInt(value));
        ui.updateColorPickers(appState, colorCache, lumaLUT, p, true);
        triggerRedraw();
      }, 100);
      
      ui.elements.colorCountSlider.addEventListener("input", e => {
        ui.elements.colorCountVal.textContent = e.target.value;
        debouncedColorCountChange(e.target.value);
      });
      
      ui.elements.originalColorToggle.addEventListener("change", e => {
        appState.set('config.useOriginalColor', e.target.checked);
        ui.togglePaletteControls(e.target.checked);
        triggerRedraw();
      });

      const brightnessHandler = throttle(e => {
        const value = parseInt(e.target.value);
        appState.set('config.brightness', value);
        ui.elements.brightnessVal.textContent = value;
        triggerRedraw();
      }, 16);

      const contrastHandler = throttle(e => {
        const value = parseInt(e.target.value);
        appState.set('config.contrast', value / 100);
        ui.elements.contrastVal.textContent = value;
        triggerRedraw();
      }, 16);

      const saturationHandler = throttle(e => {
        const value = parseInt(e.target.value);
        appState.set('config.saturation', value / 100);
        ui.elements.saturationVal.textContent = value;
        triggerRedraw();
      }, 16);

      ui.elements.brightnessSlider.addEventListener('input', brightnessHandler);
      ui.elements.contrastSlider.addEventListener('input', contrastHandler);
      ui.elements.saturationSlider.addEventListener('input', saturationHandler);

      ui.elements.resetImageAdjustmentsBtn.addEventListener('click', () => {
        appState.setMultiple({
          'config.brightness': 0,
          'config.contrast': 1.0,
          'config.saturation': 1.0
        });
        ui.elements.brightnessSlider.value = 0;
        ui.elements.contrastSlider.value = 100;
        ui.elements.saturationSlider.value = 100;
        ui.elements.brightnessVal.textContent = 0;
        ui.elements.contrastVal.textContent = 100;
        ui.elements.saturationVal.textContent = 100;
        curvesEditor.resetAllChannels();
        triggerRedraw();
        showToast('Ajustes de imagen reseteados');
      });
      
      const toggleCurvesBtn = document.getElementById('toggleCurvesBtn');
      const basicControls = document.getElementById('basicImageControls');
      const curvesEditorEl = document.getElementById('curvesEditor');

      toggleCurvesBtn.addEventListener('click', () => {
        basicControls.classList.toggle('hidden');
        curvesEditorEl.classList.toggle('hidden');
        
        if (!curvesEditorEl.classList.contains('hidden')) {
          curvesEditor.render();
        }
      });
      
      document.querySelectorAll('.curve-channel-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          document.querySelectorAll('.curve-channel-btn').forEach(b => b.classList.remove('active'));
          e.target.classList.add('active');
          curvesEditor.setChannel(e.target.dataset.channel);
        });
      });
      
      document.getElementById('resetCurveBtn').addEventListener('click', () => {
        curvesEditor.resetChannel(curvesEditor.currentChannel);
        triggerRedraw();
      });
      
      document.getElementById('resetAllCurvesBtn').addEventListener('click', () => {
        curvesEditor.resetAllChannels();
        triggerRedraw();
      });

      const ditherScaleHandler = throttle(e => {
        appState.set('config.ditherScale', parseInt(e.target.value));
        ui.elements.ditherScaleVal.textContent = e.target.value;
        triggerRedraw();
      }, 16);
      
      ui.elements.ditherScale.addEventListener("input", ditherScaleHandler);
      
      ui.elements.serpentineToggle.addEventListener("change", e => {
        appState.set('config.serpentineScan', e.target.checked);
        triggerRedraw();
      });
      
      const diffusionHandler = throttle(e => {
        appState.set('config.diffusionStrength', parseInt(e.target.value) / 100);
        ui.elements.diffusionStrengthVal.textContent = e.target.value;
        triggerRedraw();
      }, 16);
      
      ui.elements.diffusionStrengthSlider.addEventListener("input", diffusionHandler);
      
      const patternHandler = throttle(e => {
        appState.set('config.patternStrength', parseInt(e.target.value) / 100);
        ui.elements.patternStrengthVal.textContent = e.target.value;
        triggerRedraw();
      }, 16);
      
      ui.elements.patternStrengthSlider.addEventListener("input", patternHandler);
      
      // Timeline
      ui.elements.setInBtn.addEventListener('click', () => {
        const media = appState.get('media.file');
        const mediaType = appState.get('media.type');
        if (media && mediaType === 'video') {
          const currentTime = media.time();
          appState.set('timeline.markerInTime', currentTime);
          showToast(`Entrada: ${formatTime(currentTime)}`);
        }
      });
      
      ui.elements.setOutBtn.addEventListener('click', () => {
        const media = appState.get('media.file');
        const mediaType = appState.get('media.type');
        if (media && mediaType === 'video') {
          const currentTime = media.time();
          appState.set('timeline.markerOutTime', currentTime);
          showToast(`Salida: ${formatTime(currentTime)}`);
        }
      });
      
      ui.elements.clearMarkersBtn.addEventListener('click', () => {
        appState.setMultiple({
          'timeline.markerInTime': null,
          'timeline.markerOutTime': null
        });
        showToast('Marcadores limpiados');
      });
      
      ui.elements.loopSectionToggle.addEventListener('change', e => {
        appState.set('timeline.loopSection', e.target.checked);
      });
      
      ui.elements.playbackSpeedSlider.addEventListener('input', e => {
        const speed = parseInt(e.target.value) / 100;
        const media = appState.get('media.file');
        const mediaType = appState.get('media.type');
        if (media && mediaType === 'video') {
          media.speed(speed);
          appState.set('media.playbackSpeed', speed);
        }
        ui.elements.playbackSpeedVal.textContent = speed.toFixed(2);
      });
      
      document.querySelectorAll('.speed-preset').forEach(btn => {
        btn.addEventListener('click', () => {
          const speed = parseInt(btn.dataset.speed) / 100;
          ui.elements.playbackSpeedSlider.value = speed * 100;
          const media = appState.get('media.file');
          const mediaType = appState.get('media.type');
          if (media && mediaType === 'video') {
            media.speed(speed);
            appState.set('media.playbackSpeed', speed);
          }
          ui.elements.playbackSpeedVal.textContent = speed.toFixed(2);
        });
      });
      
      ui.elements.prevFrameBtn.addEventListener('click', () => {
        const media = appState.get('media.file');
        const mediaType = appState.get('media.type');
        if (!media || mediaType !== 'video') return;
        media.pause();
        appState.set('media.isPlaying', false);
        ui.elements.playBtn.textContent = 'Play';
        media.time(Math.max(0, media.time() - 1/30));
        setTimeout(triggerRedraw, 50);
      });
      
      ui.elements.nextFrameBtn.addEventListener('click', () => {
        const media = appState.get('media.file');
        const mediaType = appState.get('media.type');
        if (!media || mediaType !== 'video') return;
        media.pause();
        appState.set('media.isPlaying', false);
        ui.elements.playBtn.textContent = 'Play';
        media.time(Math.min(media.duration(), media.time() + 1/30));
        setTimeout(triggerRedraw, 50);
      });
      
      // Exportación
ui.elements.recBtn.addEventListener("click", startRecording);
ui.elements.stopBtn.addEventListener("click", stopRecording);
ui.elements.downloadImageBtn.addEventListener("click", () => {
  const media = appState.get('media.file');
  if (media) p.saveCanvas(canvas, `dithering_${appState.get('config.effect')}_${Date.now()}`, 'png');
});

ui.elements.gifFpsSlider.addEventListener('input', e => {
  ui.elements.gifFpsVal.textContent = e.target.value;
});

ui.elements.gifQualitySlider.addEventListener('input', e => {
  ui.elements.gifQualityVal.textContent = e.target.value;
});

ui.elements.exportGifBtn.addEventListener('click', exportGif);

ui.elements.spriteColsSlider.addEventListener('input', e => {
  ui.elements.spriteCols.textContent = e.target.value;
});

ui.elements.spriteFrameCountSlider.addEventListener('input', e => {
  ui.elements.spriteFrameCount.textContent = e.target.value;
});

ui.elements.exportSpriteBtn.addEventListener('click', () => {
  const media = appState.get('media.file');
  const mediaType = appState.get('media.type');
  if (media && mediaType === 'video') {
    const cols = parseInt(ui.elements.spriteColsSlider.value);
    const frameCount = parseInt(ui.elements.spriteFrameCountSlider.value);
    exportSpriteSheet(p, media, cols, frameCount);
  }
});

ui.elements.exportSequenceBtn.addEventListener('click', () => {
  const media = appState.get('media.file');
  const mediaType = appState.get('media.type');
  if (media && mediaType === 'video') {
    const startTime = appState.get('timeline.markerInTime') || 0;
    const endTime = appState.get('timeline.markerOutTime') || media.duration();
    exportPNGSequence(p, media, startTime, endTime, 15);
  }
});

// Actualizar info de tamaño de exportación
document.querySelectorAll('input[name="exportSize"]').forEach(radio => {
  radio.addEventListener('change', (e) => {
    const media = appState.get('media.file');
    const infoEl = document.getElementById('exportSizeInfo');
    
    if (!media || !infoEl) return;
    
    const value = e.target.value;
    
    if (value === 'canvas') {
      infoEl.textContent = `${p.width} × ${p.height}px`;
    } else if (value === 'large') {
      const maxDim = 1024;
      let w, h;
      if (media.width > media.height) {
        w = maxDim;
        h = Math.floor(media.height * (maxDim / media.width));
      } else {
        h = maxDim;
        w = Math.floor(media.width * (maxDim / media.height));
      }
      infoEl.textContent = `${w} × ${h}px`;
    } else if (value === 'original') {
      infoEl.textContent = `${media.width} × ${media.height}px (Original)`;
    }
  });
});

// Presets
ui.elements.savePresetBtn.addEventListener("click", () => {
  const name = ui.elements.presetNameInput.value.trim();
  if (name) {
    const presets = JSON.parse(localStorage.getItem("dither_presets") || "{}");
    const config = appState.get('config');
    presets[name] = { ...config, curves: curvesEditor.curves };
    localStorage.setItem("dither_presets", JSON.stringify(presets));
    ui.elements.presetNameInput.value = "";
    updatePresetList();
    showToast(`Preset "${name}" guardado`);
  }
});

ui.elements.deletePresetBtn.addEventListener("click", () => {
  const name = ui.elements.presetSelect.value;
  if (name) {
    const presets = JSON.parse(localStorage.getItem("dither_presets") || "{}");
    delete presets[name];
    localStorage.setItem("dither_presets", JSON.stringify(presets));
    updatePresetList();
    showToast(`Preset "${name}" eliminado`);
  }
});

ui.elements.presetSelect.addEventListener("change", e => {
  if (e.target.value) applyPreset(e.target.value);
});
      
      // Modals
      ui.elements.shortcutsBtn.addEventListener('click', () => {
        ui.elements.shortcutsModal.style.display = 'flex';
      });
      
      ui.elements.closeShortcutsBtn.addEventListener('click', () => {
        ui.elements.shortcutsModal.style.display = 'none';
      });
      
      ui.elements.shortcutsModal.addEventListener('click', (e) => {
        if (e.target === ui.elements.shortcutsModal) ui.elements.shortcutsModal.style.display = 'none';
      });
      
      ui.elements.metricsBtn.addEventListener('click', () => {
        ui.elements.metricsModal.style.display = 'flex';
      });
      
      ui.elements.closeMetricsBtn.addEventListener('click', () => {
        ui.elements.metricsModal.style.display = 'none';
      });
      
      ui.elements.metricsModal.addEventListener('click', (e) => {
        if (e.target === ui.elements.metricsModal) ui.elements.metricsModal.style.display = 'none';
      });
      
      ui.elements.updateMetricsBtn.addEventListener('click', updateMetrics);
      
      // ========== INTEGRACIÓN CON EXPORTMANAGER ==========
      if (window.exportManager) {
        // PNG
        eventBus.on('export:png', () => {
          exportManager.exportPNG();
        });
        
        // WebM
        eventBus.on('export:webm-start', (options) => {
          exportManager.startWebMRecording(options);
        });
        
        eventBus.on('export:webm-stop', () => {
          exportManager.stopWebMRecording();
        });
        
        // GIF
        eventBus.on('export:gif', async (options) => {
          await exportManager.exportGIF(options);
        });
        
        // Sprite Sheet
        eventBus.on('export:sprite-sheet', async (options) => {
          await exportManager.exportSpriteSheet(options);
        });
        
        // PNG Sequence
        eventBus.on('export:png-sequence', async () => {
          const startTime = appState.get('timeline.markerInTime') || 0;
          const media = appState.get('media.file');
          const endTime = appState.get('timeline.markerOutTime') || media.duration();
          await exportManager.exportPNGSequence(15, startTime, endTime);
        });
        
        // Listeners de progreso
        eventBus.on('export:started', (data) => {
          console.log('Exportación iniciada:', data.type);
          ui.elements.status.textContent = `Exportando ${data.type}...`;
        });
        
        eventBus.on('export:progress', (data) => {
          if (data.type === 'gif' && ui.elements.gifProgress) {
            ui.elements.gifProgress.classList.remove('hidden');
            if (ui.elements.gifProgressText) {
              ui.elements.gifProgressText.textContent = `${Math.round(data.progress * 100)}%`;
            }
            if (ui.elements.gifProgressBar) {
              ui.elements.gifProgressBar.style.width = `${data.progress * 100}%`;
            }
          }
        });
        
        eventBus.on('export:completed', (data) => {
          console.log('Exportación completada:', data.type);
          ui.elements.status.textContent = `${data.type.toUpperCase()} exportado`;
          
          if (data.type === 'gif' && ui.elements.gifProgress) {
            setTimeout(() => {
              ui.elements.gifProgress.classList.add('hidden');
            }, 2000);
          }
        });
        
        eventBus.on('export:error', (data) => {
          console.error('Error en exportación:', data.message);
          showToast(`Error: ${data.message}`);
        });
      }
      // ==================================================
    }
    
    async function handleFile(file) {
      // Usar MediaManager si está disponible
      if (window.mediaManager) {
        try {
          await window.mediaManager.loadFile(file);
          
          // El MediaManager emitirá eventos, suscribirse a ellos
          eventBus.on('media:loaded', async (mediaInfo) => {
            console.log('Media cargado:', mediaInfo);
            
            // Redimensionar canvas
            const { width: canvasW, height: canvasH } = calculateCanvasDimensions(
              mediaInfo.resizedWidth, 
              mediaInfo.resizedHeight
            );
            p.resizeCanvas(canvasW, canvasH);
            
            // Generar paleta
            const media = appState.get('media.file');
            const colorCount = appState.get('config.colorCount');
            const newPalette = await generatePaletteFromMedia(media, colorCount);
            appState.set('config.colors', newPalette);
            ui.updateColorPickers(appState, colorCache, lumaLUT, p);
            
            // Actualizar UI
            ui.elements.status.textContent = mediaInfo.type === 'video' ? 'Video cargado' : 'Imagen cargada';
            
            if (mediaInfo.type === 'video') {
              updateTimelineUI = setupTimeline();
              p.loop();
            } else {
              p.noLoop();
            }
            
            triggerRedraw();
            showToast(mediaInfo.type === 'video' ? 'Video cargado' : 'Imagen cargada');
          });
          
        } catch (error) {
          console.error('Error cargando archivo:', error);
          showToast('Error al cargar archivo');
        }
        return;
      }
      
      // FALLBACK: Código original si MediaManager no está disponible
      const media = appState.get('media.file');
      if (media) {
        const mediaType = appState.get('media.type');
        if (mediaType === 'video') {
          media.pause();
          media.remove();
        }
        appState.setMultiple({
          'media.file': null,
          'media.type': null
        });
      }
      
      if (currentFileURL) {
        URL.revokeObjectURL(currentFileURL);
        currentFileURL = null;
      }
      
      const fileType = file.type;
      const isVideo = fileType.startsWith('video/');
      const isImage = fileType.startsWith('image/');
      
      if (!isVideo && !isImage) {
        showToast('Formato no soportado');
        return;
      }
      
      currentFileURL = URL.createObjectURL(file);
      appState.set('media.type', isVideo ? 'video' : 'image');
      
      if (isVideo) {
        const videoMedia = p.createVideo([currentFileURL], async () => {
          const maxDim = 2048;
          let w = videoMedia.width;
          let h = videoMedia.height;
          
          if (w > maxDim || h > maxDim) {
            if (w > h) { h = Math.floor(h * (maxDim / w)); w = maxDim; }
            else { w = Math.floor(w * (maxDim / h)); h = maxDim; }
          }
          
          const { width: canvasW, height: canvasH } = calculateCanvasDimensions(w, h);
          p.resizeCanvas(canvasW, canvasH);
          
          appState.setMultiple({
            'media.file': videoMedia,
            'media.isPlaying': false
          });

          const colorCount = appState.get('config.colorCount');
          const newPalette = await generatePaletteFromMedia(videoMedia, colorCount);
          appState.set('config.colors', newPalette);
          ui.updateColorPickers(appState, colorCache, lumaLUT, p);

          videoMedia.volume(0);
          videoMedia.speed(appState.get('media.playbackSpeed'));
          ui.elements.playBtn.textContent = 'Play';
          ui.elements.playBtn.disabled = false;
          ui.elements.recBtn.disabled = false;
          ui.elements.mediaType.textContent = 'VIDEO';
          ui.elements.mediaType.className = 'bg-blue-600 px-2 py-1 rounded text-xs';
          ui.elements.mediaDimensions.textContent = `${videoMedia.width}x${videoMedia.height} - ${formatTime(videoMedia.duration())}`;
          ui.elements.timelinePanel.classList.remove('hidden');
          ui.elements.gifExportPanel.classList.remove('hidden');
          ui.elements.spriteSheetPanel.classList.remove('hidden');
          ui.elements.exportSequenceBtn.classList.remove('hidden');
          updateTimelineUI = setupTimeline();
          ui.elements.status.textContent = 'Listo';
          
          p.loop();
          
          showToast('Video cargado');
          triggerRedraw();
        });
        videoMedia.hide();
        
      } else {
        const imageMedia = p.loadImage(currentFileURL, async () => {
          const maxDim = 2048;
          let w = imageMedia.width;
          let h = imageMedia.height;
          
          if (w > maxDim || h > maxDim) {
            if (w > h) { h = Math.floor(h * (maxDim / w)); w = maxDim; }
            else { w = Math.floor(w * (maxDim / h)); h = maxDim; }
            imageMedia.resize(w, h);
          }
          
          const { width: canvasW, height: canvasH } = calculateCanvasDimensions(w, h);
          p.resizeCanvas(canvasW, canvasH);
          
          appState.set('media.file', imageMedia);

          const colorCount = appState.get('config.colorCount');
          const newPalette = await generatePaletteFromMedia(imageMedia, colorCount);
          appState.set('config.colors', newPalette);
          ui.updateColorPickers(appState, colorCache, lumaLUT, p);
          
          ui.elements.playBtn.textContent = 'N/A';
          ui.elements.playBtn.disabled = true;
          ui.elements.recBtn.disabled = true;
          ui.elements.mediaType.textContent = 'IMAGEN';
          ui.elements.mediaType.className = 'bg-purple-600 px-2 py-1 rounded text-xs';
          ui.elements.mediaDimensions.textContent = `${w}x${h}`;
          ui.elements.timelinePanel.classList.add('hidden');
          ui.elements.gifExportPanel.classList.add('hidden');
          ui.elements.spriteSheetPanel.classList.add('hidden');
          ui.elements.exportSequenceBtn.classList.add('hidden');
          ui.elements.status.textContent = 'Imagen cargada';
          
          p.noLoop();
          
          showToast('Imagen cargada');
          triggerRedraw();
        });
      }
    }

    function togglePlay() {
      // Usar MediaManager si está disponible
      if (window.mediaManager) {
        mediaManager.togglePlay();
        return;
      }
      
      // FALLBACK: Código original
      const media = appState.get('media.file');
      const mediaType = appState.get('media.type');
      if (!media || mediaType !== 'video') return;
      
      const isPlaying = appState.get('media.isPlaying');
      if (isPlaying) {
        media.pause();
        ui.elements.playBtn.textContent = 'Play';
        showToast('Pausado');
        appState.set('media.isPlaying', false);
      } else {
        media.loop();
        ui.elements.playBtn.textContent = 'Pause';
        showToast('Reproduciendo');
        appState.set('media.isPlaying', true);
      }
    }

    function startRecording() {
      const media = appState.get('media.file');
      const mediaType = appState.get('media.type');
      const isRecording = appState.get('media.isRecording') || false;
      
      if (isRecording || !media || mediaType !== 'video') return;
      
      originalDitherScale = appState.get('config.ditherScale');
      originalCanvasWidth = p.width;
      originalCanvasHeight = p.height;
      
      let startTime = 0;
      let endTime = media.duration();
      
      const useMarkers = ui.elements.webmUseMarkersToggle && ui.elements.webmUseMarkersToggle.checked;
      
      if (useMarkers) {
        const markerIn = appState.get('timeline.markerInTime');
        const markerOut = appState.get('timeline.markerOutTime');
        if (markerIn !== null) startTime = markerIn;
        if (markerOut !== null) endTime = markerOut;
      }
      
      media.time(startTime);
      
      const maxDimension = 1080;
      let exportWidth = media.width;
      let exportHeight = media.height;
      
      const longestSide = Math.max(exportWidth, exportHeight);
      if (longestSide > maxDimension) {
        const scale = maxDimension / longestSide;
        exportWidth = Math.floor(exportWidth * scale);
        exportHeight = Math.floor(exportHeight * scale);
      }
      
      p.resizeCanvas(exportWidth, exportHeight);
      
      const isPlaying = appState.get('media.isPlaying');
      if (!isPlaying) {
        media.loop();
        appState.set('media.isPlaying', true);
        ui.elements.playBtn.textContent = 'Pause';
        p.loop();
      }
      
      appState.set('media.isRecording', true);
      chunks = [];
      
      const stream = canvas.elt.captureStream(30);
      recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 12000000
      });
      
      recorder.ondataavailable = ev => { if (ev.data.size > 0) chunks.push(ev.data); };
      
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dithering_${appState.get('config.effect')}_${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 100);
        
        p.resizeCanvas(originalCanvasWidth, originalCanvasHeight);
        
        ui.elements.status.textContent = 'WebM descargado';
        ui.elements.recBtn.disabled = false;
        ui.elements.stopBtn.classList.add('hidden');
        ui.elements.recIndicator.classList.add('hidden');
        showToast('Video exportado');
      };
      
      let checkInterval = null;
      if (useMarkers && endTime !== null) {
        checkInterval = setInterval(() => {
          if (media.time() >= endTime) stopRecording();
        }, 100);
      }
      
      recorder.checkInterval = checkInterval;
      recorder.start();
      ui.elements.recBtn.disabled = true;
      ui.elements.stopBtn.classList.remove('hidden');
      ui.elements.status.textContent = 'Grabando...';
      ui.elements.recIndicator.classList.remove('hidden');
    }
    
    function stopRecording() {
      const isRecording = appState.get('media.isRecording');
      if (!isRecording || !recorder) return;
      if (recorder.checkInterval) {
        clearInterval(recorder.checkInterval);
        recorder.checkInterval = null;
      }
      if (recorder.state !== 'inactive') recorder.stop();
      appState.set('media.isRecording', false);
    }
    
    async function exportGif() {
      const media = appState.get('media.file');
      const mediaType = appState.get('media.type');
      if (!media || mediaType !== 'video') return;
      
      const fps = parseInt(ui.elements.gifFpsSlider.value);
      const useMarkers = ui.elements.gifUseMarkersToggle.checked;
      
      let startTime = 0;
      let endTime = media.duration();
      
      if (useMarkers) {
        const markerIn = appState.get('timeline.markerInTime');
        const markerOut = appState.get('timeline.markerOutTime');
        if (markerIn !== null) startTime = markerIn;
        if (markerOut !== null) endTime = markerOut;
      }
      
      ui.elements.exportGifBtn.disabled = true;
      ui.elements.gifProgress.classList.remove('hidden');
      
      try {
        const config = appState.get('config');
        const blob = await exportGifCore(p, media, config, startTime, endTime, fps, progress => {
          const percent = Math.round(progress * 100);
          ui.elements.gifProgressText.textContent = `${percent}%`;
          ui.elements.gifProgressBar.style.width = `${percent}%`;
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dithering_${config.effect}_${Date.now()}.gif`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 100);
        
        showToast('GIF exportado');
      } catch (error) {
        console.error('Error:', error);
        showToast('Error al exportar GIF');
      }
      
      ui.elements.exportGifBtn.disabled = false;
      ui.elements.gifProgress.classList.add('hidden');
    }

    function updateMetrics() {
      const media = appState.get('media.file');
      if (!media) { showToast('Carga un medio primero'); return; }
      
      const origBuffer = p.createGraphics(p.width, p.height);
      origBuffer.pixelDensity(1);
      origBuffer.image(media, 0, 0, p.width, p.height);
      
      const processedBuffer = p.get();
      
      const psnr = calculatePSNR(origBuffer, processedBuffer);
      const ssim = calculateSSIM(origBuffer, processedBuffer);
      const compression = calculateCompression(processedBuffer);
      
      appState.setMultiple({
        'metrics.psnr': psnr,
        'metrics.ssim': ssim,
        'metrics.compression': compression.ratio,
        'metrics.paletteSize': appState.get('config.colorCount')
      });
      
      $('metricPSNR').textContent = psnr === Infinity ? '∞ dB' : psnr.toFixed(2) + ' dB';
      $('metricSSIM').textContent = ssim.toFixed(4);
      $('metricCompression').textContent = compression.ratio.toFixed(2) + '% (' + compression.unique + ' colores únicos)';
      $('metricPaletteSize').textContent = appState.get('config.colorCount') + ' colores';
      const processTime = appState.get('metrics.processTime');
      $('metricProcessTime').textContent = processTime.toFixed(2) + ' ms';
      
      origBuffer.remove();
      showToast('Métricas actualizadas');
    }

    function setupTimeline() {
      const timeline = ui.elements.timeline;
      const scrubber = ui.elements.timelineScrubber;
      const progress = ui.elements.timelineProgress;
      const timeDisplay = ui.elements.timelineTime;
      const markerIn = ui.elements.markerIn;
      const markerOut = ui.elements.markerOut;
      
      let isDragging = false;
      let isDraggingMarker = null;
      
      timeline.addEventListener('mousedown', (e) => {
        if (e.target === markerIn || e.target === markerOut) {
          isDraggingMarker = e.target;
          return;
        }
        isDragging = true;
        updateScrubPosition(e);
      });
      
      document.addEventListener('mousemove', (e) => {
        if (isDragging) updateScrubPosition(e);
        else if (isDraggingMarker) updateMarkerPosition(e, isDraggingMarker);
      });
      
      document.addEventListener('mouseup', () => {
        isDragging = false;
        isDraggingMarker = null;
      });
      
      function updateScrubPosition(e) {
        const media = appState.get('media.file');
        if (!media) return;
        const rect = timeline.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const percent = x / rect.width;
        const time = percent * media.duration();
        media.time(time);
        triggerRedraw();
        updateTimelineUI();
      }
      
      function updateMarkerPosition(e, marker) {
        const media = appState.get('media.file');
        if (!media) return;
        const rect = timeline.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const percent = x / rect.width;
        const time = percent * media.duration();
        
        if (marker === markerIn) {
          appState.set('timeline.markerInTime', time);
          const markerOut = appState.get('timeline.markerOutTime');
          if (markerOut !== null && time > markerOut) {
            appState.set('timeline.markerOutTime', time);
          }
        } else {
          appState.set('timeline.markerOutTime', time);
          const markerIn = appState.get('timeline.markerInTime');
          if (markerIn !== null && time < markerIn) {
            appState.set('timeline.markerInTime', time);
          }
        }
        updateTimelineUI();
      }
      
      function updateTimelineUI() {
        const media = appState.get('media.file');
        if (!media || media.duration() === 0) return;
        
        const currentTime = media.time();
        const duration = media.duration();
        const percent = (currentTime / duration) * 100;
        
        scrubber.style.left = percent + '%';
        progress.style.width = percent + '%';
        timeDisplay.textContent = formatTime(currentTime);
        
        const markerInTime = appState.get('timeline.markerInTime');
        if (markerInTime !== null) {
          const inPercent = (markerInTime / duration) * 100;
          markerIn.style.left = inPercent + '%';
          markerIn.style.display = 'block';
        } else {
          markerIn.style.display = 'none';
        }
        
        const markerOutTime = appState.get('timeline.markerOutTime');
        if (markerOutTime !== null) {
          const outPercent = (markerOutTime / duration) * 100;
          markerOut.style.left = outPercent + '%';
          markerOut.style.display = 'block';
        } else {
          markerOut.style.display = 'none';
        }
      }
      
      return updateTimelineUI;
    }

    function setupKeyboardShortcuts() {
      document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
        
        const key = e.key.toLowerCase();
        
        switch(key) {
          case ' ': e.preventDefault(); togglePlay(); break;
          case 'arrowleft': e.preventDefault(); ui.elements.prevFrameBtn.click(); break;
          case 'arrowright': e.preventDefault(); ui.elements.nextFrameBtn.click(); break;
          case 'i': e.preventDefault(); ui.elements.setInBtn.click(); break;
          case 'o': e.preventDefault(); ui.elements.setOutBtn.click(); break;
          case 'r': e.preventDefault(); if (!ui.elements.recBtn.disabled) startRecording(); break;
          case 's': e.preventDefault(); if (!ui.elements.stopBtn.classList.contains('hidden')) stopRecording(); break;
          case 'd': e.preventDefault(); ui.elements.downloadImageBtn.click(); break;
          case 'f': e.preventDefault(); toggleFullscreen(); break;
          case 'm': e.preventDefault(); ui.elements.metricsModal.style.display = 'flex'; break;
          case '?': e.preventDefault(); ui.elements.shortcutsModal.style.display = 'flex'; break;
          case 'escape':
            ui.elements.shortcutsModal.style.display = 'none';
            ui.elements.metricsModal.style.display = 'none';
            break;
        }
      });
    }

    function toggleFullscreen() {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
        showToast('Pantalla completa');
      } else {
        document.exitFullscreen();
        showToast('Salir de pantalla completa');
      }
    }

    function updatePresetList() {
      const presets = JSON.parse(localStorage.getItem("dither_presets") || "{}");
      ui.elements.presetSelect.innerHTML = '<option value="">Cargar Preset...</option>';
      for (const name in presets) {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        ui.elements.presetSelect.appendChild(option);
      }
    }

    function applyPreset(name) {
      const presets = JSON.parse(localStorage.getItem("dither_presets") || "{}");
      if (!presets[name]) return;
      
      const presetData = presets[name];
      const cfg = { ...presetData };
      delete cfg.curves;

      // Aplicar configuración al state
      for (const [key, value] of Object.entries(cfg)) {
        appState.set(`config.${key}`, value);
      }
      
      if (presetData.curves) {
        curvesEditor.curves = presetData.curves;
        curvesEditor.render();
      }
      
      // Actualizar UI
      ui.elements.effectSelect.value = cfg.effect;
      ui.elements.monochromeToggle.checked = cfg.isMonochrome;
      ui.elements.originalColorToggle.checked = cfg.useOriginalColor;
      ui.elements.colorCountSlider.value = cfg.colorCount;
      ui.elements.ditherScale.value = cfg.ditherScale;
      ui.elements.serpentineToggle.checked = cfg.serpentineScan;
      ui.elements.diffusionStrengthSlider.value = cfg.diffusionStrength * 100;
      ui.elements.patternStrengthSlider.value = cfg.patternStrength * 100;
      
      ui.elements.brightnessSlider.value = cfg.brightness || 0;
      ui.elements.contrastSlider.value = (cfg.contrast || 1.0) * 100;
      ui.elements.saturationSlider.value = (cfg.saturation || 1.0) * 100;
      ui.elements.brightnessVal.textContent = cfg.brightness || 0;
      ui.elements.contrastVal.textContent = (cfg.contrast || 1.0) * 100;
      ui.elements.saturationVal.textContent = (cfg.saturation || 1.0) * 100;

      ui.elements.colorCountVal.textContent = cfg.colorCount;
      ui.elements.ditherScaleVal.textContent = cfg.ditherScale;
      ui.elements.diffusionStrengthVal.textContent = cfg.diffusionStrength * 100;
      ui.elements.patternStrengthVal.textContent = cfg.patternStrength * 100;
      
      ui.updateColorPickers(appState, colorCache, lumaLUT, p);
      ui.updatePanelsVisibility(cfg);
      ui.togglePaletteControls(cfg.useOriginalColor);
      triggerRedraw();
      showToast(`Preset "${name}" cargado`);
    }

    function updateFrameStats() {
      const fps = p.frameRate();
      fpsHistory.push(fps);
      frameTimeHistory.push(p.deltaTime);
      
      const avgFps = fpsHistory.average();
      const avgFt = frameTimeHistory.average();
      
      ui.elements.fps.textContent = isNaN(avgFps) || avgFps === 0 ? "--" : Math.round(avgFps);
      ui.elements.frameTime.textContent = isNaN(avgFt) || avgFt === 0 ? "--" : avgFt.toFixed(1);
      
      appState.set('metrics.processTime', avgFt);
      
      const mediaType = appState.get('media.type');
      const media = appState.get('media.file');
      if (mediaType === 'video' && media && media.duration() > 0) {
        ui.elements.timeDisplay.textContent = `${formatTime(media.time())} / ${formatTime(media.duration())}`;
      } else {
        ui.elements.timeDisplay.textContent = mediaType === 'image' ? 'Imagen Estática' : '00:00 / 00:00';
      }
      
      const playbackSpeed = appState.get('media.playbackSpeed');
      if (playbackSpeed !== 1 && mediaType === 'video') {
        ui.elements.speedDisplay.classList.remove('hidden');
        ui.elements.speedDisplay.querySelector('span').textContent = playbackSpeed.toFixed(2) + 'x';
      } else {
        ui.elements.speedDisplay.classList.add('hidden');
      }
      
      const effect = appState.get('config.effect');
      ui.elements.effectName.textContent = ALGORITHM_NAMES[effect] || "Desconocido";
    }
    
    setInterval(() => {
      bufferPool.cleanup(60000);
    }, 60000);
  };
  
  new p5(sketch);
});
