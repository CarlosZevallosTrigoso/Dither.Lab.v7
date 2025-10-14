/**
 * @file CurvesEditor.js
 * @description Componente interactivo para la edición de curvas de color RGB.
 */
import { BasePanel } from './BasePanel.js';
import { $, $$ } from '../utils/DOMHelpers.js';
import { APP_DEFAULTS } from '../../constants/defaults.js';

export class CurvesEditor extends BasePanel {
  constructor() {
    // Este panel no tiene un contenedor principal, opera sobre elementos específicos.
    // Pasamos 'curvesEditor' como id, que es el contenedor de todo el editor.
    super('curvesEditor'); 
    
    this.canvas = $('#curvesCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.width = this.canvas.width;
    this.height = this.canvas.height;

    this.elements = {
      channelButtons: $$('.curve-channel-btn'),
      pointInfo: $('#curvePointInfo'),
      resetCurveBtn: $('#resetCurveBtn'),
      resetAllCurvesBtn: $('#resetAllCurvesBtn'),
    };

    // Estado interno del componente
    this.curves = this.getInitialCurvesState();
    this.currentChannel = 'rgb';
    this.selectedPointIndex = null;
    this.isDragging = false;
    this.pointRadius = 6;

    // Suscripciones a eventos específicos del bus
    this.eventBus.subscribe('curves:request-render', () => this.draw());
    this.eventBus.subscribe('curves:reset-all', () => {
      this.curves = this.getInitialCurvesState();
      this.draw();
    });
  }

  getInitialCurvesState() {
    // Usamos una función para obtener una copia nueva y evitar mutaciones
    return {
      rgb: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
      r: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
      g: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
      b: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
    };
  }

  bindEvents() {
    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.onMouseUp.bind(this));
    this.canvas.addEventListener('dblclick', this.onDoubleClick.bind(this));

    this.elements.channelButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.setChannel(btn.dataset.channel);
      });
    });

    this.elements.resetCurveBtn.addEventListener('click', () => this.resetCurrentChannel());
    this.elements.resetAllCurvesBtn.addEventListener('click', () => this.eventBus.publish('curves:reset-all'));
  }

  // El método 'render' de BasePanel sincroniza con el estado global.
  render(state) {
    // Si el estado de las curvas en el store es nulo (por un reseteo),
    // reseteamos el estado interno del componente.
    if (state.config.curves === null) {
      this.curves = this.getInitialCurvesState();
      this.draw();
    }
  }

  setChannel(channel) {
    this.currentChannel = channel;
    this.selectedPointIndex = null;
    this.isDragging = false;
    
    this.elements.channelButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.channel === channel);
    });

    this.draw();
  }

  resetCurrentChannel() {
    this.curves[this.currentChannel] = [{ x: 0, y: 0 }, { x: 255, y: 255 }];
    this.selectedPointIndex = null;
    this.updateGlobalState();
    this.draw();
  }

  updateGlobalState() {
    // Publica el estado completo de las curvas al store
    this.store.setKey('config.curves', this.curves);
  }

  // --- Lógica de Interacción con el Canvas ---

  onMouseDown(e) {
    const { x, y } = this.getCanvasCoords(e);
    const points = this.curves[this.currentChannel];

    for (let i = 0; i < points.length; i++) {
      const px = this.valueToCanvas(points[i].x, true);
      const py = this.valueToCanvas(points[i].y, false);
      const dist = Math.sqrt((x - px) ** 2 + (y - py) ** 2);

      if (dist < this.pointRadius + 5) {
        this.selectedPointIndex = i;
        this.isDragging = true;
        this.draw();
        return;
      }
    }

    // Si no hay un punto cercano, crear uno nuevo
    this.addPoint(this.canvasToValue(x, true), this.canvasToValue(y, false));
  }

  onMouseMove(e) {
    const { x, y } = this.getCanvasCoords(e);
    const valueX = this.canvasToValue(x, true);
    const valueY = this.canvasToValue(y, false);
    this.elements.pointInfo.textContent = `In: ${valueX} → Out: ${valueY}`;

    if (this.isDragging && this.selectedPointIndex !== null) {
      const points = this.curves[this.currentChannel];
      const point = points[this.selectedPointIndex];
      
      const isEndpoint = this.selectedPointIndex === 0 || this.selectedPointIndex === points.length - 1;
      
      if (!isEndpoint) {
          const prevX = points[this.selectedPointIndex - 1].x;
          const nextX = points[this.selectedPointIndex + 1].x;
          point.x = Math.max(prevX + 1, Math.min(nextX - 1, valueX));
      }

      point.y = Math.max(0, Math.min(255, valueY));
      this.updateGlobalState();
      this.draw();
    }
  }

  onMouseUp() {
    this.isDragging = false;
  }
  
  onDoubleClick(e) {
    if (this.selectedPointIndex !== null) {
        const points = this.curves[this.currentChannel];
        const isEndpoint = this.selectedPointIndex === 0 || this.selectedPointIndex === points.length - 1;
        if (!isEndpoint) {
            points.splice(this.selectedPointIndex, 1);
            this.selectedPointIndex = null;
            this.updateGlobalState();
            this.draw();
        }
    }
  }

  addPoint(x, y) {
    const points = this.curves[this.currentChannel];
    points.push({ x, y });
    points.sort((a, b) => a.x - b.x);
    this.selectedPointIndex = points.findIndex(p => p.x === x);
    this.isDragging = true;
    this.updateGlobalState();
    this.draw();
  }

  // --- Lógica de Dibujo en el Canvas ---

  draw() {
    this.clearCanvas();
    this.drawGrid();
    this.drawReferenceLine();
    this.drawCurve();
    this.drawPoints();
  }
  
  clearCanvas() {
    this.ctx.fillStyle = '#111827';
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  drawGrid() {
    this.ctx.strokeStyle = '#374151';
    this.ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const pos = (i / 4) * this.width;
      this.ctx.beginPath();
      this.ctx.moveTo(pos, 0); this.ctx.lineTo(pos, this.height);
      this.ctx.moveTo(0, pos); this.ctx.lineTo(this.width, pos);
      this.ctx.stroke();
    }
  }
  
  drawReferenceLine() {
    this.ctx.strokeStyle = '#4b5563';
    this.ctx.setLineDash([5, 5]);
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.height);
    this.ctx.lineTo(this.width, 0);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
  }

  drawCurve() {
    const points = this.curves[this.currentChannel];
    const channelColors = { rgb: '#06b6d4', r: '#ef4444', g: '#10b981', b: '#3b82f6' };
    this.ctx.strokeStyle = channelColors[this.currentChannel];
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(this.valueToCanvas(points[0].x, true), this.valueToCanvas(points[0].y, false));
    for (let i = 1; i < points.length; i++) {
        // Simple interpolación lineal entre puntos
        this.ctx.lineTo(this.valueToCanvas(points[i].x, true), this.valueToCanvas(points[i].y, false));
    }
    this.ctx.stroke();
  }
  
  drawPoints() {
    const points = this.curves[this.currentChannel];
    points.forEach((point, index) => {
      const px = this.valueToCanvas(point.x, true);
      const py = this.valueToCanvas(point.y, false);
      this.ctx.fillStyle = index === this.selectedPointIndex ? '#f59e0b' : '#06b6d4';
      this.ctx.strokeStyle = 'white';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(px, py, this.pointRadius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.stroke();
    });
  }

  // --- Funciones de Utilidad de Coordenadas ---

  getCanvasCoords(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  canvasToValue(coord, isX) {
    return isX
      ? Math.round((coord / this.width) * 255)
      : Math.round(((this.height - coord) / this.height) * 255);
  }

  valueToCanvas(value, isX) {
    return isX
      ? (value / 255) * this.width
      : this.height - (value / 255) * this.height;
  }
}
