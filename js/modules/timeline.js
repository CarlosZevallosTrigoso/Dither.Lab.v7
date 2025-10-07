/**
 * ============================================================================
 * DitherLab v7 - Módulo de Timeline y Controles de Video
 * ============================================================================
 * - Gestiona toda la interactividad de la timeline, incluyendo reproducción,
 * marcadores, bucles y velocidad.
 * - Manipula directamente el elemento de video cuando es necesario.
 * - Se comunica con otros módulos a través de eventos.
 * ============================================================================
 */
import { events } from '../app/events.js';
import { getState, updateState, updateTimeline } from '../app/state.js';
import { formatTime } from '../utils/helpers.js';

let elements = {};
let isDraggingScrubber = false;

function queryElements() {
    const ids = [
        'playBtn', 'restartBtn', 'timelinePanel', 'timeline', 'timelineProgress',
        'timelineScrubber', 'timelineTime', 'markerIn', 'markerOut', 'setInBtn',
        'setOutBtn', 'clearMarkersBtn', 'loopSectionToggle', 'playbackSpeedSlider',
        'playbackSpeedVal', 'prevFrameBtn', 'nextFrameBtn', 'timeDisplay', 'speedDisplay'
    ];
    ids.forEach(id => (elements[id] = document.getElementById(id)));
}

function bindEventListeners() {
    const { media } = getState();

    // Controles de Reproducción
    elements.playBtn.addEventListener('click', () => events.emit('playback:toggle'));
    elements.restartBtn.addEventListener('click', () => {
        if (getState().mediaType === 'video') events.emit('playback:restart');
    });
    elements.prevFrameBtn.addEventListener('click', () => events.emit('playback:prev-frame'));
    elements.nextFrameBtn.addEventListener('click', () => events.emit('playback:next-frame'));

    // Marcadores
    elements.setInBtn.addEventListener('click', () => updateTimeline({ markerInTime: getState().media.time() }));
    elements.setOutBtn.addEventListener('click', () => updateTimeline({ markerOutTime: getState().media.time() }));
    elements.clearMarkersBtn.addEventListener('click', () => updateTimeline({ markerInTime: null, markerOutTime: null }));
    elements.loopSectionToggle.addEventListener('change', (e) => updateTimeline({ loopSection: e.target.checked }));

    // Velocidad
    elements.playbackSpeedSlider.addEventListener('input', (e) => {
        const speed = parseFloat(e.target.value) / 100;
        updateState({ playbackSpeed: speed });
        if (getState().mediaType === 'video') getState().media.speed(speed);
    });

    // Scrubbing en la timeline
    elements.timeline.addEventListener('mousedown', (e) => {
        if (getState().mediaType !== 'video') return;
        isDraggingScrubber = true;
        updateScrubPosition(e);
    });
    document.addEventListener('mousemove', (e) => {
        if (isDraggingScrubber) updateScrubPosition(e);
    });
    document.addEventListener('mouseup', () => {
        isDraggingScrubber = false;
    });
}

function updateScrubPosition(e) {
    const { media, mediaInfo } = getState();
    if (!media || mediaInfo.duration === 0) return;

    const rect = elements.timeline.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percent = x / rect.width;
    const time = percent * mediaInfo.duration;
    media.time(time);
    window.triggerRedraw(); // Forzar redibujado inmediato
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
    elements.speedDisplay.classList.toggle('hidden', playbackSpeed === 1);
    elements.speedDisplay.querySelector('span').textContent = `${playbackSpeed.toFixed(2)}x`;
}

/**
 * Gestiona la lógica de reproducción del video.
 */
function handlePlayback() {
    const { media, mediaType, isPlaying, timeline } = getState();
    if (mediaType !== 'video') return;

    // Lógica de bucle
    if (isPlaying && timeline.loopSection && timeline.markerInTime !== null && timeline.markerOutTime !== null) {
        if (media.time() >= timeline.markerOutTime) {
            media.time(timeline.markerInTime);
        }
    }
}

/**
 * Inicializa el módulo de la timeline.
 */
export function initializeTimeline() {
    queryElements();
    bindEventListeners();

    // Escuchar cambios de estado para actualizar la UI
    events.on('state:updated', updateTimelineUI);
    events.on('timeline:updated', updateTimelineUI);

    // Escuchar cada frame dibujado para la lógica de reproducción
    events.on('render:frame-drawn', handlePlayback);

    // Lógica de control de video
    events.on('playback:toggle', () => {
        const { media, isPlaying } = getState();
        if (!media) return;
        updateState({ isPlaying: !isPlaying });
        if (!isPlaying) {
            media.loop();
            events.emit('playback:play');
        } else {
            media.pause();
            events.emit('playback:pause');
        }
    });

    events.on('playback:restart', () => getState().media?.time(0));
    events.on('playback:prev-frame', () => getState().media?.time(Math.max(0, getState().media.time() - 1/30)));
    events.on('playback:next-frame', () => getState().media?.time(Math.min(getState().media.duration(), getState().media.time() + 1/30)));

    console.log('Timeline Module inicializado.');
}