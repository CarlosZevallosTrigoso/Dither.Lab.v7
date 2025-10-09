/**
 * ============================================================================
 * DitherLab v7 - Módulo de Exportación
 * ============================================================================
 */
import { events } from '../app/events.js';
import { getState, updateState } from '../app/state.js';
import { showToast } from '../utils/helpers.js';

let elements = {};
let p5Instance;
let recorder;
let chunks = [];
let originalCanvasWidth, originalCanvasHeight;

const WEBM_BITRATES = {
    low: 4000000,    // 4 Mbps
    medium: 8000000, // 8 Mbps
    high: 16000000,  // 16 Mbps
    ultra: 20000000  // 20 Mbps para alta calidad en resolución FHD/2K
};

function queryElements() {
    const ids = [
        'recBtn', 'stopBtn', 'recIndicator', 'status',
        'downloadImageBtn', 'exportGifBtn', 'gifProgress', 'gifProgressText', 'gifProgressBar',
        'gifFpsSlider', 'gifQualitySlider', 'gifUseMarkersToggle', 'webmUseMarkersToggle',
        'gifWidthSlider', 'gifWidthVal', 'gifDimensionsEstimate',
        'exportSpriteBtn', 'spriteColsSlider', 'spriteFrameCountSlider',
        'exportSequenceBtn'
    ];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) elements[id] = el;
    });
}

function updateGifDimensionsEstimate() {
    const { media, mediaType } = getState();
    if (mediaType !== 'video' || !elements.gifDimensionsEstimate) return;

    const aspectRatio = media.height / media.width;
    const width = parseInt(elements.gifWidthSlider.value);
    const height = Math.round(width * aspectRatio);
    
    elements.gifDimensionsEstimate.textContent = `${width}x${height} px`;
}

async function exportSpriteSheet() {
    const { media, mediaType, config, timeline } = getState();
    if (mediaType !== 'video') {
        showToast('La exportación de Sprite Sheet solo funciona con videos.');
        return;
    }

    const cols = parseInt(elements.spriteColsSlider.value);
    const frameCount = parseInt(elements.spriteFrameCountSlider.value);
    const frameW = p5Instance.width;
    const frameH = p5Instance.height;
    
    const rows = Math.ceil(frameCount / cols);
    const sheetW = cols * frameW;
    const sheetH = rows * frameH;

    showToast(`Generando Sprite Sheet de ${cols}x${rows}...`);
    elements.exportSpriteBtn.disabled = true;

    const wasPlaying = getState().isPlaying;
    if (wasPlaying) events.emit('playback:toggle');
    
    const spriteSheet = p5Instance.createGraphics(sheetW, sheetH);
    spriteSheet.pixelDensity(1);
    
    const startTime = timeline.markerInTime !== null ? timeline.markerInTime : 0;
    const endTime = timeline.markerOutTime !== null ? timeline.markerOutTime : media.duration();
    const duration = endTime - startTime;

    for (let i = 0; i < frameCount; i++) {
        const progress = (frameCount > 1) ? i / (frameCount - 1) : 0;
        const time = startTime + progress * duration;
        media.time(time);
        
        if (window.triggerRedraw) window.triggerRedraw();
        await new Promise(r => setTimeout(r, 50));
        
        const x = (i % cols) * frameW;
        const y = Math.floor(i / cols) * frameH;
        
        spriteSheet.image(p5Instance.get(), x, y, frameW, frameH);
    }
    
    p5Instance.save(spriteSheet, `ditherlab_sprite_${config.effect}_${Date.now()}.png`);
    spriteSheet.remove();
    
    showToast('Sprite Sheet exportado correctamente.');
    elements.exportSpriteBtn.disabled = false;
    
    media.time(startTime);
    if (wasPlaying) events.emit('playback:toggle');
}

