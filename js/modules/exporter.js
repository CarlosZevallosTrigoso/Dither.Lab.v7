/**
 * ============================================================================
 * DitherLab v7 - Módulo de Exportación
 * ============================================================================
 * - Gestiona toda la lógica para exportar el canvas en diferentes formatos:
 * WebM, GIF, PNG.
 * ============================================================================
 */
import { events } from '../app/events.js';
import { getState, updateState } from '../app/state.js';
import { showToast } from '../utils/helpers.js';

let elements = {};
let p5Instance;
let recorder;
let chunks = [];
// ✅ NUEVO: Variables para restaurar el canvas
let originalCanvasWidth, originalCanvasHeight;

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
    const { media, mediaType, config, isPlaying, timeline } = getState();
    if (mediaType !== 'video') {
        showToast('Solo se puede grabar con videos cargados.');
        return;
    }

    // ✅ RESTAURADO: Guardar dimensiones originales del canvas
    originalCanvasWidth = p5Instance.width;
    originalCanvasHeight = p5Instance.height;

    const useMarkers = elements.webmUseMarkersToggle.checked;
    const startTime = useMarkers && timeline.markerInTime !== null ? timeline.markerInTime : 0;
    const endTime = useMarkers && timeline.markerOutTime !== null ? timeline.markerOutTime : media.duration();
    
    media.time(startTime);

    // ✅ RESTAURADO: Lógica de redimensionamiento para alta calidad
    const maxDimension = 1080;
    let exportWidth = media.width;
    let exportHeight = media.height;
    const longestSide = Math.max(exportWidth, exportHeight);
    if (longestSide > maxDimension) {
        const scale = maxDimension / longestSide;
        exportWidth = Math.floor(exportWidth * scale);
        exportHeight = Math.floor(exportHeight * scale);
    }
    p5Instance.resizeCanvas(exportWidth, exportHeight);

    // ✅ RESTAURADO: Forzar la reproducción si el video está pausado
    if (!isPlaying) {
        events.emit('playback:toggle');
    }

    const canvas = p5Instance.canvas;
    if (!canvas) {
        console.error('Canvas no disponible.');
        showToast('Error: Canvas no disponible.');
        // Restaurar canvas si falla
        p5Instance.resizeCanvas(originalCanvasWidth, originalCanvasHeight);
        return;
    }

    try {
        const stream = canvas.captureStream(30);
        recorder = new MediaRecorder(stream, {
            mimeType: 'video/webm;codecs=vp9',
            videoBitsPerSecond: 12000000 // Bitrate alto para buena calidad
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

            // ✅ RESTAURADO: Restaurar tamaño original del canvas
            p5Instance.resizeCanvas(originalCanvasWidth, originalCanvasHeight);
            
            updateState({ isRecording: false });
            events.emit('export:finished');
            showToast('Video WebM exportado correctamente.');
        };

        // ✅ NUEVO: Lógica para detener la grabación en el marcador de salida
        let checkInterval = null;
        if (useMarkers && timeline.markerOutTime !== null) {
            checkInterval = setInterval(() => {
                if (media.time() >= endTime) {
                    stopRecording();
                }
            }, 100);
        }
        // Guardar la referencia al intervalo para poder limpiarlo
        recorder.checkInterval = checkInterval;

        recorder.start();
        updateState({ isRecording: true });
        events.emit('export:started');
        showToast('Grabando... Presiona "Detener" o tecla S.');

    } catch (error) {
        console.error('Error al iniciar grabación:', error);
        showToast('Error al iniciar la grabación.');
        // Restaurar canvas si falla
        p5Instance.resizeCanvas(originalCanvasWidth, originalCanvasHeight);
    }
}

function stopRecording() {
    if (recorder && recorder.state === 'recording') {
        // ✅ RESTAURADO: Limpiar el intervalo de verificación
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

// ... (El resto del archivo: exportGif, downloadPNG, initializeExporter, etc. se mantiene igual que en la versión anterior que te pasé)
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
