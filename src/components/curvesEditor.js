// src/components/curvesEditor.js

/**
 * CurvesEditor - Un componente de UI encapsulado para la manipulación
 * de curvas de color (RGB, R, G, B).
 */
export default class CurvesEditor {
  constructor(canvasId, appState) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      console.error(`Canvas element with id "${canvasId}" not found.`);
      return;
    }
    this.ctx = this.canvas.getContext('2d');
    this.appState = appState;
    this.width = this.canvas.width;
    this.height = this.canvas.height;

    this.curves = {
      rgb: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
      r: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
      g: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
      b: [{ x: 0, y: 0 }, { x: 255, y: 255 }]
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

    // Listeners para los botones de canal y reset
    document.querySelectorAll('.curve-channel-btn').forEach(btn => {
        btn.addEventListener('click', (e) => this.setChannel(e.target.dataset.channel));
    });
    document.getElementById('resetCurveBtn').addEventListener('click', () => this.resetChannel(this.currentChannel));
    document.getElementById('resetAllCurvesBtn').addEventListener('click', () => this.resetAllChannels());
  }

  // --- Métodos de interacción (onMouseDown, onMouseMove, etc.) ---

  onMouseDown(e) {
    const { x, y } = this.getCanvasCoordinates(e);
    const points = this.curves[this.currentChannel];

    for (let i = 0; i < points.length; i++) {
      const px = this.valueToCanvas(points[i].x, true);
      const py = this.valueToCanvas(points[i].y, false);
      const dist = Math.sqrt((x - px) ** 2 + (y - py) ** 2);
      if (dist < this.pointRadius + 5) {
        this.selectedPoint = i;
        this.isDragging = true;
        this.render();
        return;
      }
    }

    const valueX = this.canvasToValue(x, true);
    const valueY = this.canvasToValue(y, false);
    if (valueX > 0 && valueX < 255) {
      this.addPoint(this.currentChannel, valueX, valueY);
      this.selectedPoint = points.findIndex(p => p.x === valueX);
      this.isDragging = true;
    }
  }

  onMouseMove(e) {
    const { x, y } = this.getCanvasCoordinates(e);
    const valueX = this.canvasToValue(x, true);
    const valueY = this.canvasToValue(y, false);

    const info = document.getElementById('curvePointInfo');
    if (info) info.textContent = `In: ${valueX} → Out: ${valueY}`;

    if (this.isDragging && this.selectedPoint !== null) {
      const points = this.curves[this.currentChannel];
      const point = points[this.selectedPoint];

      if (this.selectedPoint === 0 || this.selectedPoint === points.length - 1) {
        point.y = Math.max(0, Math.min(255, valueY));
      } else {
        const prevX = points[this.selectedPoint - 1].x;
        const nextX = points[this.selectedPoint + 1].x;
        point.x = Math.max(prevX + 1, Math.min(nextX - 1, valueX));
        point.y = Math.max(0, Math.min(255, valueY));
      }
      
      this.render();
      this.updateStateWithLUTs();
    }
  }
  
  onMouseUp() {
    this.isDragging = false;
  }
  
  onDoubleClick() {
      if (this.selectedPoint !== null && this.selectedPoint !== 0 && this.selectedPoint !== this.curves[this.currentChannel].length - 1) {
          this.curves[this.currentChannel].splice(this.selectedPoint, 1);
          this.selectedPoint = null;
          this.render();
          this.updateStateWithLUTs();
      }
  }

  // --- Métodos de manipulación de datos ---

  addPoint(channel, x, y) {
    const points = this.curves[channel];
    points.push({ x: Math.round(x), y: Math.round(y) });
    points.sort((a, b) => a.x - b.x);
  }

  setChannel(channel) {
    this.currentChannel = channel;
    this.selectedPoint = null;
    document.querySelectorAll('.curve-channel-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.channel === channel);
    });
    this.render();
  }

  resetChannel(channel) {
    this.curves[channel] = [{ x: 0, y: 0 }, { x: 255, y: 255 }];
    this.selectedPoint = null;
    this.render();
    this.updateStateWithLUTs();
  }

  resetAllChannels() {
    for (const channel in this.curves) {
      this.curves[channel] = [{ x: 0, y: 0 }, { x: 255, y: 255 }];
    }
    this.selectedPoint = null;
    this.render();
    this.updateStateWithLUTs();
  }

  // --- Métodos de renderizado ---

  render() {
    const ctx = this.ctx;
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, this.width, this.height);

    // Dibuja la grilla de fondo
    this.drawGrid();

    // Dibuja la curva y los puntos
    const points = this.curves[this.currentChannel];
    const channelColors = { rgb: '#06b6d4', r: '#ef4444', g: '#10b981', b: '#3b82f6' };
    
    ctx.strokeStyle = channelColors[this.currentChannel];
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    const lut = this.getLUT(this.currentChannel);
    for (let x = 0; x <= 255; x++) {
      const canvasX = this.valueToCanvas(x, true);
      const canvasY = this.valueToCanvas(lut[x], false);
      if (x === 0) ctx.moveTo(canvasX, canvasY);
      else ctx.lineTo(canvasX, canvasY);
    }
    ctx.stroke();

    // Dibuja los puntos de control
    points.forEach((point, index) => {
      const px = this.valueToCanvas(point.x, true);
      const py = this.valueToCanvas(point.y, false);
      ctx.fillStyle = index === this.selectedPoint ? '#f59e0b' : '#06b6d4';
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px, py, this.pointRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
  }

  drawGrid() {
    const ctx = this.ctx;
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const pos = (i / 4) * this.width;
      ctx.beginPath();
      ctx.moveTo(pos, 0); ctx.lineTo(pos, this.height); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, pos); ctx.lineTo(this.width, pos); ctx.stroke();
    }
    ctx.strokeStyle = '#4b5563';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(0, this.height); ctx.lineTo(this.width, 0); ctx.stroke();
    ctx.setLineDash([]);
  }

  // --- Métodos de utilidad y comunicación ---
  
  updateStateWithLUTs() {
    this.appState.updateConfig({ curvesLUTs: this.getAllLUTs() });
  }

  getAllLUTs() {
    return {
      rgb: this.getLUT('rgb'),
      r: this.getLUT('r'),
      g: this.getLUT('g'),
      b: this.getLUT('b')
    };
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

  getCanvasCoordinates(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
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
