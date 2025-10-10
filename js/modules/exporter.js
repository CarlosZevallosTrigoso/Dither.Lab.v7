/**
 * ============================================================================
 * DitherLab v7 - Módulo de Exportación (VERSIÓN CORREGIDA Y ROBUSTA)
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
let stopRecordingAtTime = -1;

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

function seekAndEnsureRender(media, time) {
    return new Promise(resolve => {
        const onSeeked = () => {
            media.elt.removeEventListener('seeked', onSeeked);
            requestAnimationFrame(() => {
                events.emit('render:force-redraw');
                requestAnimationFrame(resolve);
            });
        };
        media.elt.addEventListener('seeked', onSeeked, { once: true });
        media.time(time);
    });
}

async function exportWithFrames(processFrame, onProgress, onFinish, options) {
    const { media, mediaType, timeline } = getState();
    if (mediaType !== 'video') return showToast('Esta exportación solo funciona con videos.');

    const { useMarkers, fps, totalFrames, getDimensions } = options;
    const { width, height } = getDimensions();

    const startTime = useMarkers && timeline.markerInTime !== null ? timeline.markerInTime : 0;
    let endTime = useMarkers && timeline.markerOutTime !== null ? timeline.markerOutTime : media.duration();
    if (endTime <= startTime) endTime = media.duration();

    const duration = endTime - startTime;
    const frameCount = totalFrames || Math.floor(duration * fps);
    
    showToast(`Iniciando exportación de ${frameCount} frames...`);
    Object.values(elements).forEach(el => { if(el.tagName === 'BUTTON') el.disabled = true; });

    const wasPlaying = getState().isPlaying;
    if (wasPlaying) events.emit('playback:toggle');
    const originalTime = media.time();

    try {
        for (let i = 0; i < frameCount; i++) {
            const time = startTime + (i / fps);
            if (time > media.duration()) break;
            await seekAndEnsureRender(media, time);
            const canvasFrame = p5Instance.get();
            await processFrame(canvasFrame, i, width, height);
            onProgress(((i + 1) / frameCount) * 100);
        }
        onFinish();
    } catch (error) {
        console.error('Error durante la exportación por frames:', error);
        showToast('Ocurrió un error durante la exportación.', 4000);
    } finally {
        await seekAndEnsureRender(media, originalTime);
        if (wasPlaying) events.emit('playback:toggle');
        Object.values(elements).forEach(el => { if(el.tagName === 'BUTTON') el.disabled = false; });
    }
}

async function exportGif() {
    let gif;
    const options = {
        useMarkers: elements.gifUseMarkersToggle.checked,
        fps: parseInt(elements.gifFpsSlider.value),
        getDimensions: () => {
            const { mediaInfo } = getState();
            const aspectRatio = mediaInfo.height / mediaInfo.width;
            const width = parseInt(elements.gifWidthSlider.value);
            return { width, height: Math.round(width * aspectRatio) };
        }
    };
    const { width, height } = options.getDimensions();
    const quality = parseInt(elements.gifQualitySlider.value);
    gif = new GIF({ workers: 2, quality, width, height, workerScript: './js/gif.worker.js' });

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');
    elements.gifProgress.classList.remove('hidden');

    const processFrame = (frame) => {
        tempCtx.drawImage(frame.canvas, 0, 0, width, height);
        gif.addFrame(tempCanvas, { copy: true, delay: 1000 / options.fps });
    };
    const onProgress = (progress) => {
        elements.gifProgressText.textContent = `${Math.round(progress)}%`;
        elements.gifProgressBar.style.width = `${progress}%`;
    };
    gif.on('finished', (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ditherlab_v7_${getState().config.effect}_${Date.now()}.gif`;
        a.click();
        URL.revokeObjectURL(a.href);
        elements.gifProgress.classList.add('hidden');
        showToast('GIF exportado correctamente.');
    });

    exportWithFrames(processFrame, onProgress, () => gif.render(), options);
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
    const endTime = useMarkers && timeline.markerOutTime !== null && timeline.markerOutTime > startTime ? timeline.markerOutTime : media.duration();
    
    media.time(startTime);
    stopRecordingAtTime = endTime; // Usamos una variable global del módulo

    let exportWidth = media.width, exportHeight = media.height;
    const maxDim = (quality === 'ultra') ? 1920 : 1080;
    if (Math.max(exportWidth, exportHeight) > maxDim) {
        const scale = maxDim / Math.max(exportWidth, exportHeight);
        exportWidth = Math.floor(exportWidth * scale);
        exportHeight = Math.floor(exportHeight * scale);
    }
    
    p5Instance.resizeCanvas(exportWidth, exportHeight);
    if (!isPlaying) events.emit('playback:play');

    try {
        const stream = p5Instance.canvas.captureStream(30);
        recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8', videoBitsPerSecond: WEBM_BITRATES[quality] });
        chunks = [];
        recorder.ondataavailable = e => e.data.size > 0 && chunks.push(e.data);
        recorder.onstop = () => {
            const blob = new Blob(chunks, { type: 'video/webm' });
            if (blob.size === 0) {
                showToast('Error: No se generaron datos de video.', 4000);
                return;
            }
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ditherlab_v7_${config.effect}_${Date.now()}.webm`;
            a.click();
            URL.revokeObjectURL(a.href);
            
            p5Instance.resizeCanvas(originalCanvasWidth, originalCanvasHeight);
            updateState({ isRecording: false });
            events.emit('export:finished');
            showToast('WebM exportado.');
        };
        recorder.start();
        updateState({ isRecording: true });
    } catch (error) {
        console.error('Error al iniciar grabación:', error);
        showToast('Error al iniciar la grabación.', 5000);
        p5Instance.resizeCanvas(originalCanvasWidth, originalCanvasHeight);
    }
}

function stopRecording() {
    if (recorder && recorder.state === 'recording') {
        recorder.stop();
        stopRecordingAtTime = -1; // Reseteamos la variable
    }
}

function checkRecordingTime() {
    if (getState().isRecording && stopRecordingAtTime > 0) {
        if (getState().media.time() >= stopRecordingAtTime) {
            stopRecording();
        }
    }
}

function downloadPNG() {
    p5Instance.saveCanvas(`ditherlab_v7_${getState().config.effect}_${Date.now()}`, 'png');
    showToast('Imagen PNG exportada.');
}

export function initializeExporter(p5Inst) {
    p5Instance = p5Inst;
    queryElements();

    elements.recBtn.addEventListener('click', startRecording);
    elements.stopBtn.addEventListener('click', stopRecording);
    elements.downloadImageBtn.addEventListener('click', downloadPNG);
    elements.exportGifBtn.addEventListener('click', exportGif);
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

    events.on('render:frame-drawn', checkRecordingTime); // Hook de tiempo para WebM
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
