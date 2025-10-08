/**
 * ============================================================================
 * DitherLab v7 - Módulo de Exportación
 * ============================================================================
 * - Gestiona toda la lógica para exportar el canvas en diferentes formatos:
 * WebM, GIF, PNG, secuencias PNG y hojas de sprites (Sprite Sheets).
 * - Interactúa con librerías externas (gif.js) y APIs del navegador
 * (MediaRecorder).
 * ============================================================================
 */
import { events } from '../app/events.js';
import { getState, updateState } from '../app/state.js';
import { showToast } from '../utils/helpers.js';

let elements = {};
let p5Instance;
let recorder;
let chunks = [];

function queryElements() {
    const ids = [
        'recBtn', 'stopBtn', 'recIndicator', 'status',
        'downloadImageBtn', 'exportGifBtn', 'gifProgress', 'gifProgressText', 'gifProgressBar',
        'gifFpsSlider', 'gifQualitySlider', 'gifUseMarkersToggle', 'webmUseMarkersToggle',
        'exportSpriteBtn', 'spriteColsSlider', 'spriteFrameCountSlider',
        'exportSequenceBtn'
    ];
    ids.forEach(id => (elements[id] = document.getElementById(id)));
}

function startRecording() {
    const { media, mediaType, config } = getState();
    if (mediaType !== 'video') {
        showToast('Solo se puede grabar con videos cargados.');
        return;
    }

    const useMarkers = elements.webmUseMarkersToggle.checked;
    const { markerInTime } = getState().timeline;
    const startTime = useMarkers && markerInTime !== null ? markerInTime : 0;

    media.time(startTime);

    // ✅ CORREGIDO: p5Instance.canvas ya es el elemento HTML del canvas.
    // No se necesita acceder a .elt
    const canvas = p5Instance.canvas;
    
    if (!canvas) {
        console.error('Canvas no disponible:', canvas);
        showToast('Error: Canvas no disponible.');
        return;
    }

    try {
        // ✅ CORREGIDO: Usar 'canvas' directamente
        const stream = canvas.captureStream(30);
        recorder = new MediaRecorder(stream, {
            mimeType: 'video/webm;codecs=vp9',
            videoBitsPerSecond: 12000000
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
            updateState({ isRecording: false });
            events.emit('export:finished');
            showToast('Video WebM exportado correctamente.');
        };

        recorder.start();
        updateState({ isRecording: true });
        events.emit('export:started');
        showToast('Grabando... Presiona "Detener" o tecla S.');

    } catch (error) {
        console.error('Error al iniciar grabación:', error);
        showToast('Error al iniciar la grabación.');
    }
}

function stopRecording() {
    if (recorder && recorder.state === 'recording') {
        recorder.stop();
        showToast('Deteniendo grabación...');
    } else {
        showToast('No hay grabación activa.');
    }
}

async function exportGif() {
    const { media, mediaType, config, timeline } = getState();
    
    if (mediaType !== 'video') {
        showToast('Solo se puede exportar GIF desde videos.');
        return;
    }

    const useMarkers = elements.gifUseMarkersToggle.checked;
    const startTime = useMarkers && timeline.markerInTime !== null ? timeline.markerInTime : 0;
    const endTime = useMarkers && timeline.markerOutTime !== null ? timeline.markerOutTime : media.duration();
    const fps = parseInt(elements.gifFpsSlider.value);
    const quality = parseInt(elements.gifQualitySlider.value);
    
    showToast('Generando GIF... Esto puede tardar.');
    elements.exportGifBtn.disabled = true;
    elements.gifProgress.classList.remove('hidden');

    try {
        const gif = new GIF({
            workers: 2,
            quality: quality,
            width: p5Instance.width,
            height: p5Instance.height,
            workerScript: './js/gif.worker.js'
        });

        const frameDuration = 1 / fps;
        const totalFrames = Math.floor((endTime - startTime) * fps);
        
        const wasPlaying = getState().isPlaying;
        if (wasPlaying) events.emit('playback:toggle');
        
        media.time(startTime);

        for (let i = 0; i < totalFrames; i++) {
            const time = startTime + (i * frameDuration);
            media.time(time);
            
            if (window.triggerRedraw) window.triggerRedraw();
            await new Promise(r => setTimeout(r, 50));

            // ✅ CORREGIDO: Usar p5Instance.canvas directamente
            gif.addFrame(p5Instance.canvas, { copy: true, delay: 1000 / fps });
            
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
            if (wasPlaying) events.emit('playback:toggle');
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

    events.on('export:start-recording', startRecording);
    events.on('export:stop-recording', stopRecording);
    events.on('export:png', downloadPNG);

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
