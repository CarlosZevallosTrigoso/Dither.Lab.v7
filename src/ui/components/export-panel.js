/**
 * export-panel.js
 * Componente para todas las opciones de exportación.
 */
export function createExportPanel(state, bus) {
  const element = document.createElement('div');
  element.className = 'bg-slate-800 rounded-lg p-4';

  element.innerHTML = `
    <h2 class="font-bold text-red-300 mb-3 flex items-center gap-2">EXPORTAR</h2>
    
    <div class="pt-3 border-t border-slate-700">
      <div class="text-xs text-gray-400 mb-2">Frame Actual</div>
      <button id="downloadImageBtn" class="w-full py-2 bg-cyan-600 rounded hover:bg-cyan-500">Exportar PNG</button>
    </div>

    <div id="gifExportPanel" class="pt-3 border-t border-slate-700 mt-4 hidden">
      <div class="text-xs text-gray-400 mb-2">GIF Animado</div>
      <div class="space-y-2 mb-2">
        <label class="block">
          <span class="text-xs">FPS: <span id="gifFpsVal">15</span></span>
          <input id="gifFpsSlider" type="range" min="5" max="30" value="15" class="w-full"/>
        </label>
        <label class="block">
          <span class="text-xs">Calidad (1-20): <span id="gifQualityVal">10</span></span>
          <input id="gifQualitySlider" type="range" min="1" max="20" value="10" class="w-full"/>
        </label>
      </div>
      <button id="exportGifBtn" class="w-full py-2 bg-purple-600 rounded hover:bg-purple-500">Exportar GIF</button>
      <div id="gifProgress" class="hidden mt-2">
        <div class="text-xs text-gray-400">Progreso: <span id="gifProgressText">0%</span></div>
        <div class="progress-bar-container"><div class="progress-bar" id="gifProgressBar" style="width: 0%"></div></div>
      </div>
    </div>
  `;

  // --- Elementos del DOM ---
  const downloadImageBtn = element.querySelector('#downloadImageBtn');
  const gifExportPanel = element.querySelector('#gifExportPanel');
  const exportGifBtn = element.querySelector('#exportGifBtn');
  const gifProgress = element.querySelector('#gifProgress');
  const gifProgressBar = element.querySelector('#gifProgressBar');
  const gifProgressText = element.querySelector('#gifProgressText');

  // --- Event Listeners ---
  downloadImageBtn.addEventListener('click', () => bus.publish('export:frame'));

  exportGifBtn.addEventListener('click', () => {
    const fps = parseInt(element.querySelector('#gifFpsSlider').value, 10);
    const quality = parseInt(element.querySelector('#gifQualitySlider').value, 10);
    const currentState = state.get();
    
    exportGifBtn.disabled = true;
    exportGifBtn.textContent = 'Exportando...';
    gifProgress.classList.remove('hidden');

    bus.publish('export:start-gif', {
      fps,
      quality,
      startTime: currentState.timeline.markerInTime || 0,
      endTime: currentState.timeline.markerOutTime || currentState.media.duration()
    });
  });

  // --- Suscripciones a Eventos ---
  bus.subscribe('export:progress', ({ progress }) => {
    const percent = Math.round(progress * 100);
    gifProgressBar.style.width = `${percent}%`;
    gifProgressText.textContent = `${percent}%`;
  });

  bus.subscribe('export:finished', () => {
    exportGifBtn.disabled = false;
    exportGifBtn.textContent = 'Exportar GIF';
    gifProgress.classList.add('hidden');
    gifProgressBar.style.width = '0%';
    gifProgressText.textContent = '0%';
  });

  // --- Función de Actualización ---
  function update(newState) {
    const isVideo = newState.mediaType === 'video';
    downloadImageBtn.disabled = !newState.media;
    gifExportPanel.classList.toggle('hidden', !isVideo);
  }

  return { element, update };
}