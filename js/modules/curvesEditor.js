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
import { updateConfig, updateCurves, getState } from '../app/state.js';

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

  // ✅ IMPLEMENTADO: Detectar click en puntos o crear nuevos
  onMouseDown(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 255;
    const y = 255 - ((e.clientY - rect.top) / rect.height) * 255;
    
    const points = this.curves[this.currentChannel];
    let found = false;
    
    // Buscar si hicimos click en un punto existente
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const dx = (p.x / 255) * rect.width - (e.clientX - rect.left);
      const dy = ((255 - p.y) / 255) * rect.height - (e.clientY - rect.top);
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < this.pointRadius + 5) {
        this.selectedPoint = i;
        this.isDragging = true;
        found = true;
        break;
      }
    }
    
    // Si no hicimos click en un punto, crear uno nuevo (máximo 16 puntos)
    if (!found && points.length < 16) {
      this.addPoint(this.currentChannel, x, y);
      this.render();
    }
  }

  // ✅ IMPLEMENTADO: Mover puntos y mostrar coordenadas
  onMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 255);
    const y = Math.round(255 - ((e.clientY - rect.top) / rect.height) * 255);
    
    // Mostrar coordenadas al pasar el mouse
    const infoEl = document.getElementById('curvePointInfo');
    if (infoEl) {
      if (this.selectedPoint !== null && this.isDragging) {
        const point = this.curves[this.currentChannel][this.selectedPoint];
        infoEl.textContent = `(${Math.round(point.x)}, ${Math.round(point.y)})`;
      } else {
        infoEl.textContent = `(${x}, ${y})`;
      }
    }
    
    if (!this.isDragging || this.selectedPoint === null) {
      return;
    }
    
    const points = this.curves[this.currentChannel];
    const point = points[this.selectedPoint];
    
    // No permitir mover los puntos extremos en X (0 y 255)
    if (this.selectedPoint === 0 || this.selectedPoint === points.length - 1) {
      point.y = Math.max(0, Math.min(255, Math.round(y)));
    } else {
      point.x = Math.max(0, Math.min(255, Math.round(x)));
      point.y = Math.max(0, Math.min(255, Math.round(y)));
      
      // Re-ordenar puntos por posición X
      points.sort((a, b) => a.x - b.x);
      
      // Actualizar el índice del punto seleccionado después del sort
      for (let i = 0; i < points.length; i++) {
        if (points[i] === point) {
          this.selectedPoint = i;
          break;
        }
      }
    }
    
    this.render();
    this.notifyUpdate();
  }

  onMouseUp() { 
    this.isDragging = false; 
  }

  // ✅ IMPLEMENTADO: Eliminar puntos con doble click
  onDoubleClick(e) {
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const points = this.curves[this.currentChannel];
    
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const px = (p.x / 255) * rect.width;
      const py = ((255 - p.y) / 255) * rect.height;
      const dist = Math.sqrt((px - mouseX) ** 2 + (py - mouseY) ** 2);
      
      // No eliminar puntos extremos (primero y último)
      if (dist < this.pointRadius + 5 && i !== 0 && i !== points.length - 1) {
        points.splice(i, 1);
        this.selectedPoint = null;
        this.render();
        this.notifyUpdate();
        break;
      }
    }
  }

  addPoint(channel, x, y) {
    const points = this.curves[channel];
    
    // No añadir puntos duplicados en la misma posición X
    const exists = points.some(p => Math.abs(p.x - x) < 2);
    if (exists) return;
    
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

  // ✅ IMPLEMENTADO: Renderizado completo del canvas
  render() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    
    // Limpiar canvas
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, w, h);
    
    // Dibujar grilla
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const x = (i / 4) * w;
      const y = (i / 4) * h;
      
      // Líneas verticales
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
      
      // Líneas horizontales
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    
    // Línea diagonal de referencia (identidad)
    ctx.strokeStyle = '#4b5563';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(w, 0);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Dibujar curva
    const points = this.curves[this.currentChannel];
    const colors = { 
      rgb: '#06b6d4', 
      r: '#ef4444', 
      g: '#10b981', 
      b: '#3b82f6' 
    };
    
    ctx.strokeStyle = colors[this.currentChannel];
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    for (let i = 0; i < points.length; i++) {
      const x = (points[i].x / 255) * w;
      const y = h - (points[i].y / 255) * h;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
    
    // Dibujar puntos de control
    for (let i = 0; i < points.length; i++) {
      const x = (points[i].x / 255) * w;
      const y = h - (points[i].y / 255) * h;
      const isSelected = i === this.selectedPoint;
      
      // Punto interior
      ctx.fillStyle = isSelected ? '#fbbf24' : colors[this.currentChannel];
      ctx.beginPath();
      ctx.arc(x, y, isSelected ? this.pointRadius + 2 : this.pointRadius, 0, Math.PI * 2);
      ctx.fill();
      
      // Borde blanco si está seleccionado
      if (isSelected) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  }
  
  // ✅ IMPLEMENTADO: Generar Look-Up Table para aplicar la curva
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
    // Actualizar el estado global de curves
    updateCurves(this.curves);
    // Actualizar las LUTs en config
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

    // Escuchar eventos globales para cargar presets
    events.on('presets:loaded', (presetData) => {
        if (presetData.curves) {
            editor.curves = presetData.curves;
            editor.render();
            editor.notifyUpdate();
        }
    });
    
    // Escuchar cuando se resetean todas las curvas desde otro módulo
    events.on('curves:reset-all', () => {
        editor.resetAllChannels();
    });
    
    events.on('ui:curves-editor-toggled', () => editor.render());
    
    console.log('Curves Editor inicializado.');
}
