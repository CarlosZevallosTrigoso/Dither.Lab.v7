/**
 * ============================================================================
 * DitherLab v7 - Módulo de Exportación (VERSIÓN CORREGIDA Y ROBUSTA)
 * ============================================================================
 * - Se ha reescrito la lógica de captura de frames para garantizar la
 * sincronización y evitar condiciones de carrera.
 * - Se usa un sistema basado en Promises y requestAnimationFrame para asegurar
 * que cada frame se renderiza completamente antes de ser capturado.
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
    ultra: 20000000  // 20 Mbps
};

function queryElements() {
    const ids = [
        'recBtn', 'stopBtn', 'recIndicator', 'status', 'downloadImageBtn',
        'exportGifBtn', 'gifProgress', 'gifProgressText', 'gifProgressBar',
        'gifFpsSlider', 'gifQualitySlider', 'gifUseMarkersToggle', 'webmUseMarkersToggle',
        'gifWidthSlider', 'gifWidthVal', 'gifDimensionsEstimate', 'exportSpriteBtn',
        'spriteColsSlider', 'spriteFrameCountSlider', 'exportSequenceBtn'
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

/**
 * Función robusta para buscar un tiempo específico en el video y esperar
 * a que el frame sea renderizado en el canvas.
 * @param {p5.MediaElement} media - El elemento de video.
 * @param {number} time - El tiempo en segundos al que saltar.
 * @returns {Promise<void>} Una promesa que se resuelve cuando el frame está listo.
 */
function seekAndEnsureRender(media, time) {
    return new Promise(resolve => {
        const onSeeked = () => {
            media.elt.removeEventListener('seeked', onSeeked);
            // Usamos requestAnimationFrame para esperar al siguiente ciclo de pintado del navegador
            requestAnimationFrame(() => {
                events.emit('render:force-redraw');
                // Un segundo rAF para asegurar que p5.js ha dibujado en el canvas
                requestAnimationFrame(resolve);
            });
        };
        media.elt.addEventListener('seeked', onSeeked, { once: true });
        media.time(time);
    });
}

async function exportWithFrames(processFrame, onProgress, onFinish, options) {
    const { media, mediaType, config, timeline } = getState();
    if (mediaType !== 'video') {
        showToast('Esta exportación solo funciona con videos.');
        return;
    }

    const { useMarkers, fps, totalFrames, getDimensions } = options;
    const { width, height } = getDimensions();

    const startTime = useMarkers && timeline.markerInTime !== null ? timeline.markerInTime : 0;
    let endTime = useMarkers && timeline.markerOutTime !== null ? timeline.markerOutTime : media.duration();
    if (endTime <= startTime) endTime = media.duration();

    const duration = endTime - startTime;
    const frameDuration = 1 / fps;
    const frameCount = totalFrames || Math.floor(duration * fps);
    
    showToast(`Iniciando exportación de ${frameCount} frames...`);
    Object.values(elements).forEach(el => { if(el.tagName === 'BUTTON') el.disabled = true; });

    const wasPlaying = getState().isPlaying;
    if (wasPlaying) events.emit('playback:toggle');

    const originalTime = media.time();

    try {
        for (let i = 0; i < frameCount; i++) {
            const time = startTime + (i * frameDuration);
            if (time > media.duration()) break;

            await seekAndEnsureRender(media, time);
            
            // Capturar el frame después de asegurar el renderizado
            const canvasFrame = p5Instance.get();
            await processFrame(canvasFrame, i, width, height);

            onProgress(((i + 1) / frameCount) * 100);
        }
        onFinish();
    } catch (error) {
        console.error('Error durante la exportación por frames:', error);
        showToast('Ocurrió un error durante la exportación.', 4000);
    } finally {
        // Restaurar estado
        await seekAndEnsureRender(media, originalTime);
        if (wasPlaying) events.emit('playback:toggle');
        Object.values(elements).forEach(el => { if(el.tagName === 'BUTTON') el.disabled = false; });
    }
}


