// src/core/ditherProcessor.js

import { KERNELS } from '../utils/constants.js';
import { applyImageAdjustments } from './imageAdjustments.js';

// --- Clases auxiliares para optimización (antes en algorithms.js) ---
class BufferPool {
  constructor() { this.buffers = new Map(); }
  get(width, height, p) {
    const key = `${width}x${height}`;
    if (!this.buffers.has(key)) {
      const buffer = p.createGraphics(width, height);
      buffer.elt.getContext('2d', { willReadFrequently: true, alpha: false });
      buffer.pixelDensity(1);
      buffer.elt.style.imageRendering = 'pixelated';
      this.buffers.set(key, buffer);
    }
    return this.buffers.get(key);
  }
}

class ColorCache {
  constructor(p) { this.p = p; this.cache = new Map(); }
  getColor(hex) {
    if (!this.cache.has(hex)) this.cache.set(hex, this.p.color(hex));
    return this.cache.get(hex);
  }
  getColors(hexArray) { return hexArray.map(hex => this.getColor(hex)); }
}

class LumaLUT {
  constructor() { this.lut = null; this.cachedColors = null; }
  build(p5colors, p) {
    const count = p5colors.length;
    this.lut = new Uint8Array(256 * 3);
    for (let i = 0; i < 256; i++) {
      const index = count === 0 ? 0 : Math.min(Math.floor(i / 255 * count), count - 1);
      const color = p5colors[index] || p.color(i);
      this.lut[i * 3] = p.red(color);
      this.lut[i * 3 + 1] = p.green(color);
      this.lut[i * 3 + 2] = p.blue(color);
    }
    this.cachedColors = p5colors;
  }
  map(luma) {
    const index = Math.min(Math.max(Math.floor(luma), 0), 255);
    return [this.lut[index * 3], this.lut[index * 3 + 1], this.lut[index * 3 + 2]];
  }
  needsRebuild(p5colors) {
    return !this.cachedColors || this.cachedColors.length !== p5colors.length;
  }
}

class BayerLUT {
    constructor() {
        const BAYER_4x4 = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
        this.matrix = new Float32Array(16);
        for (let i = 0; i < 16; i++) {
            const y = Math.floor(i / 4);
            const x = i % 4;
            this.matrix[i] = (BAYER_4x4[y][x] / 16.0 - 0.5);
        }
    }
    get(x, y) { return this.matrix[(y % 4) * 4 + (x % 4)]; }
}

class BlueNoiseLUT {
    constructor() {
        this.noise = new Float32Array([
            0.53,0.18,0.71,0.41,0.94,0.24,0.82,0.47,0.12,0.65,0.29,0.88,0.06,0.59,0.35,0.76,
            0.76,0.35,0.94,0.18,0.71,0.12,0.88,0.24,0.24,0.82,0.47,0.65,0.29,0.94,0.41,0.59,
            0.88,0.06,0.71,0.35,0.82,0.18,0.65,0.12,0.41,0.59,0.12,0.76,0.24,0.47,0.94,0.29,
            0.65,0.29,0.88,0.06,0.59,0.71,0.35,0.82,0.18,0.94,0.24,0.53,0.12,0.76,0.47,0.41
        ]);
    }
    get(x, y) { return this.noise[(y % 8) * 8 + (x % 8)] - 0.5; }
}


/**
 * DitherProcessor - Encapsula la lógica de renderizado con p5.js.
 * Se suscribe a AppState y redibuja el canvas cuando hay cambios.
 */
export default class DitherProcessor {
  constructor(containerId, appState) {
    this.appState = appState;
    this.needsRedraw = true; // Flag para optimizar el redibujado

    // Inicializa el sketch de p5.js
    new p5(this.sketch.bind(this), document.getElementById(containerId));
    
    // Suscribirse a los cambios del estado
    this.appState.subscribe(this.handleStateUpdate.bind(this));
  }

  // Maneja las actualizaciones del estado
  handleStateUpdate(newState) {
    this.currentState = newState;
    this.triggerRedraw();
  }
  
