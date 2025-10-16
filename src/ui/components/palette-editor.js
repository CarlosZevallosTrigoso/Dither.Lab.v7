/**
 * palette-editor.js
 * Componente para la gestión de la paleta de colores.
 */
export function createPalettePanel(state, bus) {
  const element = document.createElement('div');
  element.className = 'bg-slate-800 rounded-lg p-4';
  element.innerHTML = `
    <h3 class="font-bold text-teal-300 mb-3">PALETA DE COLORES</h3>
    <div class="space-y-3">
        <label class="flex items-center gap-2 cursor-pointer">
            <input id="monochromeToggle" type="checkbox" class="w-4 h-4"/>
            <span class="text-sm">Blanco y Negro</span>
        </label>
        <label class="block">
            <span class="text-sm">Colores: <span id="colorCountVal">4</span></span>
            <input id="colorCountSlider" type="range" min="2" max="16" value="4" class="w-full"/>
        </label>
    </div>
    <div id="colorPickerContainer" class="grid grid-cols-4 gap-2 mt-4"></div>
  `;

  const colorCountSlider = element.querySelector('#colorCountSlider');
  const colorCountVal = element.querySelector('#colorCountVal');
  const monochromeToggle = element.querySelector('#monochromeToggle');
  const colorPickerContainer = element.querySelector('#colorPickerContainer');

  colorCountSlider.addEventListener('input', (e) => {
    const count = parseInt(e.target.value, 10);
    colorCountVal.textContent = count;
    bus.publish('palette:colorCountChanged', count);
  });

  monochromeToggle.addEventListener('change', (e) => {
    bus.publish('palette:monochromeToggled', e.target.checked);
  });
  
  function update(newState) {
    const { colorCount, isMonochrome, colors } = newState.config;

    colorCountSlider.value = colorCount;
    colorCountVal.textContent = colorCount;
    monochromeToggle.checked = isMonochrome;

    // Re-render color pickers only if necessary
    if (colorPickerContainer.children.length !== colorCount || isMonochrome) {
        colorPickerContainer.innerHTML = '';
        for (let i = 0; i < colorCount; i++) {
            const color = colors[i] || '#000000';
            const picker = document.createElement('input');
            picker.type = 'color';
            picker.value = color;
            picker.className = "w-full h-10 p-0 border-none rounded cursor-pointer";
            picker.dataset.index = i;
            picker.disabled = isMonochrome;
            picker.addEventListener('input', (e) => {
                bus.publish('palette:colorChanged', { index: i, color: e.target.value });
            });
            colorPickerContainer.appendChild(picker);
        }
    }
  }

  return { element, update };
}