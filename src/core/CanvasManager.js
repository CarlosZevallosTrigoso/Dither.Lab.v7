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
    this.container = document.getElementById(containerId);
    if (!this.container) {
        throw new Error(`Contenedor con id "${containerId}" no encontrado.`);
    }
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
    this.p5 = new p5(this.sketch, this.container);
    eventBus.subscribe('state:updated', () => this.requestRedraw());
    // (NUEVO) Suscribirse al evento para redimensionar el canvas cuando se carga un nuevo medio.
    eventBus.subscribe('canvas:resize', () => this.resizeCanvasToContainer());
  }

  /**
   * Configuración inicial del sketch de p5.js.
   */
  setup(p) {
    const canvas = p.createCanvas(400, 225); // Tamaño inicial
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
    
    eventBus.publish('canvas:ready', p);
    this.resizeCanvasToContainer();
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
    
    buffer.image(state.media.instance, 0, 0, bufferWidth, bufferHeight);
    
    const processedBuffer = this.imageProcessor.process(buffer, state.config);

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

  /**
   * Redimensiona el canvas para que se ajuste a su contenedor manteniendo el aspect ratio del medio.
   */
  resizeCanvasToContainer() {
      if (!this.p5) return;

      const containerWidth = this.container.clientWidth;
      const containerHeight = this.container.clientHeight;
      const { media } = store.getState();

      let mediaRatio = 16 / 9; 
      if (media.isLoaded && media.width > 0 && media.height > 0) {
          mediaRatio = media.width / media.height;
      }
      
      let newWidth = containerWidth;
      let newHeight = newWidth / mediaRatio;

      if (newHeight > containerHeight) {
          newHeight = containerHeight;
          newWidth = newHeight * mediaRatio;
      }

      this.p5.resizeCanvas(Math.floor(newWidth), Math.floor(newHeight));
      this.requestRedraw();
  }
}

export { CanvasManager };
