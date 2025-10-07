/**
 * ============================================================================
 * DitherLab v7 - Módulo de Timeline y Controles de Video
 * ============================================================================
 * - Gestiona toda la interactividad de la timeline, incluyendo reproducción,
 * marcadores, bucles y velocidad.
 * - Se vincula dinámicamente al medio de video cuando se carga.
 * - Se comunica con otros módulos a través de eventos.
 * ============================================================================
 */
import { events } from '../app/events.js';
import { getState, updateState, updateTimeline } from '../app/state.js';
import { formatTime, showToast } from '../utils/helpers.js';

let elements = {};
let isDraggingScrubber = false;
let currentMedia = null; // Referencia al objeto de video actual

/**
 * Selecciona los elementos del DOM necesarios para el módulo.
 */
function queryElements() {
    const ids = [
        'playBtn', 'restartBtn', 'timelinePanel', 'timeline', 'timelineProgress',
        'timelineScrubber', 'timelineTime', 'markerIn', 'markerOut', 'setInBtn',
        'setOutBtn', 'clearMarkersBtn', 'loopSectionToggle', 'playbackSpeedSlider',
        'playbackSpeedVal', 'prevFrameBtn', 'nextFrameBtn', 'timeDisplay', 'speedDisplay'
    ];
    ids.forEach(id => (elements[id] = document.getElementById(id)));
}

/**
 * Vincula todos los eventos de la timeline a un objeto de medio específico.
 * Esta función es clave y se llama cada vez que se carga un nuevo video.
 * @param {p5.MediaElement} media - El objeto de video de p5.js.
 */
function bindToMedia(media) {
    currentMedia = media;

    // --- Controles de Reproducción (Botones) ---
    elements.playBtn.onclick = () => events.emit('playback:toggle');
    
    elements.restartBtn.onclick = () => {
        if (currentMedia) {
            currentMedia.time(0);
            showToast('Reiniciado');
        }
    };
    
    // ✅ MEJORADO: Botones de frame anterior/siguiente
    elements.prevFrameBtn.onclick = () => {
        events.emit('playback:prev-frame');
    };
    
    elements.nextFrameBtn.onclick = () => {
        events.emit('playback:next-frame');
    };

    // --- Marcadores ---
    elements.setInBtn.onclick = () => {
        events.emit('timeline:set-marker-in');
    };
    
    elements.setOutBtn.onclick = () => {
        events.emit('timeline:set-marker-out');
    };
    
    elements.clearMarkersBtn.onclick = () => {
        updateTimeline({ markerInTime: null, markerOutTime: null });
        showToast('Marcadores limpiados');
    };
    
    elements.loopSectionToggle.onchange = (e) => {
        updateTimeline({ loopSection: e.target.checked });
    };

    // --- Velocidad ---
    elements.playbackSpeedSlider.oninput = (e) => {
        const speed = parseFloat(e.target.value) / 100;
        updateState({ playbackSpeed: speed });
        currentMedia.speed(speed);
    };
    
    // Botones preset de velocidad
    document.querySelectorAll('.speed-preset').forEach(btn => {
        btn.onclick = () => {
            const speed = parseInt(btn.dataset.speed);
            elements.playbackSpeedSlider.value = speed;
            const speedValue = speed / 100;
            updateState({ playbackSpeed: speedValue });
            currentMedia.speed(speedValue);
        };
    });

    // --- Scrubbing en la timeline ---
    const updateScrubPosition = (e) => {
        const { mediaInfo } = getState();
        if (!currentMedia || !mediaInfo || mediaInfo.duration === 0) return;

        const rect = elements.timeline.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const percent = x / rect.width;
        const time = percent * mediaInfo.duration;
        currentMedia.time(time);
        window.triggerRedraw(); // Forzar redibujado inmediato
    };

    elements.timeline.onmousedown = (e) => {
        isDraggingScrubber = true;
        updateScrubPosition(e);
    };

    // Usar 'window' para el mousemove y mouseup para capturar el movimiento
    // incluso si el cursor sale del área de la timeline.
    window.onmousemove = (e) => {
        if (isDraggingScrubber) updateScrubPosition(e);
    };
    
    window.onmouseup = () => {
        isDraggingScrubber = false;
    };
}

/**
 * Actualiza la UI de la timeline (posición del scrubber, textos, etc.).
 * @param {object} state - El estado actual de la aplicación.
 */
