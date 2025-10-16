/**
 * adjustments-panel.js
 * Componente para los ajustes de imagen (brillo, contraste, curvas, etc.).
 */
export function createImageAdjustmentsPanel(state, bus) {
  const element = document.createElement('div');
  element.className = 'bg-slate-800 rounded-lg p-4';

  element.innerHTML = `
    <div class="flex items-center justify-between mb-3">
      <h3 class="font-bold text-yellow-300">AJUSTES DE IMAGEN</h3>
      <button id="resetImageAdjustmentsBtn" class="text-xs bg-slate-700 px-2 py-1 rounded hover:bg-slate-600">
        Resetear
      </button>
    </div>
    <div id="basicImageControls" class="space-y-3">
      <label class="block">
        <span class="text-sm">Brillo: <span id="brightnessVal">0</span></span>
        <input id="brightnessSlider" type="range" min="-100" max="100" value="0" class="w-full"/>
      </label>
      <label class="block">
        <span class="text-sm">Contraste: <span id="contrastVal">100</span>%</span>
        <input id="contrastSlider" type="range" min="0" max="200" value="100" class="w-full"/>
      </label>
      <label class="block">
        <span class="text-sm">Saturación: <span id="saturationVal">100</span>%</span>
        <input id="saturationSlider" type="range" min="0" max="200" value="100" class="w-full"/>
      </label>
    </div>
    `;

  // --- Elementos del DOM ---
  const brightnessSlider = element.querySelector('#brightnessSlider');
  const brightnessVal = element.querySelector('#brightnessVal');
  const contrastSlider = element.querySelector('#contrastSlider');
  const contrastVal = element.querySelector('#contrastVal');
  const saturationSlider = element.querySelector('#saturationSlider');
  const saturationVal = element.querySelector('#saturationVal');
  const resetBtn = element.querySelector('#resetImageAdjustmentsBtn');

  // --- Event Listeners ---
  brightnessSlider.addEventListener('input', (e) => {
    const value = parseInt(e.target.value, 10);
    brightnessVal.textContent = value;
    bus.publish('state:mutate', { config: { brightness: value } });
  });

  contrastSlider.addEventListener('input', (e) => {
    const value = parseInt(e.target.value, 10);
    contrastVal.textContent = `${value}%`;
    bus.publish('state:mutate', { config: { contrast: value / 100 } });
  });

  saturationSlider.addEventListener('input', (e) => {
    const value = parseInt(e.target.value, 10);
    saturationVal.textContent = `${value}%`;
    bus.publish('state:mutate', { config: { saturation: value / 100 } });
  });
  
  resetBtn.addEventListener('click', () => {
      bus.publish('state:mutate', { config: { brightness: 0, contrast: 1.0, saturation: 1.0 } });
  });

  // --- Función de Actualización ---
  function update(newState) {
    const { brightness, contrast, saturation } = newState.config;
    
    brightnessSlider.value = brightness;
    brightnessVal.textContent = brightness;
    
    contrastSlider.value = contrast * 100;
    contrastVal.textContent = `${Math.round(contrast * 100)}%`;
    
    saturationSlider.value = saturation * 100;
    saturationVal.textContent = `${Math.round(saturation * 100)}%`;
  }

  return { element, update };
}