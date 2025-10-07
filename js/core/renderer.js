/**
 * ============================================================================
 * DitherLab v7 - Módulo de Renderizado (p5.js)
 * ============================================================================
 * - Encapsula toda la lógica de p5.js (setup, draw).
 * - Es "agnóstico" a la UI: solo le importa el estado actual para dibujar.
 * - Se suscribe a eventos para saber cuándo necesita redibujar el canvas.
 * ============================================================================
 */
import { events } from '../app/events.js';
import { getState } from '../app/state.js';
import { BufferPool, ColorCache, LumaLUT, BayerLUT, BlueNoiseLUT } from '../utils/optimizations.js';
import { applyImageAdjustments, drawDither, drawPosterize, drawBlueNoise, drawVariableError } from './algorithms.js';

// Creamos una instancia de la función del sketch que p5.js podrá ejecutar.
export function sketch(p) {
  let canvas;
  let bufferPool;
  let colorCache;
  let lumaLUT, bayerLUT, blueNoiseLUT;
  let needsRedraw = true; // Flag para optimizar el redibujado de imágenes estáticas

  // Función global para forzar un redibujado desde otros módulos
  window.triggerRedraw = () => {
    needsRedraw = true;
  };

  p.setup = () => {
    canvas = p.createCanvas(400, 225);
    canvas.parent('canvasContainer');
    canvas.elt.getContext('2d', { willReadFrequently: true, alpha: false });
    p.pixelDensity(1);
    p.noSmooth(); // Renderizado pixelado (nearest-neighbor)
    canvas.elt.style.imageRendering = 'pixelated';

    // Inicializar clases de optimización
    bufferPool = new BufferPool();
    colorCache = new ColorCache(p);
    lumaLUT = new LumaLUT();
    bayerLUT = new BayerLUT();
    blueNoiseLUT = new BlueNoiseLUT();

    // Desactivamos el bucle por defecto. Solo se dibujará cuando sea necesario.
    p.noLoop();

    // Suscripciones a eventos para controlar el redibujado
    const redrawHandler = () => {
        needsRedraw = true;
        p.redraw();
    };

    events.on('state:updated', redrawHandler);
    events.on('config:updated', redrawHandler);

    events.on('media:loaded', (mediaState) => {
        // Ajustar el tamaño del canvas al nuevo medio
        p.resizeCanvas(mediaState.canvasWidth, mediaState.canvasHeight);
        redrawHandler();
    });

    events.on('playback:play', () => p.loop());
    events.on('playback:pause', () => p.noLoop());

    // Dibujar el estado inicial
    redrawHandler();
  };

  p.draw = () => {
    const state = getState();
    const { media, mediaType, config } = state;

    if (mediaType === 'image' && !needsRedraw) {
      return; // Optimización: no redibujar si es una imagen estática y nada ha cambiado
    }

    p.background(0);

    if (!media) {
      p.fill(128);
      p.textFont('monospace');
      p.textSize(20);
      p.textAlign(p.CENTER, p.CENTER);
      p.text('Arrastra un video o imagen\npara comenzar', p.width / 2, p.height / 2);
      needsRedraw = false;
      return;
    }
    
    // Lógica principal de renderizado
    const isDitheringActive = config.effect !== 'none';
    const p5colors = colorCache.getColors(config.colors);

    if (lumaLUT.needsRebuild(p5colors)) {
        lumaLUT.build(p5colors, p);
    }
    
    if (isDitheringActive) {
      const pw = Math.floor(p.width / config.ditherScale);
      const ph = Math.floor(p.height / config.ditherScale);
      const buffer = bufferPool.get(pw, ph, p);

      // Delegar a la función de algoritmo correspondiente
      switch(config.effect) {
        case 'posterize':
          drawPosterize(p, buffer, media, config, lumaLUT);
          break;
        case 'blue-noise':
          drawBlueNoise(p, buffer, media, config, lumaLUT, blueNoiseLUT);
          break;
        case 'variable-error':
            drawVariableError(p, buffer, media, config, lumaLUT);
            break;
        default:
          drawDither(p, buffer, media, config, colorCache, bayerLUT);
      }
      p.image(buffer, 0, 0, p.width, p.height);

    } else {
      // Si no hay dithering, solo aplicar ajustes de imagen
      const buffer = bufferPool.get(p.width, p.height, p);
      buffer.image(media, 0, 0, p.width, p.height);
      
      buffer.loadPixels();
      applyImageAdjustments(buffer.pixels, config);
      buffer.updatePixels();
      
      p.image(buffer, 0, 0, p.width, p.height);
    }

    // Emitir un evento para que la UI (ej. timeline) se actualice
    events.emit('render:frame-drawn');

    if (mediaType === 'image') {
      needsRedraw = false;
    }
  };
}
