/**
 * ============================================================================
 * DitherLab v7 - Módulo de Renderizado (Refactorizado para Worker)
 * ============================================================================
 * - Se comunica con el Web Worker para el procesamiento de dithering.
 * - Gestiona el ciclo de vida: envía datos al worker, recibe los resultados y
 * actualiza el canvas.
 * - Mantiene la interfaz de usuario completamente fluida y sin bloqueos.
 * ============================================================================
 */
import { events } from '../app/events.js';
import { getState } from '../app/state.js';
import { BufferPool, LumaLUT } from '../utils/optimizations.js';
import { applyImageAdjustments, drawHalftoneDither } from './algorithms.js';
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
    if (!mediaInfo || mediaInfo.width === 0) return { width: 400, height: 225 };
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
    let lumaLUT;
    let needsRedraw = true;
    let originalMediaBuffer = null;
    let ditherWorker;
    let isProcessing = false;

    const forceRedraw = () => {
        needsRedraw = true;
        if (!isProcessing) p.redraw();
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
        
        // Inicializamos el Web Worker
        ditherWorker = new Worker('./js/core/dither.worker.js');

        // ========= LÍNEA CORREGIDA =========
        // El worker envía 'imageData' directamente, así que e.data ES 'imageData'.
        ditherWorker.onmessage = (e) => {
            const imageData = e.data;
            
            // Verificación para evitar errores si llega un mensaje inesperado.
            if (!imageData || typeof imageData.width === 'undefined') {
                console.error("Mensaje inválido recibido del worker:", e.data);
                isProcessing = false;
                return;
            }
            
            const buffer = bufferPool.get(imageData.width, imageData.height, p);
            buffer.drawingContext.putImageData(imageData, 0, 0);
            
            p.image(buffer, 0, 0, p.width, p.height);
            
            isProcessing = false;
            events.emit('render:frame-drawn');
            if (getState().mediaType === 'image') needsRedraw = false;
        };

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
            if (originalMediaBuffer) originalMediaBuffer.remove();
            originalMediaBuffer = p.createGraphics(p.width, p.height);
            originalMediaBuffer.pixelDensity(1);
            originalMediaBuffer.image(getState().media, 0, 0, p.width, p.height);
            originalMediaBuffer.loadPixels();
            forceRedraw();
        });

        events.on('playback:play', () => p.loop());
        events.on('playback:pause', () => p.noLoop());

        events.on('metrics:calculate', () => {
            if (!getState().media || !originalMediaBuffer) return;
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
        forceRedraw();
    }, 100);

    p.draw = () => {
        if (isProcessing || (getState().mediaType === 'image' && !needsRedraw)) {
            return;
        }

        const state = getState();
        const { media, config } = state;

        if (!media) {
            p.background(0);
            p.fill(128);
            p.textAlign(p.CENTER, p.CENTER);
            p.text('Arrastra un video o imagen\npara comenzar', p.width / 2, p.height / 2);
            needsRedraw = false;
            return;
        }

        const isDitheringActive = config.effect !== 'none';
        const p5colors = config.colors.map(hex => p.color(hex));
        if (!lumaLUT.lut || config.colors.length !== lumaLUT.cachedColors?.length) {
            lumaLUT.build(p5colors, p);
        }

        let pw, ph;
        if (config.nativeQualityMode) {
            pw = p.width;
            ph = p.height;
        } else {
            // Calidad mejorada por defecto: escala 1 en lugar de 2
            const ditherScale = config.ditherScale > 1 ? config.ditherScale : 1;
            pw = Math.floor(p.width / ditherScale);
            ph = Math.floor(p.height / ditherScale);
        }
        
        const buffer = bufferPool.get(pw, ph, p);
        buffer.image(media, 0, 0, pw, ph);
        buffer.loadPixels();
        applyImageAdjustments(buffer.pixels, config, pw, ph);

        // Si es Halftone o no hay dithering, lo hacemos en el hilo principal
        if (config.effect === 'halftone-dither' || !isDitheringActive) {
            if (config.effect === 'halftone-dither') {
                drawHalftoneDither(p, buffer, buffer, config);
            }
            p.image(buffer, 0, 0, p.width, p.height);
            events.emit('render:frame-drawn');
            if (state.mediaType === 'image') needsRedraw = false;
        } else {
            // Para todo lo demás, usamos el WORKER
            isProcessing = true;
            const imageData = buffer.drawingContext.getImageData(0, 0, pw, ph);
            
            // Enviamos los datos al worker. El último argumento es un array de
            // "Transferable Objects" para una transferencia de memoria casi instantánea.
            ditherWorker.postMessage({
                imageData,
                config,
                lumaLUT: lumaLUT.lut,
                pw,
                ph
            }, [imageData.data.buffer]);
        }
    };
}