async function exportGif() {
    let gif;
    let tempCanvas;
    let tempCtx;

    const options = {
        useMarkers: elements.gifUseMarkersToggle.checked,
        fps: parseInt(elements.gifFpsSlider.value),
        getDimensions: () => {
            const { mediaInfo } = getState();
            const aspectRatio = mediaInfo.height / mediaInfo.width;
            const width = parseInt(elements.gifWidthSlider.value);
            const height = Math.round(width * aspectRatio);
            return { width, height };
        }
    };

    const { width, height } = options.getDimensions();
    const quality = parseInt(elements.gifQualitySlider.value);
    
    gif = new GIF({ workers: 2, quality, width, height, workerScript: './js/gif.worker.js' });
    tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    tempCtx = tempCanvas.getContext('2d');

    elements.gifProgress.classList.remove('hidden');

    const processFrame = (frame) => {
        tempCtx.drawImage(frame.canvas, 0, 0, width, height);
        gif.addFrame(tempCanvas, { copy: true, delay: 1000 / options.fps });
    };
    
    const onProgress = (progress) => {
        elements.gifProgressText.textContent = `${Math.round(progress)}%`;
        elements.gifProgressBar.style.width = `${progress}%`;
    };

    const onFinish = () => {
        gif.render();
    };

    gif.on('finished', (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ditherlab_v7_${getState().config.effect}_${Date.now()}.gif`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        elements.gifProgress.classList.add('hidden');
        elements.gifProgressBar.style.width = '0%';
        showToast('GIF exportado correctamente.');
    });

    exportWithFrames(processFrame, onProgress, onFinish, options);
}

function startRecording() {
    const { media, mediaType, config, isPlaying, timeline } = getState();
    if (mediaType !== 'video') return showToast('Solo se puede grabar con videos.');

    const qualitySelector = document.getElementById('webmQualitySelector');
    const selectedButton = qualitySelector.querySelector('.bg-cyan-600');
    const quality = selectedButton ? selectedButton.dataset.quality : 'medium';
    
    showToast(`Iniciando grabación en calidad: ${quality}`);

    originalCanvasWidth = p5Instance.width;
    originalCanvasHeight = p5Instance.height;

    const useMarkers = elements.webmUseMarkersToggle.checked;
    const startTime = useMarkers && timeline.markerInTime !== null ? timeline.markerInTime : 0;
    const endTime = useMarkers && timeline.markerOutTime !== null ? timeline.markerOutTime : media.duration();
    
    media.time(startTime);
    let exportWidth = media.width, exportHeight = media.height;
    const maxDim = (quality === 'ultra') ? 1920 : 1080;
    if (Math.max(exportWidth, exportHeight) > maxDim) {
        const scale = maxDim / Math.max(exportWidth, exportHeight);
        exportWidth = Math.floor(exportWidth * scale);
        exportHeight = Math.floor(exportHeight * scale);
    }
    
    p5Instance.resizeCanvas(exportWidth, exportHeight);
    if (!isPlaying) events.emit('playback:toggle');

    try {
        const stream = p5Instance.canvas.captureStream(30);
        recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8', videoBitsPerSecond: WEBM_BITRATES[quality] });
        chunks = [];
        recorder.ondataavailable = e => e.data.size > 0 && chunks.push(e.data);
        recorder.onstop = () => {
            const blob = new Blob(chunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ditherlab_v7_${config.effect}_${Date.now()}.webm`;
            a.click();
            URL.revokeObjectURL(url);
            
            p5Instance.resizeCanvas(originalCanvasWidth, originalCanvasHeight);
            updateState({ isRecording: false });
            events.emit('export:finished');
            showToast('WebM exportado.');
        };
        
        // Bucle de chequeo dentro del evento de renderizado para máxima precisión
        const checkEndTime = () => {
            if (media.time() >= endTime) {
                stopRecording();
            } else if (getState().isRecording) {
                // Sigue escuchando en el próximo frame
                events.on('render:frame-drawn', checkEndTime, { once: true });
            }
        };
        events.on('render:frame-drawn', checkEndTime, { once: true });

        recorder.start();
        updateState({ isRecording: true });
        events.emit('export:started');
    } catch (error) {
        console.error('Error al iniciar grabación:', error);
        showToast('Error al iniciar la grabación.', 5000);
        p5Instance.resizeCanvas(originalCanvasWidth, originalCanvasHeight);
    }
}

function stopRecording() {
    if (recorder && recorder.state === 'recording') {
        recorder.stop();
        showToast('Deteniendo grabación...');
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
    // Placeholder para sprite sheet, se puede reimplementar con exportWithFrames si es necesario
    elements.exportSpriteBtn.addEventListener('click', () => showToast('Sprite Sheet no implementado en esta versión.'));
    
    ['gifWidthSlider', 'gifFpsSlider', 'gifQualitySlider', 'gifUseMarkersToggle'].forEach(id => {
        if(elements[id]) elements[id].addEventListener('input', updateGifDimensionsEstimate);
    });
    
    if (elements.gifWidthSlider) {
        elements.gifWidthSlider.addEventListener('input', e => elements.gifWidthVal.textContent = e.target.value);
    }

    document.querySelectorAll('.webm-quality-btn').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.webm-quality-btn').forEach(btn => btn.classList.replace('bg-cyan-600', 'bg-slate-700'));
            button.classList.replace('bg-slate-700', 'bg-cyan-600');
        });
    });

    events.on('export:start-recording', startRecording);
    events.on('export:stop-recording', stopRecording);
    events.on('export:png', downloadPNG);
    events.on('media:loaded', () => setTimeout(updateGifDimensionsEstimate, 100));

    events.on('state:updated', (state) => {
        const isVideo = state.mediaType === 'video';
        const isRecording = state.isRecording;
        elements.recBtn.disabled = !isVideo || isRecording;
        elements.stopBtn.classList.toggle('hidden', !isRecording);
        elements.recIndicator.classList.toggle('hidden', !isRecording);
        elements.status.textContent = isRecording ? 'Grabando...' : 'Listo';
        elements.exportGifBtn.disabled = !isVideo || isRecording;
        elements.exportSpriteBtn.disabled = !isVideo || isRecording;
    });

    console.log('Exporter Module (Robust) inicializado.');
}
