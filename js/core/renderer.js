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
import { calculatePSNR, calculateSSIM, calculateCompression } from './metrics.js';
import { debounce } from '../utils/helpers.js'; // ✅ IMPORTANTE: Importar debounce

// ✅ MOVIMOS ESTA FUNCIÓN AQUÍ: Lógica para calcular el tamaño del canvas
function calculateCanvasDimensions() {
    const { mediaInfo } = getState();
    if (!mediaInfo || mediaInfo.width === 0) {
        return { width: 400, height: 225 }; // Tamaño por defecto
    }

    const container = document.getElementById('canvasContainer');
    const padding = 32; // p-4 de Tailwind = 1rem * 2 = 32px
    const availableWidth = container.clientWidth - padding;
    const availableHeight = container.clientHeight - padding;

    const mediaAspect = mediaInfo.width / mediaInfo.height;
    const containerAspect = availableWidth / availableHeight;

    let canvasW, canvasH;

    if (mediaAspect > containerAspect) {
        canvasW = availableWidth;
        canvasH = canvasW / mediaAspect;
    } else {
        canvasH = availableHeight;
        canvasW = canvasH * mediaAspect;
    }

    return { width: Math.max(100, Math.floor(canvasW)), height: Math.max(100, Math.floor(canvasH)) };
}

export function sketch(p) {
  let canvas;
  let bufferPool;
  let colorCache;
  let lumaLUT, bayerLUT, blueNoiseLUT;
  let needsRedraw = true;

  window.triggerRedraw = () => {
    needsRedraw = true;
    p.redraw();
  };

  p.setup = () => {
    const { width, height } = calculateCanvasDimensions();
    canvas = p.createCanvas(width, height);
    canvas.parent('canvasContainer');
    canvas.elt.getContext('2d', { willReadFrequently: true, alpha: false });
    p.pixelDensity(1);
    p.noSmooth();
    canvas.elt.style.imageRendering = 'pixelated';

    bufferPool = new BufferPool();
    colorCache = new ColorCache(p);
    lumaLUT = new LumaLUT();
    bayerLUT = new BayerLUT();
    blueNoiseLUT = new BlueNoiseLUT();

    p.noLoop();

    const redrawHandler = () => {
        needsRedraw = true;
        p.redraw();
    };

    events.on('state:updated', redrawHandler);
    events.on('config:updated', redrawHandler);
    events.on('timeline:updated', redrawHandler);
    events.on('curves:updated', redrawHandler);
    events.on('presets:loaded', redrawHandler);

    events.on('media:loaded', () => {
        const { width, height } = calculateCanvasDimensions();
        p.resizeCanvas(width, height);
        redrawHandler();
    });

    // ✅ CORRECCIÓN: Al restaurar el canvas después de grabar, también redimensionamos
    events.on('export:finished', () => {
        const { width, height } = calculateCanvasDimensions();
        p.resizeCanvas(width, height);
        redrawHandler();
    });

    events.on('playback:play', () => p.loop());
    events.on('playback:pause', () => p.noLoop());

    events.on('metrics:calculate', () => {
        const { media } = getState();
        if (!media) return;

        const origBuffer = p.createGraphics(p.width, p.height);
        origBuffer.pixelDensity(1);
        origBuffer.image(media, 0, 0, p.width, p.height);
        const processedBuffer = p.get();
        const psnr = calculatePSNR(origBuffer, processedBuffer);
        const ssim = calculateSSIM(origBuffer, processedBuffer);
        const compression = calculateCompression(processedBuffer);
        origBuffer.remove();
        events.emit('metrics:results', { psnr, ssim, compression });
    });

    redrawHandler();
  };

  // ✅ NUEVO: p5.js tiene una función especial para el redimensionado de la ventana
  p.windowResized = debounce(() => {
    const { width, height } = calculateCanvasDimensions();
    p.resizeCanvas(width, height);
    needsRedraw = true;
    p.redraw();
  }, 100); // Usamos debounce para no sobrecargar el navegador

  p.draw = () => {
    // ... (El resto de la función p.draw se mantiene exactamente igual)
    const state = getState();
    const { media, mediaType, config } = state;

    if (mediaType === 'image' && !needsRedraw) {
      return;
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
    
    const isDitheringActive = config.effect !== 'none';
    const p5colors = config.colors.map(hexColor => p.color(hexColor));
    const colorsChanged = !lumaLUT.cachedColors || 
                         lumaLUT.cachedColors.length !== p5colors.length ||
                         config.colors.some((hex, i) => {
                             const cached = lumaLUT.cachedColors[i];
                             const current = p.color(hex);
                             return p.red(cached) !== p.red(current) ||
                                    p.green(cached) !== p.green(current) ||
                                    p.blue(cached) !== p.blue(current);
                         });
    
    if (colorsChanged || !lumaLUT.lut) {
        lumaLUT.build(p5colors, p);
    }
    
    if (isDitheringActive) {
      const pw = Math.floor(p.width / config.ditherScale);
      const ph = Math.floor(p.height / config.ditherScale);
      const buffer = bufferPool.get(pw, ph, p);

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
          drawDither(p, buffer, media, config, lumaLUT, bayerLUT);
      }
      p.image(buffer, 0, 0, p.width, p.height);

    } else {
      const buffer = bufferPool.get(p.width, p.height, p);
      buffer.image(media, 0, 0, p.width, p.height);
      
      buffer.loadPixels();
      applyImageAdjustments(buffer.pixels, config);
      buffer.updatePixels();
      
      p.image(buffer, 0, 0, p.width, p.height);
    }

    events.emit('render:frame-drawn');

    if (mediaType === 'image') {
      needsRedraw = false;
    }
  };
}