function startRecording() {
    const { media, mediaType, config, isPlaying, timeline } = getState();
    if (mediaType !== 'video') {
        showToast('Solo se puede grabar con videos cargados.');
        return;
    }
    
    const qualitySelector = document.getElementById('webmQualitySelector');
    const selectedButton = qualitySelector.querySelector('.bg-cyan-600');
    const selectedQuality = selectedButton ? selectedButton.dataset.quality : 'medium';
    const bitrate = WEBM_BITRATES[selectedQuality];
    
    showToast(`Iniciando grabación en calidad: ${selectedQuality.charAt(0).toUpperCase() + selectedQuality.slice(1)}`);

    originalCanvasWidth = p5Instance.width;
    originalCanvasHeight = p5Instance.height;

    const useMarkers = elements.webmUseMarkersToggle.checked;
    const startTime = useMarkers && timeline.markerInTime !== null ? timeline.markerInTime : 0;
    const endTime = useMarkers && timeline.markerOutTime !== null ? timeline.markerOutTime : media.duration();
    
    media.time(startTime);

    // =================================================================
    // ========= INICIO DE LA LÓGICA DE REDIMENSIONAMIENTO CORREGIDA =========
    // =================================================================
    let exportWidth = media.width;
    let exportHeight = media.height;

    const maxDimension = (selectedQuality === 'ultra') ? 1920 : 1080;
    const longestSide = Math.max(exportWidth, exportHeight);

    if (longestSide > maxDimension) {
        const scale = maxDimension / longestSide;
        exportWidth = Math.floor(exportWidth * scale);
        exportHeight = Math.floor(exportHeight * scale);
    }
    // =================================================================
    // ============ FIN DE LA LÓGICA DE REDIMENSIONAMIENTO CORREGIDA ============
    // =================================================================
    
    p5Instance.resizeCanvas(exportWidth, exportHeight);
    p5Instance.frameRate(30);

    if (!isPlaying) {
        events.emit('playback:toggle');
    }

    const canvas = p5Instance.canvas;
    if (!canvas) {
        console.error('Canvas no disponible.', canvas);
        showToast('Error: Canvas no disponible.');
        p5Instance.resizeCanvas(originalCanvasWidth, originalCanvasHeight);
        p5Instance.frameRate(60);
        return;
    }

    try {
        const stream = canvas.captureStream(30);
        const mimeType = 'video/webm;codecs=vp8';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
            showToast('Error: El códec video/webm;codecs=vp8 no es soportado.', 4000);
            p5Instance.resizeCanvas(originalCanvasWidth, originalCanvasHeight);
            p5Instance.frameRate(60);
            return;
        }

        recorder = new MediaRecorder(stream, {
            mimeType: mimeType,
            videoBitsPerSecond: bitrate
        });

        recorder.ondataavailable = e => {
            if (e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = () => {
            const blob = new Blob(chunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ditherlab_v7_${config.effect}_${Date.now()}.webm`;
            a.click();
            URL.revokeObjectURL(url);
            chunks = [];

            p5Instance.resizeCanvas(originalCanvasWidth, originalCanvasHeight);
            p5Instance.frameRate(60);
            
            updateState({ isRecording: false });
            events.emit('export:finished');
            showToast('Video WebM exportado correctamente.');
        };

        let checkInterval = null;
        if (useMarkers && timeline.markerOutTime !== null) {
            checkInterval = setInterval(() => {
                if (media.time() >= endTime) {
                    stopRecording();
                }
            }, 100);
        }
        recorder.checkInterval = checkInterval;

        recorder.start();
        updateState({ isRecording: true });
        events.emit('export:started');
    } catch (error) {
        console.error('Error al iniciar grabación:', error);
        let errorMessage = 'Error al iniciar la grabación.';
        if (error.message && error.message.toLowerCase().includes('hardware acceleration')) {
            errorMessage = 'Error: Habilita la aceleración por hardware en tu navegador para poder grabar.';
        }
        showToast(errorMessage, 5000);
        p5Instance.resizeCanvas(originalCanvasWidth, originalCanvasHeight);
        p5Instance.frameRate(60);
    }
}

function stopRecording() {
    if (recorder && recorder.state === 'recording') {
        if (recorder.checkInterval) {
            clearInterval(recorder.checkInterval);
            recorder.checkInterval = null;
        }
        recorder.stop();
        showToast('Deteniendo grabación...');
    } else {
        showToast('No hay grabación activa.');
    }
}

async function exportGif() {
    const { media, mediaType, config, timeline, mediaInfo } = getState();
    
    if (mediaType !== 'video') {
        showToast('Solo se puede exportar GIF desde videos.');
        return;
    }

    const aspectRatio = mediaInfo.height / mediaInfo.width;
    const newWidth = parseInt(elements.gifWidthSlider.value);
    const newHeight = Math.round(newWidth * aspectRatio);

    const useMarkers = elements.gifUseMarkersToggle.checked;
    const startTime = useMarkers && timeline.markerInTime !== null ? timeline.markerInTime : 0;
    const endTime = useMarkers && timeline.markerOutTime !== null ? timeline.markerOutTime : media.duration();
    const fps = parseInt(elements.gifFpsSlider.value);
    const quality = parseInt(elements.gifQualitySlider.value);
    
    showToast(`Generando GIF de ${newWidth}x${newHeight}... Esto puede tardar.`);
    elements.exportGifBtn.disabled = true;
    elements.gifProgress.classList.remove('hidden');

    try {
        const gif = new GIF({
            workers: 2,
            quality: quality,
            width: newWidth,
            height: newHeight,
            workerScript: './js/gif.worker.js'
        });

        const frameDuration = 1 / fps;
        const totalFrames = Math.floor((endTime - startTime) * fps);
        
        const wasPlaying = getState().isPlaying;
        media.time(startTime);
        if (!wasPlaying) {
            events.emit('playback:toggle');
        }
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = newWidth;
        tempCanvas.height = newHeight;
        const tempCtx = tempCanvas.getContext('2d');

        for (let i = 0; i < totalFrames; i++) {
            const time = startTime + (i * frameDuration);
            
            await new Promise(resolve => {
                media.elt.onseeked = () => {
                    media.elt.onseeked = null;
                    resolve();
                };
                media.time(time);
            });
            
            if (window.triggerRedraw) window.triggerRedraw();
            await new Promise(r => setTimeout(r, 20));

            tempCtx.drawImage(p5Instance.canvas, 0, 0, newWidth, newHeight);
            gif.addFrame(tempCanvas, { copy: true, delay: 1000 / fps });
            
            const progress = ((i + 1) / totalFrames) * 100;
            elements.gifProgressText.textContent = `${Math.round(progress)}%`;
            elements.gifProgressBar.style.width = `${progress}%`;
        }

        gif.on('finished', (blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ditherlab_v7_${config.effect}_${Date.now()}.gif`;
            a.click();
            URL.revokeObjectURL(url);
            
            elements.exportGifBtn.disabled = false;
            elements.gifProgress.classList.add('hidden');
            elements.gifProgressBar.style.width = '0%';
            
            showToast('GIF exportado correctamente.');
            
            media.time(startTime);
            if (!wasPlaying && getState().isPlaying) {
                events.emit('playback:toggle');
            }
        });

        gif.render();

    } catch (error) {
        console.error('Error al exportar GIF:', error);
        showToast('Error al exportar GIF.');
        elements.exportGifBtn.disabled = false;
        elements.gifProgress.classList.add('hidden');
    }
}

function downloadPNG() {
    const { config } = getState();
    p5Instance.saveCanvas(`ditherlab_v7_${config.effect}_${Date.now()}`, 'png');
    showToast('Imagen PNG exportada.');
}

export function initializeExporter(p5Inst) {
    p5Instance = p5Inst;
    queryElements();

    elements.recBtn.addEventListener('click', startRecording);
    elements.stopBtn.addEventListener('click', stopRecording);
    elements.downloadImageBtn.addEventListener('click', downloadPNG);
    elements.exportGifBtn.addEventListener('click', exportGif);
    elements.exportSpriteBtn.addEventListener('click', exportSpriteSheet);

    const gifEstimateTriggers = ['gifWidthSlider', 'gifFpsSlider', 'gifQualitySlider', 'gifUseMarkersToggle'];
    gifEstimateTriggers.forEach(id => {
        if(elements[id]) elements[id].addEventListener('input', updateGifDimensionsEstimate);
    });
    
    if (elements.gifWidthSlider) {
        elements.gifWidthSlider.addEventListener('input', (e) => {
            if(elements.gifWidthVal) elements.gifWidthVal.textContent = e.target.value;
        });
    }

    const qualityButtons = document.querySelectorAll('.webm-quality-btn');
    qualityButtons.forEach(button => {
        button.addEventListener('click', () => {
            qualityButtons.forEach(btn => {
                btn.classList.remove('bg-cyan-600', 'text-white');
                btn.classList.add('bg-slate-700');
            });
            button.classList.add('bg-cyan-600', 'text-white');
            button.classList.remove('bg-slate-700');
        });
    });

    events.on('export:start-recording', startRecording);
    events.on('export:stop-recording', stopRecording);
    events.on('export:png', downloadPNG);
    events.on('timeline:updated', updateGifDimensionsEstimate);
    events.on('media:loaded', () => setTimeout(updateGifDimensionsEstimate, 100));

    events.on('export:started', () => {
        elements.recBtn.disabled = true;
        elements.stopBtn.classList.remove('hidden');
        elements.recIndicator.classList.remove('hidden');
        elements.status.textContent = 'Grabando...';
    });

    events.on('export:finished', () => {
        elements.recBtn.disabled = false;
        elements.stopBtn.classList.add('hidden');
        elements.recIndicator.classList.add('hidden');
        elements.status.textContent = 'Listo';
    });
    
    events.on('state:updated', (state) => {
        const isVideo = state.mediaType === 'video';
        elements.recBtn.disabled = !isVideo;
        elements.exportGifBtn.disabled = !isVideo;
        if (elements.exportSpriteBtn) elements.exportSpriteBtn.disabled = !isVideo;
        if (elements.exportSequenceBtn) elements.exportSequenceBtn.disabled = !isVideo;
    });

    console.log('Exporter Module inicializado.');
}
