/**
 * media-panel.js
 * Componente para la carga de archivos y controles de reproducción.
 */
export function createMediaPanel(state, bus) {
  const element = document.createElement('div');
  element.className = 'bg-slate-800 rounded-lg p-4';
  element.innerHTML = `
    <h2 class="font-bold text-cyan-300 mb-3">MEDIO</h2>
    <div class="tooltip w-full">
      <label class="block w-full text-center py-4 border-2 border-dashed border-slate-600 rounded-lg cursor-pointer hover:border-cyan-400 hover:bg-slate-700 transition-colors" id="dropZone">
        <span class="text-gray-400">Arrastra video o imagen aquí</span>
        <input id="fileInput" type="file" accept="video/*,image/*" class="hidden"/>
      </label>
      <span class="tooltiptext">Soporta: MP4, WEBM, MOV, PNG, JPG, GIF</span>
    </div>
    <div class="flex gap-2 mt-3">
      <button id="playBtn" class="flex-1 py-2 bg-blue-600 rounded hover:bg-blue-500 tooltip" disabled>Play</button>
      <button id="restartBtn" class="px-3 py-2 bg-slate-700 rounded hover:bg-slate-600 tooltip" disabled>↺</button>
    </div>
    <div id="mediaInfo" class="text-xs text-gray-400 mt-2 flex items-center gap-2">
      <span id="mediaType" class="bg-slate-700 px-2 py-1 rounded">No cargado</span>
      <span id="mediaDimensions"></span>
    </div>
  `;

  const playBtn = element.querySelector('#playBtn');
  const restartBtn = element.querySelector('#restartBtn');
  const mediaTypeEl = element.querySelector('#mediaType');
  const mediaDimensionsEl = element.querySelector('#mediaDimensions');

  // Event Listeners
  playBtn.addEventListener('click', () => bus.publish('media:toggle-play'));
  restartBtn.addEventListener('click', () => bus.publish('media:restart'));

  // Update function
  function update(newState) {
    playBtn.disabled = newState.mediaType !== 'video';
    restartBtn.disabled = newState.mediaType !== 'video';
    playBtn.textContent = newState.isPlaying ? 'Pause' : 'Play';

    if (newState.media) {
      mediaTypeEl.textContent = newState.mediaType.toUpperCase();
      mediaDimensionsEl.textContent = `${newState.media.width}x${newState.media.height}`;
    } else {
      mediaTypeEl.textContent = 'No cargado';
      mediaDimensionsEl.textContent = '';
    }
  }

  return { element, update };
}