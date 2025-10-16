/**
 * timeline.js
 * Componente para la línea de tiempo y controles de video avanzados.
 */
import { formatTime } from '../../utils/helpers.js';

export function createTimelinePanel(state, bus) {
  const element = document.createElement('div');
  element.className = 'bg-slate-800 rounded-lg p-4 hidden'; // Oculto por defecto
  element.id = 'timelinePanel';

  element.innerHTML = `
    <h2 class="font-bold text-yellow-300 mb-3">TIMELINE</h2>
    <div class="timeline-container" id="timeline">
      <div class="timeline-progress" id="timelineProgress"></div>
      <div class="timeline-marker in" id="markerIn" style="display:none;"></div>
      <div class="timeline-marker out" id="markerOut" style="display:none;"></div>
      <div class="timeline-scrubber" id="timelineScrubber"></div>
      <div class="timeline-time" id="timelineTime">00:00</div>
    </div>
    <div class="mt-3 space-y-2">
      <div class="flex gap-2 text-xs">
        <button id="setInBtn" class="flex-1 bg-green-700 px-2 py-1 rounded hover:bg-green-600">[ Entrada</button>
        <button id="setOutBtn" class="flex-1 bg-red-700 px-2 py-1 rounded hover:bg-red-600">Salida ]</button>
        <button id="clearMarkersBtn" class="px-3 bg-slate-700 rounded hover:bg-slate-600">✕</button>
      </div>
      <label class="flex items-center gap-2 cursor-pointer">
        <input id="loopSectionToggle" type="checkbox" class="w-4 h-4"/>
        <span class="text-sm">Loop entre marcadores</span>
      </label>
    </div>
    <div class="mt-3">
      <label class="block">
        <span class="text-sm">Velocidad: <span id="playbackSpeedVal">1.00</span>x</span>
        <input id="playbackSpeedSlider" type="range" min="25" max="200" value="100" class="w-full"/>
      </label>
    </div>
    <div class="mt-3 flex gap-2">
      <button id="prevFrameBtn" class="flex-1 bg-slate-700 px-2 py-2 rounded hover:bg-slate-600">◄ Frame</button>
      <button id="nextFrameBtn" class="flex-1 bg-slate-700 px-2 py-2 rounded hover:bg-slate-600">Frame ►</button>
    </div>
  `;

  // --- Elementos del DOM ---
  const setInBtn = element.querySelector('#setInBtn');
  const setOutBtn = element.querySelector('#setOutBtn');
  const clearMarkersBtn = element.querySelector('#clearMarkersBtn');
  const loopToggle = element.querySelector('#loopSectionToggle');
  const speedSlider = element.querySelector('#playbackSpeedSlider');
  const speedVal = element.querySelector('#playbackSpeedVal');
  const prevFrameBtn = element.querySelector('#prevFrameBtn');
  const nextFrameBtn = element.querySelector('#nextFrameBtn');

  // --- Event Listeners ---
  setInBtn.addEventListener('click', () => bus.publish('timeline:set-in'));
  setOutBtn.addEventListener('click', () => bus.publish('timeline:set-out'));
  clearMarkersBtn.addEventListener('click', () => bus.publish('state:mutate', { timeline: { markerInTime: null, markerOutTime: null } }));
  loopToggle.addEventListener('change', (e) => bus.publish('state:mutate', { timeline: { loopSection: e.target.checked } }));
  
  speedSlider.addEventListener('input', (e) => {
    const speed = parseFloat(e.target.value) / 100;
    speedVal.textContent = speed.toFixed(2);
    bus.publish('state:mutate', { playbackSpeed: speed });
  });

  prevFrameBtn.addEventListener('click', () => bus.publish('media:prev-frame'));
  nextFrameBtn.addEventListener('click', () => bus.publish('media:next-frame'));

  // --- Función de Actualización ---
  function update(newState) {
    const { media, mediaType, timeline, playbackSpeed } = newState;
    
    // Mostrar/ocultar el panel completo
    element.classList.toggle('hidden', mediaType !== 'video');
    if (mediaType !== 'video') return;

    // Actualizar UI
    speedSlider.value = playbackSpeed * 100;
    speedVal.textContent = playbackSpeed.toFixed(2);
    loopToggle.checked = timeline.loopSection;

    // Actualizar elementos visuales de la línea de tiempo
    const duration = media.duration();
    const currentTime = media.time();
    
    element.querySelector('#timelineTime').textContent = formatTime(currentTime);
    const progressPercent = (currentTime / duration) * 100;
    element.querySelector('#timelineProgress').style.width = `${progressPercent}%`;
    element.querySelector('#timelineScrubber').style.left = `${progressPercent}%`;

    const markerIn = element.querySelector('#markerIn');
    if (timeline.markerInTime !== null) {
      markerIn.style.display = 'block';
      markerIn.style.left = `${(timeline.markerInTime / duration) * 100}%`;
    } else {
      markerIn.style.display = 'none';
    }

    const markerOut = element.querySelector('#markerOut');
    if (timeline.markerOutTime !== null) {
      markerOut.style.display = 'block';
      markerOut.style.left = `${(timeline.markerOutTime / duration) * 100}%`;
    } else {
      markerOut.style.display = 'none';
    }
  }

  return { element, update };
}