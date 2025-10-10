/**
 * ============================================================================
 * DitherLab v7 - Módulo de Renderizado (p5.js) (VERSIÓN MEJORADA)
 * ============================================================================
 */
import { events } from '../app/events.js';
import { getState } from '../app/state.js';
import { BufferPool, LumaLUT, BayerLUT, BlueNoiseLUT } from '../utils/optimizations.js';
import { applyImageAdjustments, drawDither, drawPosterize, drawBlueNoise, drawVariableError, drawOstromoukhovDither, drawRiemersmaDither, drawHalftoneDither } from './algorithms.js';
import { calculatePSNR, calculateSSIM, calculateCompression } from './metrics.js';
import { debounce } from '../utils/helpers.js';

function calculateCanvasDimensions() {
    const container = document.getElementById('canvasContainer');
    if (!container) return { width: 400, height: 225 };

    const style = window.getComputedStyle(container);
    const paddingX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
    const paddingY = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);

    const availableWidth = container.clientWidth - paddingX;
    const availableHeight = container.clientHeight - paddingY;

    const { mediaInfo } = getState();
    if (!mediaInfo || mediaInfo.width === 0) {
        return { width: 400, height: 225 };
    }

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
  let lumaLUT, bayerLUT, blueNoiseLUT;
  let needsRedraw = true;
  let originalMediaBuffer = null; // Buffer persistente para la imagen original

  const forceRedraw = () => {
    needsRedraw = true;
    p.redraw();
  };

  p.setup = () => {
    const { width, height } = calculateCanvasDimensions();
    canvas = p.createCanvas(width, height);
    canvas.parent('canvasContainer');
    
    canvas.elt.getContext('2d', { alpha: false });
    
    p.pixelDensity(1);
    p.noSmooth();
    canvas.elt.style.imageRendering = 'pixelated';

    bufferPool = new BufferPool();
    lumaLUT = new LumaLUT();
    bayerLUT = new BayerLUT();
    blueNoiseLUT = new BlueNoiseLUT();

    p.noLoop();

    events.on('state:updated', forceRedraw);
    events.on('config:updated', forceRedraw);
    events.on('timeline:updated', forceRedraw);
    events.on('curves:updated', forceRedraw);
    events.on('presets:loaded', forceRedraw);
    events.on('render:force-redraw', forceRedraw);

    events.on('media:loaded', () => {
        const { width, height } = calculateCanvasDimensions();
        p.resizeCanvas(width, height);

        if (originalMediaBuffer) {
            originalMediaBuffer.remove();
        }
        originalMediaBuffer = p.createGraphics(p.width, p.height);
        originalMediaBuffer.pixelDensity(1);
        originalMediaBuffer.image(getState().media, 0, 0, p.width, p.height);
        originalMediaBuffer.loadPixels();

        forceRedraw();
    });

    events.on('export:finished', () => {
        const { width, height } = calculateCanvasDimensions();
        p.resizeCanvas(width, height);
        forceRedraw();
    });

    events.on('playback:play', () => p.loop());
    events.on('playback:pause', () => p.noLoop());

    events.on('metrics:calculate', () => {
        const { media } = getState();
        if (!media || !originalMediaBuffer) return;

        p.loadPixels();

        const originalPixels = originalMediaBuffer.pixels;
        const processedPixels = p.pixels;

        const psnr = calculatePSNR(originalPixels, processedPixels);
        const ssim = calculateSSIM(originalPixels, processedPixels);
        const compression = calculateCompression(processedPixels);
        
        events.emit('metrics:results', { psnr, ssim, compression });
    });

    forceRedraw();
  };

  p.windowResized = debounce(() => {
    const { width, height } = calculateCanvasDimensions();
    p.resizeCanvas(width, height);
    
    if (getState().media && originalMediaBuffer) {
        originalMediaBuffer.resizeCanvas(width, height);
        originalMediaBuffer.image(getState().media, 0, 0, width, height);
        originalMediaBuffer.loadPixels();
    }

    needsRedraw = true;
    p.redraw();
  }, 100);

  p.draw = () => {
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
                             if (!lumaLUT.cachedColors[i]) return true;
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
      let pw, ph;
      if (config.nativeQualityMode) {
        pw = p.width;
        ph = p.height;
      } else {
        pw = Math.floor(p.width / config.ditherScale);
        ph = Math.floor(p.height / config.ditherScale);
      }
      
      const buffer = bufferPool.get(pw, ph, p);

      // Dibujamos la imagen original en el buffer de procesamiento
      buffer.image(media, 0, 0, pw, ph);
      buffer.loadPixels();
      
      // Aplicamos todos los ajustes (incluyendo la nitidez ahora)
      applyImageAdjustments(buffer.pixels, config, pw, ph);

      switch(config.effect) {
        case 'posterize':
          drawPosterize(buffer.pixels, config, lumaLUT);
          break;
        case 'blue-noise':
          drawBlueNoise(buffer.pixels, config, lumaLUT, blueNoiseLUT, pw, ph);
          break;
        case 'variable-error':
          drawVariableError(buffer.pixels, config, lumaLUT, pw, ph);
          break;
        case 'ostromoukhov':
          drawOstromoukhovDither(buffer.pixels, config, lumaLUT, blueNoiseLUT, pw, ph);
          break;
        case 'riemersma':
            drawRiemersmaDither(buffer.pixels, config, lumaLUT, pw, ph);
            break;
        case 'halftone-dither':
            // Halftone es un caso especial, se gestiona diferente
            buffer.updatePixels(); // Actualizamos por si hubo ajustes de imagen
            drawHalftoneDither(p, buffer, buffer, config);
            break;
        default:
          drawDither(buffer.pixels, config, lumaLUT, bayerLUT, pw, ph);
      }
      
      // Solo para los algoritmos que modifican el array de píxeles
      if (config.effect !== 'halftone-dither') {
        buffer.updatePixels();
      }
      
      p.image(buffer, 0, 0, p.width, p.height);

    } else {
      const buffer = bufferPool.get(p.width, p.height, p);
      buffer.image(media, 0, 0, p.width, p.height);
      
      buffer.loadPixels();
      applyImageAdjustments(buffer.pixels, config, p.width, p.height);
      buffer.updatePixels();
      
      p.image(buffer, 0, 0, p.width, p.height);
    }

    events.emit('render:frame-drawn');

    if (mediaType === 'image') {
      needsRedraw = false;
    }
  };
}
