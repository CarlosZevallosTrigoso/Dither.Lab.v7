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
let timelineBound = false; // Flag para evitar múltiples vinculaciones

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
 * ✅ CORREGIDO: Vincula todos los eventos de la timeline a un objeto de medio específico.
 * @param {p5.MediaElement} media - El objeto de video de p5.js.
 */
function bindToMedia(media) {
    currentMedia = media;
    
    if (timelineBound) {
        console.log('Timeline ya vinculada, saltando re-vinculación.');
        return;
    }

    console.log('Vinculando timeline al medio de video...');

    // --- Scrubbing en la timeline ---
    const updateScrubPosition = (e) => {
        const { mediaInfo } = getState();
        if (!currentMedia || !mediaInfo || mediaInfo.duration === 0) return;

        const rect = elements.timeline.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const percent = x / rect.width;
        const time = percent * mediaInfo.duration;
        currentMedia.time(time);
        
        if (window.triggerRedraw) {
            window.triggerRedraw();
        }
    };

    // ✅ Event listeners para scrubbing
    elements.timeline.addEventListener('mousedown', (e) => {
        isDraggingScrubber = true;
        updateScrubPosition(e);
        e.preventDefault();
    });

    // Usar window para capturar movimiento fuera de la timeline
    const handleMouseMove = (e) => {
        if (isDraggingScrubber) {
            updateScrubPosition(e);
        }
    };

    const handleMouseUp = () => {
        isDraggingScrubber = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    timelineBound = true;
    console.log('Timeline vinculada exitosamente.');
}

/**
 * Actualiza la UI de la timeline (posición del scrubber, textos, etc.).
 * @param {object} state - El estado actual de la aplicación.
 */
function updateTimelineUI(state) {
    const { media, mediaType, mediaInfo, timeline, isPlaying, playbackSpeed } = state;

    // Mostrar/ocultar panel de timeline
    elements.timelinePanel.classList.toggle('hidden', mediaType !== 'video');
    if (mediaType !== 'video' || !media) return;

    const currentTime = media.time();
    const duration = mediaInfo.duration;
    
    // Prevenir división por cero
    const percent = (duration > 0) ? (currentTime / duration) * 100 : 0;

    // Actualizar posición del scrubber y progreso
    elements.timelineScrubber.style.left = `${percent}%`;
    elements.timelineProgress.style.width = `${percent}%`;
    elements.timelineTime.textContent = formatTime(currentTime);
    elements.timeDisplay.textContent = `${formatTime(currentTime)} / ${formatTime(duration)}`;

    // Actualizar marcadores
    elements.markerIn.style.display = timeline.markerInTime !== null ? 'block' : 'none';
    if (timeline.markerInTime !== null && duration > 0) {
        elements.markerIn.style.left = `${(timeline.markerInTime / duration) * 100}%`;
    }
    
    elements.markerOut.style.display = timeline.markerOutTime !== null ? 'block' : 'none';
    if (timeline.markerOutTime !== null && duration > 0) {
        elements.markerOut.style.left = `${(timeline.markerOutTime / duration) * 100}%`;
    }
    
    // Actualizar botón de play/pausa
    elements.playBtn.textContent = isPlaying ? 'Pause' : 'Play';

    // Actualizar indicador de velocidad
    elements.playbackSpeedVal.textContent = playbackSpeed.toFixed(2);
    elements.playbackSpeedSlider.value = playbackSpeed * 100;
    elements.speedDisplay.classList.toggle('hidden', playbackSpeed === 1);
    const speedSpan = elements.speedDisplay.querySelector('span');
    if (speedSpan) speedSpan.textContent = `${playbackSpeed.toFixed(2)}x`;
}

/**
 * Gestiona la lógica de reproducción del video.
 */
function handlePlayback() {
    const { media, mediaType, isPlaying, timeline } = getState();
    if (mediaType !== 'video' || !media) return;

    // Lógica de bucle entre marcadores
    if (isPlaying && timeline.loopSection && 
        timeline.markerInTime !== null && timeline.markerOutTime !== null) {
        const currentTime = media.time();
        if (currentTime >= timeline.markerOutTime) {
            media.time(timeline.markerInTime);
        }
    }
}

/**
 * ✅ Maneja navegación de frame anterior
 */
function handlePrevFrame() {
    if (!currentMedia) return;
    
    const { isPlaying } = getState();
    
    // Pausar si está reproduciendo
    if (isPlaying) {
        events.emit('playback:toggle');
    }
    
    const newTime = Math.max(0, currentMedia.time() - 1 / 30);
    currentMedia.time(newTime);
    
    if (window.triggerRedraw) {
        window.triggerRedraw();
    }
}

/**
 * ✅ Maneja navegación de frame siguiente
 */
function handleNextFrame() {
    if (!currentMedia) return;
    
    const { isPlaying } = getState();
    
    // Pausar si está reproduciendo
    if (isPlaying) {
        events.emit('playback:toggle');
    }
    
    const newTime = Math.min(currentMedia.duration(), currentMedia.time() + 1 / 30);
    currentMedia.time(newTime);
    
    if (window.triggerRedraw) {
        window.triggerRedraw();
    }
}

/**
 * ✅ Maneja establecer marcador de entrada
 */
function handleSetMarkerIn() {
    if (!currentMedia) return;
    const time = currentMedia.time();
    updateTimeline({ markerInTime: time });
    showToast(`Entrada: ${formatTime(time)}`);
}

/**
 * ✅ Maneja establecer marcador de salida
 */
function handleSetMarkerOut() {
    if (!currentMedia) return;
    const time = currentMedia.time();
    updateTimeline({ markerOutTime: time });
    showToast(`Salida: ${formatTime(time)}`);
}

/**
 * ✅ Maneja reinicio del video
 */
function handleRestart() {
    if (!currentMedia) return;
    currentMedia.time(0);
    showToast('Reiniciado');
    if (window.triggerRedraw) {
        window.triggerRedraw();
    }
}

/**
 * ✅ Maneja limpieza de marcadores
 */
function handleClearMarkers() {
    updateTimeline({ markerInTime: null, markerOutTime: null });
    showToast('Marcadores limpiados');
}

/**
 * ✅ Maneja cambio de loop
 */
function handleLoopToggle(enabled) {
    updateTimeline({ loopSection: enabled });
}

/**
 * ✅ Maneja cambio de velocidad
 */
function handleSpeedChange(speed) {
    if (!currentMedia) return;
    updateState({ playbackSpeed: speed });
    currentMedia.speed(speed);
}

/**
 * Inicializa el módulo de la timeline.
 */
export function initializeTimeline() {
    queryElements();

    // --- Vincular botones a funciones ---
    elements.playBtn.addEventListener('click', () => events.emit('playback:toggle'));
    elements.restartBtn.addEventListener('click', handleRestart);
    elements.prevFrameBtn.addEventListener('click', () => events.emit('playback:prev-frame'));
    elements.nextFrameBtn.addEventListener('click', () => events.emit('playback:next-frame'));
    elements.setInBtn.addEventListener('click', () => events.emit('timeline:set-marker-in'));
    elements.setOutBtn.addEventListener('click', () => events.emit('timeline:set-marker-out'));
    elements.clearMarkersBtn.addEventListener('click', handleClearMarkers);
    elements.loopSectionToggle.addEventListener('change', (e) => handleLoopToggle(e.target.checked));
    
    // Control de velocidad
    elements.playbackSpeedSlider.addEventListener('input', (e) => {
        const speed = parseFloat(e.target.value) / 100;
        handleSpeedChange(speed);
    });
    
    // Botones preset de velocidad
    document.querySelectorAll('.speed-preset').forEach(btn => {
        btn.addEventListener('click', () => {
            const speed = parseInt(btn.dataset.speed) / 100;
            handleSpeedChange(speed);
            elements.playbackSpeedSlider.value = speed * 100;
        });
    });

    // --- Escuchar eventos ---
    events.on('state:updated', updateTimelineUI);
    events.on('timeline:updated', updateTimelineUI);
    events.on('render:frame-drawn', handlePlayback);
    
    // ✅ CORREGIDO: Vincular al cargar medio
    events.on('media:loaded', (payload) => {
        const { mediaType, media } = payload;
        
        if (mediaType === 'video' && media) {
            bindToMedia(media);
            // Actualizar UI inmediatamente
            setTimeout(() => updateTimelineUI(getState()), 100);
        } else {
            currentMedia = null;
            timelineBound = false;
        }
    });

    // Eventos de navegación
    events.on('playback:prev-frame', handlePrevFrame);
    events.on('playback:next-frame', handleNextFrame);
    events.on('timeline:set-marker-in', handleSetMarkerIn);
    events.on('timeline:set-marker-out', handleSetMarkerOut);

    // Control de reproducción
    events.on('playback:toggle', () => {
        const { media, mediaType, isPlaying } = getState();
        if (mediaType !== 'video' || !media) return;
        
        const newIsPlaying = !isPlaying;
        updateState({ isPlaying: newIsPlaying });
        
        if (newIsPlaying) {
            media.loop();
            events.emit('playback:play');
        } else {
            media.pause();
            events.emit('playback:pause');
        }
    });

    console.log('Timeline Module inicializado.');
}