  // Fuerza un redibujado en el siguiente ciclo de p5
  triggerRedraw() {
    this.needsRedraw = true;
    if (this.p5) {
      this.p5.redraw();
    }
  }

  // Define el sketch de p5.js
  sketch(p) {
    this.p5 = p; // Guardar la instancia de p5
    const bufferPool = new BufferPool();
    const colorCache = new ColorCache(p);
    const lumaLUT = new LumaLUT();
    const bayerLUT = new BayerLUT();
    const blueNoiseLUT = new BlueNoiseLUT();

    p.setup = () => {
      const canvas = p.createCanvas(400, 225);
      canvas.elt.getContext('2d', { willReadFrequently: true, alpha: false });
      p.pixelDensity(1);
      p.noSmooth();
      canvas.elt.style.imageRendering = 'pixelated';
      p.noLoop(); // Desactivar el bucle de dibujo automático
    };

    p.draw = () => {
      if (!this.needsRedraw && this.appState.mediaType === 'image') {
        return; // No redibujar si no es necesario para imágenes estáticas
      }

      p.background(0);
      const media = this.appState.media;
      const config = this.appState.config;
      
      if (!media) {
        p.fill(128);
        p.textAlign(p.CENTER, p.CENTER);
        p.text('Arrastra un video o imagen para comenzar', p.width / 2, p.height / 2);
        this.needsRedraw = false;
        return;
      }
      
      // Lógica principal de renderizado
      const isDitheringActive = config.effect !== 'none';

      if (isDitheringActive) {
        const p5colors = colorCache.getColors(config.colors);
        if (lumaLUT.needsRebuild(p5colors)) lumaLUT.build(p5colors, p);
        
        const pw = Math.floor(p.width / config.ditherScale);
        const ph = Math.floor(p.height / config.ditherScale);
        const buffer = bufferPool.get(pw, ph, p);
        
        // Seleccionar y ejecutar el algoritmo correspondiente
        this.runAlgorithm(p, buffer, media, config, lumaLUT, bayerLUT, blueNoiseLUT);
        
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
      
      this.needsRedraw = false;
    };

    this.p5.resizeCanvasBasedOnMedia = (mediaWidth, mediaHeight) => {
        const container = document.getElementById('canvasContainer');
        const containerWidth = container.clientWidth || 800;
        const containerHeight = container.clientHeight || 600;
        const padding = 64;
        const availableWidth = containerWidth - padding;
        const availableHeight = containerHeight - padding;

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
        
        p.resizeCanvas(Math.floor(canvasW), Math.floor(canvasH));
        this.triggerRedraw();
    };
  }

  // --- ALGORITMOS DE DITHERING ---
  // (El código de los algoritmos como drawPosterize, drawDither, etc., iría aquí)
  runAlgorithm(p, buffer, src, cfg, lumaLUT, bayerLUT, blueNoiseLUT) {
    const pw = buffer.width;
    const ph = buffer.height;
    
    buffer.image(src, 0, 0, pw, ph);
    buffer.loadPixels();
    
    const pixels = buffer.pixels;
    applyImageAdjustments(pixels, cfg);

    switch(cfg.effect) {
        case 'posterize':
            this.drawPosterize(pixels, cfg, lumaLUT);
            break;
        case 'bayer':
            this.drawBayerDither(pixels, pw, ph, cfg, lumaLUT, bayerLUT);
            break;
        case 'blue-noise':
            this.drawBlueNoise(pixels, pw, ph, cfg, lumaLUT, blueNoiseLUT);
            break;
        case 'variable-error':
            this.drawVariableError(pixels, pw, ph, cfg, lumaLUT);
            break;
        default:
            // Algoritmos de difusión de error
            const kernel = KERNELS[cfg.effect];
            if (kernel) {
                this.drawErrorDiffusion(pixels, pw, ph, cfg, lumaLUT, kernel);
            }
            break;
    }

    buffer.updatePixels();
  }

  drawPosterize(pixels, cfg, lumaLUT) {
    if (cfg.useOriginalColor) {
        const levels = 4;
        const step = 255 / (levels - 1);
        for (let i = 0; i < pixels.length; i += 4) {
            pixels[i] = Math.round(pixels[i] / step) * step;
            pixels[i + 1] = Math.round(pixels[i + 1] / step) * step;
            pixels[i + 2] = Math.round(pixels[i + 2] / step) * step;
        }
    } else {
        for (let i = 0; i < pixels.length; i += 4) {
            const luma = pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114;
            const [r, g, b] = lumaLUT.map(luma);
            pixels[i] = r;
            pixels[i + 1] = g;
            pixels[i + 2] = b;
        }
    }
  }
  
  drawBayerDither(pixels, pw, ph, cfg, lumaLUT, bayerLUT) {
    const levels = cfg.colorCount;
    const baseStrength = 255 / levels;
    const ditherStrength = baseStrength * cfg.patternStrength * 2;
    
    for (let y = 0; y < ph; y++) {
        for (let x = 0; x < pw; x++) {
            const i = (y * pw + x) * 4;
            const ditherOffset = bayerLUT.get(x, y) * ditherStrength;
            const luma = pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114;
            const adjustedLuma = Math.min(255, Math.max(0, luma + ditherOffset));
            const [r, g, b] = lumaLUT.map(adjustedLuma);
            pixels[i] = r;
            pixels[i + 1] = g;
            pixels[i + 2] = b;
        }
    }
  }
  
  drawBlueNoise(pixels, pw, ph, cfg, lumaLUT, blueNoiseLUT) {
      // Similar a Bayer, pero usando BlueNoiseLUT
      const levels = cfg.colorCount;
      const baseStrength = 255 / levels;
      const ditherStrength = baseStrength * cfg.patternStrength * 2;
      for (let y = 0; y < ph; y++) {
        for (let x = 0; x < pw; x++) {
          const i = (y * pw + x) * 4;
          const ditherOffset = blueNoiseLUT.get(x, y) * ditherStrength;
          const luma = pixels[i] * 0.299 + pixels[i+1] * 0.587 + pixels[i+2] * 0.114;
          const adjLuma = Math.min(255, Math.max(0, luma + ditherOffset));
          const [r, g, b] = lumaLUT.map(adjLuma);
          pixels[i] = r;
          pixels[i+1] = g;
          pixels[i+2] = b;
        }
      }
  }

  drawErrorDiffusion(pixels, pw, ph, cfg, lumaLUT, kernel) {
      const step = 255 / (cfg.colorCount > 1 ? cfg.colorCount - 1 : 1);
      
      for (let y = 0; y < ph; y++) {
        const isReversed = cfg.serpentineScan && y % 2 === 1;
        const xStart = isReversed ? pw - 1 : 0;
        const xEnd = isReversed ? -1 : pw;
        const xStep = isReversed ? -1 : 1;

        for (let x = xStart; x !== xEnd; x += xStep) {
            const i = (y * pw + x) * 4;
            const oldLuma = pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114;
            const newLuma = Math.round(oldLuma / step) * step;
            const [r, g, b] = lumaLUT.map(newLuma);
            
            pixels[i] = r;
            pixels[i + 1] = g;
            pixels[i + 2] = b;
            
            const err = (oldLuma - newLuma) * cfg.diffusionStrength;
            
            for (const pt of kernel.points) {
                const dx = isReversed ? -pt.dx : pt.dx;
                const nx = x + dx;
                const ny = y + pt.dy;
                
                if (nx >= 0 && nx < pw && ny >= 0 && ny < ph) {
                    const ni = (ny * pw + nx) * 4;
                    const weight = pt.w / kernel.divisor;
                    const adjustment = err * weight;
                    pixels[ni] = Math.min(255, Math.max(0, pixels[ni] + adjustment));
                    pixels[ni + 1] = Math.min(255, Math.max(0, pixels[ni + 1] + adjustment));
                    pixels[ni + 2] = Math.min(255, Math.max(0, pixels[ni + 2] + adjustment));
                }
            }
        }
    }
  }
  
  drawVariableError(pixels, pw, ph, cfg, lumaLUT) {
      const kernel = KERNELS['floyd-steinberg'];
      const gradients = new Float32Array(pw * ph);
      // Calcular gradientes para detectar bordes
      for (let y = 1; y < ph - 1; y++) {
        for (let x = 1; x < pw - 1; x++) {
            const i = (y * pw + x) * 4;
            const gx = Math.abs(pixels[i + 4] - pixels[i - 4]);
            const gy = Math.abs(pixels[i + pw * 4] - pixels[i - pw * 4]);
            gradients[y * pw + x] = Math.sqrt(gx * gx + gy * gy) / 255;
        }
      }

      // El resto es similar a drawErrorDiffusion pero con fuerza adaptativa
      const step = 255 / (cfg.colorCount > 1 ? cfg.colorCount - 1 : 1);
      for (let y = 0; y < ph; y++) {
        for (let x = 0; x < pw; x++) {
            const i = (y * pw + x) * 4;
            const gradient = gradients[y * pw + x] || 0;
            const adaptiveStrength = cfg.diffusionStrength * (1 - gradient * 0.5);

            const oldLuma = pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114;
            const newLuma = Math.round(oldLuma / step) * step;
            const [r, g, b] = lumaLUT.map(newLuma);
            
            pixels[i] = r;
            pixels[i + 1] = g;
            pixels[i + 2] = b;
            
            const err = (oldLuma - newLuma) * adaptiveStrength;
            
            for (const pt of kernel.points) {
                const nx = x + pt.dx;
                const ny = y + pt.dy;
                
                if (nx >= 0 && nx < pw && ny >= 0 && ny < ph) {
                    const ni = (ny * pw + nx) * 4;
                    const weight = pt.w / kernel.divisor;
                    const adjustment = err * weight;
                    pixels[ni] = Math.min(255, Math.max(0, pixels[ni] + adjustment));
                    pixels[ni + 1] = Math.min(255, Math.max(0, pixels[ni + 1] + adjustment));
                    pixels[ni + 2] = Math.min(255, Math.max(0, pixels[ni + 2] + adjustment));
                }
            }
        }
      }
  }
}

// Es necesario mover applyImageAdjustments a su propio archivo o aquí
// para que ditherProcessor no dependa de un archivo inexistente.
// Lo incluyo aquí por simplicidad, pero idealmente estaría en 'imageAdjustments.js'.
export function applyImageAdjustments(pixels, config) {
    const { brightness, contrast, saturation, curvesLUTs } = config;
    const hasBasicAdjustments = brightness !== 0 || contrast !== 1.0 || saturation !== 1.0;
    const hasCurves = curvesLUTs && (curvesLUTs.rgb || curvesLUTs.r || curvesLUTs.g || curvesLUTs.b);
    if (!hasBasicAdjustments && !hasCurves) return;

    for (let i = 0; i < pixels.length; i += 4) {
        let r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
        if (hasBasicAdjustments) {
            r = (r - 127.5) * contrast + 127.5 + brightness;
            g = (g - 127.5) * contrast + 127.5 + brightness;
            b = (b - 127.5) * contrast + 127.5 + brightness;
            if (saturation !== 1.0) {
                const luma = r * 0.299 + g * 0.587 + b * 0.114;
                r = luma + (r - luma) * saturation;
                g = luma + (g - luma) * saturation;
                b = luma + (b - luma) * saturation;
            }
        }
        r = Math.max(0, Math.min(255, r));
        g = Math.max(0, Math.min(255, g));
        b = Math.max(0, Math.min(255, b));
        if (hasCurves) {
            if (curvesLUTs.rgb) { r = curvesLUTs.rgb[Math.round(r)]; g = curvesLUTs.rgb[Math.round(g)]; b = curvesLUTs.rgb[Math.round(b)]; }
            if (curvesLUTs.r) r = curvesLUTs.r[Math.round(r)];
            if (curvesLUTs.g) g = curvesLUTs.g[Math.round(g)];
            if (curvesLUTs.b) b = curvesLUTs.b[Math.round(b)];
        }
        pixels[i] = r;
        pixels[i + 1] = g;
        pixels[i + 2] = b;
    }
}
