/**
 * ============================================================================
 * DitherLab v7 - Módulo de Exportación
 * ============================================================================
 * - Gestiona toda la lógica para exportar el canvas en diferentes formatos:
 * WebM, GIF, PNG, secuencias PNG y hojas de sprites (Sprite Sheets).
 * - Interactúa con librerías externas (gif.js) y APIs del navegador
 * (MediaRecorder).
 * =_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=_=
 */
import { events } from '../app/events.js';
import { getState } from '../app/state.js';
import { showToast } from '../utils/helpers.js';

let elements = {};
let p5; // Instancia de p5.js
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
    if (mediaType !== 'video') return;

    const useMarkers = elements.webmUseMarkersToggle.checked;
    const { markerInTime, markerOutTime } = getState().timeline;
    const startTime = useMarkers && markerInTime !== null ? markerInTime : 0;

    media.time(startTime);

    events.emit('export:started'); // Notificar a otros módulos (ej: UI para desactivar botones)

    const stream = p5.canvas.elt.captureStream(30);
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
        events.emit('export:finished');
        showToast('Video WebM exportado.');
    };

    recorder.start();
}

function stopRecording() {
    if (recorder?.state === 'recording') {
        recorder.stop();
    }
}

async function exportGif() {
    // ... Lógica de exportación a GIF, usando gif.js
    // Esta función llamará a showToast y actualizará la barra de progreso.
    showToast('Exportando GIF...');
}

function downloadPNG() {
    const { config } = getState();
    p5.saveCanvas(`ditherlab_v7_${config.effect}_${Date.now()}`, 'png');
}

/**
 * Inicializa el módulo de exportación.
 * @param {p5} p5Instance - La instancia de p5.js.
 */
export function initializeExporter(p5Instance) {
    p5 = p5Instance;
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
    events.on('state:updated', ({mediaType}) => {
        const isVideo = mediaType === 'video';
        elements.recBtn.disabled = !isVideo;
        elements.exportGifBtn.disabled = !isVideo;
        elements.exportSpriteBtn.disabled = !isVideo;
        elements.exportSequenceBtn.disabled = !isVideo;
    });

    console.log('Exporter Module inicializado.');
}