function updateTimelineUI(state) {
    const { media, mediaType, mediaInfo, timeline, isPlaying, playbackSpeed } = state;

    elements.timelinePanel.classList.toggle('hidden', mediaType !== 'video');
    if (mediaType !== 'video') return;

    const currentTime = media.time();
    const duration = mediaInfo.duration;
    const percent = (duration > 0) ? (currentTime / duration) * 100 : 0;

    elements.timelineScrubber.style.left = `${percent}%`;
    elements.timelineProgress.style.width = `${percent}%`;
    elements.timelineTime.textContent = formatTime(currentTime);
    elements.timeDisplay.textContent = `${formatTime(currentTime)} / ${formatTime(duration)}`;

    // Actualizar marcadores
    elements.markerIn.style.display = timeline.markerInTime !== null ? 'block' : 'none';
    if (timeline.markerInTime !== null) {
        elements.markerIn.style.left = `${(timeline.markerInTime / duration) * 100}%`;
    }
    elements.markerOut.style.display = timeline.markerOutTime !== null ? 'block' : 'none';
    if (timeline.markerOutTime !== null) {
        elements.markerOut.style.left = `${(timeline.markerOutTime / duration) * 100}%`;
    }
    
    // Actualizar botón de play/pausa
    elements.playBtn.textContent = isPlaying ? 'Pause' : 'Play';

    // Actualizar indicador de velocidad
    elements.playbackSpeedVal.textContent = playbackSpeed.toFixed(2);
    elements.playbackSpeedSlider.value = playbackSpeed * 100;
    elements.speedDisplay.classList.toggle('hidden', playbackSpeed === 1);
    elements.speedDisplay.querySelector('span').textContent = `${playbackSpeed.toFixed(2)}x`;
}

/**
 * Gestiona la lógica de reproducción del video.
 */
function handlePlayback() {
    const { media, mediaType, isPlaying, timeline } = getState();
    if (mediaType !== 'video' || !media) return;

    // Lógica de bucle
    if (isPlaying && timeline.loopSection && timeline.markerInTime !== null && timeline.markerOutTime !== null) {
        if (media.time() >= timeline.markerOutTime) {
            media.time(timeline.markerInTime);
        }
    }
}

/**
 * ✅ AÑADIDO: Maneja navegación de frames desde eventos (teclado)
 */
function handlePrevFrame() {
    if (!currentMedia) return;
    
    const { isPlaying } = getState();
    
    // Pausar si está reproduciendo
    if (isPlaying) {
        events.emit('playback:toggle');
    }
    
    currentMedia.time(Math.max(0, currentMedia.time() - 1 / 30));
    window.triggerRedraw();
}

function handleNextFrame() {
    if (!currentMedia) return;
    
    const { isPlaying } = getState();
    
    // Pausar si está reproduciendo
    if (isPlaying) {
        events.emit('playback:toggle');
    }
    
    currentMedia.time(Math.min(currentMedia.duration(), currentMedia.time() + 1 / 30));
    window.triggerRedraw();
}

/**
 * ✅ AÑADIDO: Maneja marcadores desde eventos (teclado)
 */
function handleSetMarkerIn() {
    if (!currentMedia) return;
    const time = currentMedia.time();
    updateTimeline({ markerInTime: time });
    showToast(`Entrada: ${formatTime(time)}`);
}

function handleSetMarkerOut() {
    if (!currentMedia) return;
    const time = currentMedia.time();
    updateTimeline({ markerOutTime: time });
    showToast(`Salida: ${formatTime(time)}`);
}

/**
 * Inicializa el módulo de la timeline.
 */
export function initializeTimeline() {
    queryElements();

    // Escuchar cambios de estado para actualizar la UI
    events.on('state:updated', updateTimelineUI);
    events.on('timeline:updated', updateTimelineUI);

    // Escuchar cada frame dibujado para la lógica de reproducción
    events.on('render:frame-drawn', handlePlayback);
    
    // ✅ CORREGIDO: Escuchar cuando se carga un nuevo medio
    events.on('media:loaded', (payload) => {
        const { mediaType, media } = payload;
        
        if (mediaType === 'video' && media) {
            bindToMedia(media);
        } else {
            currentMedia = null; // Limpiar referencia si no es video
        }
    });

    // ✅ MEJORADO: Eventos de navegación de frames (desde teclado o botones)
    events.on('playback:prev-frame', handlePrevFrame);
    events.on('playback:next-frame', handleNextFrame);
    
    // ✅ MEJORADO: Eventos de marcadores (desde teclado o botones)
    events.on('timeline:set-marker-in', handleSetMarkerIn);
    events.on('timeline:set-marker-out', handleSetMarkerOut);

    // Lógica de control de video
    events.on('playback:toggle', () => {
        const { media, isPlaying } = getState();
        if (!media) return;
        
        const newIsPlaying = !isPlaying;
        updateState({ isPlaying: newIsPlaying });
        
        if (newIsPlaying) {
            media.loop(); // loop() en p5 también inicia la reproducción
            events.emit('playback:play');
        } else {
            media.pause();
            events.emit('playback:pause');
        }
    });

    console.log('Timeline Module inicializado.');
}
