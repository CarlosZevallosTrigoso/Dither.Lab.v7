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
let p5Instance; // ✅ Renombrado para evitar confusión
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
    const { markerInTime, markerOutTime } = getState().timeline;
    const startTime = useMarkers && markerInTime !== null ? markerInTime : 0;

    media.time(startTime);

    // ✅ CORREGIDO: Acceso correcto al canvas
    const canvas = p5Instance.canvas;
    
    if (!canvas || !canvas.elt) {
        console.error('Canvas no disponible:', canvas);
        showToast('Error: Canvas no disponible.');
        return;
    }

    try {
        const stream = canvas.elt.captureStream(30);
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
        // Crear instancia de GIF.js
        const gif = new GIF({
            workers: 2,
            quality: quality,
            width: p5Instance.width,
            height: p5Instance.height,
            workerScript: './js/gif.worker.js'
        });

        const frameDuration = 1 / fps;
        const totalFrames = Math.floor((endTime - startTime) * fps);
        let currentFrame = 0;

        // Pausar el video y posicionarlo
        const wasPlaying = getState().isPlaying;
        if (wasPlaying) events.emit('playback:toggle');
        
        media.time(startTime);

        // Capturar frames
        const captureFrame = () => {
            return new Promise((resolve) => {
                setTimeout(() => {
                    // Copiar el canvas actual
                    const canvas = p5Instance.canvas.elt;
                    const ctx = canvas.getContext('2d');
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    
                    gif.addFrame(imageData, { delay: (1000 / fps) });
                    
                    currentFrame++;
                    const progress = (currentFrame / totalFrames) * 100;
                    elements.gifProgressText.textContent = `${Math.round(progress)}%`;
                    elements.gifProgressBar.style.width = `${progress}%`;
                    
                    resolve();
                }, 100);
            });
        };

        // Capturar todos los frames
        for (let i = 0; i < totalFrames; i++) {
            const time = startTime + (i * frameDuration);
            media.time(time);
            await new Promise(r => setTimeout(r, 50)); // Esperar que el frame se actualice
            await captureFrame();
        }

        // Renderizar GIF
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
            
            // Restaurar estado
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

/**
 * Inicializa el módulo de exportación.
 * @param {p5} p5Inst - La instancia de p5.js.
 */
export function initializeExporter(p5Inst) {
    p5Instance = p5Inst;
    queryElements();

    // Listeners de botones
    elements.recBtn.addEventListener('click', startRecording);
    elements.stopBtn.addEventListener('click', stopRecording);
    elements.downloadImageBtn.addEventListener('click', downloadPNG);
    elements.exportGifBtn.addEventListener('click', exportGif);

    // Listeners de eventos de la aplicación
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
    
    // Desactivar botones si no hay un video cargado
    events.on('state:updated', (state) => {
        const isVideo = state.mediaType === 'video';
        elements.recBtn.disabled = !isVideo;
        elements.exportGifBtn.disabled = !isVideo;
        if (elements.exportSpriteBtn) elements.exportSpriteBtn.disabled = !isVideo;
        if (elements.exportSequenceBtn) elements.exportSequenceBtn.disabled = !isVideo;
    });

    console.log('Exporter Module inicializado.');
}
