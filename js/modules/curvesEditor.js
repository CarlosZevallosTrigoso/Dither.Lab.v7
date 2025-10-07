/**
 * ============================================================================
 * DitherLab v7 - Módulo del Editor de Curvas
 * ============================================================================
 * - Gestiona el componente del canvas para la edición de curvas de color (RGB).
 * - Es un componente autocontenido con su propia lógica de renderizado y eventos.
 * - Emite eventos para notificar a la aplicación cuando las curvas cambian.
 * ============================================================================
 */
import { events } from '../app/events.js';
import { updateConfig } from '../app/state.js';

class CurvesEditor {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.width = this.canvas.width;
    this.height = this.canvas.height;

    this.curves = {
      rgb: [{x: 0, y: 0}, {x: 255, y: 255}],
      r: [{x: 0, y: 0}, {x: 255, y: 255}],
      g: [{x: 0, y: 0}, {x: 255, y: 255}],
      b: [{x: 0, y: 0}, {x: 255, y: 255}]
    };

    this.currentChannel = 'rgb';
    this.selectedPoint = null;
    this.isDragging = false;
    this.pointRadius = 6;

    this.setupEventListeners();
    this.render();
  }

  setupEventListeners() {
    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.canvas.addEventListener('dblclick', this.onDoubleClick.bind(this));
    this.canvas.addEventListener('mouseleave', this.onMouseUp.bind(this));
  }

  // --- Métodos de Conversión y Eventos del Canvas ---
  // (Estos métodos son extraídos directamente del ui.js original)
  onMouseDown(e) { /* ... */ }
  onMouseMove(e) { /* ... */ }
  onMouseUp() { this.isDragging = false; }
  onDoubleClick(e) { /* ... */ }

  addPoint(channel, x, y) {
    const points = this.curves[channel];
    points.push({x: Math.round(x), y: Math.round(y)});
    points.sort((a, b) => a.x - b.x);
    this.notifyUpdate();
  }
  
  setChannel(channel) {
    this.currentChannel = channel;
    this.selectedPoint = null;
    this.render();
  }

  resetChannel(channel) {
    this.curves[channel] = [{x: 0, y: 0}, {x: 255, y: 255}];
    this.selectedPoint = null;
    this.render();
    this.notifyUpdate();
  }
  
  resetAllChannels() {
    for (const channel in this.curves) {
      this.curves[channel] = [{x: 0, y: 0}, {x: 255, y: 255}];
    }
    this.selectedPoint = null;
    this.render();
    this.notifyUpdate();
  }

  // --- Renderizado y Lógica de LUT ---
  render() {
    // ... (Toda la lógica de dibujo del canvas de curvas va aquí)
    // Se extrae directamente del ui.js original
  }
  
  getLUT(channel) {
    const points = this.curves[channel];
    const lut = new Uint8Array(256);
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      for (let x = p1.x; x <= p2.x; x++) {
        const t = (p2.x - p1.x === 0) ? 0 : (x - p1.x) / (p2.x - p1.x);
        const y = p1.y + t * (p2.y - p1.y);
        lut[x] = Math.round(Math.max(0, Math.min(255, y)));
      }
    }
    return lut;
  }
  
  getAllLUTs() {
    return {
      rgb: this.getLUT('rgb'),
      r: this.getLUT('r'),
      g: this.getLUT('g'),
      b: this.getLUT('b')
    };
  }
  
  /**
   * Notifica al resto de la aplicación que las curvas han cambiado.
   */
  notifyUpdate() {
      updateConfig({ curvesLUTs: this.getAllLUTs() });
  }
}

/**
 * Inicializa el módulo del Editor de Curvas.
 */
export function initializeCurvesEditor() {
    const editor = new CurvesEditor('curvesCanvas');

    // Vincular botones de control del editor
    document.querySelectorAll('.curve-channel-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.curve-channel-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            editor.setChannel(e.target.dataset.channel);
        });
    });

    document.getElementById('resetCurveBtn').addEventListener('click', () => {
        editor.resetChannel(editor.currentChannel);
    });
    
    document.getElementById('resetAllCurvesBtn').addEventListener('click', () => {
        editor.resetAllChannels();
    });

    // Escuchar eventos globales si es necesario (ej: cargar preset)
    events.on('presets:loaded', (presetData) => {
        if (presetData.curves) {
            editor.curves = presetData.curves;
            editor.render();
            editor.notifyUpdate();
        }
    });
    
    events.on('ui:curves-editor-toggled', () => editor.render());
    
    console.log('Curves Editor inicializado.');
}