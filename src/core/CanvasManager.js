/**
 * @file CanvasManager.js
 * @description Gestiona la instancia, el ciclo de vida y el renderizado del canvas de p5.js.
 */

import { store } from './Store.js';
import { eventBus } from './EventBus.js';
import { ImageProcessor } from '../processors/ImageProcessor.js';
import { BufferPool } from '../utils/BufferPool.js';
import { ColorCache } from '../algorithms/utils/ColorCache.js';
import { LumaLUT } from '../algorithms/utils/LumaLUT.js';
import { BayerLUT } from '../algorithms/utils/BayerLUT.js';
import { BlueNoiseLUT } from '../algorithms/utils/BlueNoiseLUT.js';

class CanvasManager {
  constructor(containerId) {
    this.containerId = containerId;
    this.p5 = null;
    this.needsRedraw = true;
    this.bufferPool = new BufferPool();
    
    this.sketch = (p) => {
      p.setup = () => this.setup(p);
      p.draw = () => this.draw(p);
    };
  }

  /**
   * Inicializa la instancia de p5.js.
   */
  init() {
    this.p5 = new p5(this.sketch, this.containerId);
    eventBus.subscribe('state:updated', () => this.requestRedraw());
  }

  /**
   * Configuración inicial del sketch de p5.js.
   */
  setup(p) {
    const { width, height } = store.getState().canvas;
    const canvas = p.createCanvas(width, height);
    canvas.elt.getContext('2d', { willReadFrequently: true, alpha: false });
    p.pixelDensity(1);
    p.noSmooth();
    canvas.elt.style.imageRendering = 'pixelated';
    p.noLoop(); // El redibujado se controlará manualmente

    // Inicializar el procesador de imágenes con las dependencias necesarias
    this.imageProcessor = new ImageProcessor({
        colorCache: new ColorCache(p),
        lumaLUT: new LumaLUT(),
        bayerLUT: new BayerLUT(),
        blueNoiseLUT: new BlueNoiseLUT()
    });
    
    // El MediaLoader necesita la instancia de p5 para funcionar
    eventBus.publish('canvas:ready', p);
    this.requestRedraw();
  }

  /**
   * Bucle de dibujo de p5.js.
   */
  draw(p) {
    const state = store.getState();

    if (state.media.type === 'image' && !this.needsRedraw) {
      return;
    }
    this.needsRedraw = false;
    
    p.background(0);

    if (!state.media.isLoaded || !state.media.instance) {
      this.drawPlaceholder(p);
      return;
    }
    
    this.handleVideoLoop(state);

    const { ditherScale } = state.config;
    const bufferWidth = Math.floor(p.width / ditherScale);
    const bufferHeight = Math.floor(p.height / ditherScale);
    
    const buffer = this.bufferPool.get(p, bufferWidth, bufferHeight);
    
    // Dibuja el medio en el buffer a la escala correcta
    buffer.image(state.media.instance, 0, 0, bufferWidth, bufferHeight);
    
    // Aplica todo el pipeline de procesamiento al buffer
    const processedBuffer = this.imageProcessor.process(buffer, state.config);

    // Dibuja el buffer procesado en el canvas principal
    p.image(processedBuffer, 0, 0, p.width, p.height);

    eventBus.publish('canvas:drawn');
  }

  /**
   * Dibuja un mensaje cuando no hay un medio cargado.
   */
  drawPlaceholder(p) {
    p.fill(128);
    p.noStroke();
    p.textAlign(p.CENTER, p.CENTER);
    p.textSize(16);
    p.text('Arrastra un video o imagen para comenzar', p.width / 2, p.height / 2);
  }

  /**
   * Gestiona el bucle de una sección de video si está activado.
   */
  handleVideoLoop(state) {
    if (state.media.type === 'video' && state.timeline.loopSection &&
        state.timeline.markerInTime !== null && state.timeline.markerOutTime !== null) {
      const currentTime = state.media.instance.time();
      if (currentTime >= state.timeline.markerOutTime) {
        state.media.instance.time(state.timeline.markerInTime);
      }
    }
  }

  /**
   * Solicita un redibujado en el próximo ciclo de animación.
   */
  requestRedraw() {
    this.needsRedraw = true;
    if (this.p5) {
      this.p5.redraw();
    }
  }

  resize(width, height) {
      if (this.p5) {
          this.p5.resizeCanvas(width, height);
          this.requestRedraw();
      }
  }
}

export { CanvasManager };
