/**
 * algorithm-panel.js
 * Componente para seleccionar el algoritmo y ajustar sus parámetros.
 */
import { ALGORITHM_INFO } from '../../utils/constants.js';

export function createAlgorithmPanel(state, bus) {
    const element = document.createElement('div');
    element.className = 'bg-slate-800 rounded-lg p-4 space-y-4';
    element.innerHTML = `
        <div>
            <h2 class="font-bold text-purple-300 mb-3">ALGORITMO DE DITHERING</h2>
            <select id="effectSelect" class="w-full bg-slate-700 p-2 rounded text-white">
                <option value="none">Sin efecto</option>
                <option value="posterize">Posterize</option>
                <optgroup label="Difusión de Error">
                    <option value="floyd-steinberg" selected>Floyd-Steinberg</option>
                    <option value="atkinson">Atkinson</option>
                    <option value="stucki">Stucki</option>
                    <option value="jarvis-judice-ninke">Jarvis-Judice-Ninke</option>
                    <option value="sierra">Sierra</option>
                    <option value="sierra-lite">Sierra Lite</option>
                    <option value="burkes">Burkes</option>
                </optgroup>
                <optgroup label="Dithering Ordenado">
                    <option value="bayer">Bayer</option>
                    <option value="blue-noise">Blue Noise</option>
                </optgroup>
            </select>
        </div>
        <div id="ditherControls" class="hidden">
            <h3 class="font-bold text-green-300 mb-3">CONTROLES AVANZADOS</h3>
            <label class="block mb-3">
                <span class="text-sm">Escala: <span id="ditherScaleVal">2</span></span>
                <input id="ditherScale" type="range" min="1" max="10" value="2" class="w-full"/>
            </label>
        </div>
        <div>
          <h3 class="font-bold text-sky-300 mb-2">ACERCA DEL ALGORITMO</h3>
          <p id="infoText" class="text-xs text-gray-300 leading-relaxed">...</p>
        </div>
    `;

    const effectSelect = element.querySelector('#effectSelect');
    const ditherControls = element.querySelector('#ditherControls');
    const ditherScale = element.querySelector('#ditherScale');
    const ditherScaleVal = element.querySelector('#ditherScaleVal');
    const infoText = element.querySelector('#infoText');

    effectSelect.addEventListener('change', (e) => {
        bus.publish('state:mutate', { config: { effect: e.target.value } });
    });

    ditherScale.addEventListener('input', (e) => {
        const scale = parseInt(e.target.value, 10);
        ditherScaleVal.textContent = scale;
        bus.publish('state:mutate', { config: { ditherScale: scale } });
    });

    function update(newState) {
        const { effect, ditherScale } = newState.config;
        
        effectSelect.value = effect;
        element.querySelector('#ditherScale').value = ditherScale;
        element.querySelector('#ditherScaleVal').textContent = ditherScale;
        
        const isDithering = effect !== 'none' && effect !== 'posterize';
        ditherControls.classList.toggle('hidden', !isDithering);

        infoText.textContent = ALGORITHM_INFO[effect] || "Selecciona un algoritmo.";
    }

    return { element, update };
}