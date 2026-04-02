// ============================================================================
// STATE MANAGER — DitherLab v8
// ============================================================================

class State {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.data = {
      media: { file: null, type: null, isPlaying: false, duration: 0, currentTime: 0, playbackSpeed: 1 },
      config: {
        effect: 'floyd-steinberg',
        isMonochrome: false,
        useOriginalColor: false,
        colorCount: 4,
        colors: [],
        ditherScale: 2,
        serpentineScan: false,
        diffusionStrength: 1.0,
        patternStrength: 0.5,
        brightness: 0,
        contrast: 1.0,
        saturation: 1.0,
        curvesLUTs: null,
        algorithmParams: {},
        labMode: false  // NUEVO: espacio de color LAB para difusión de error
      },
      timeline: { markerInTime: null, markerOutTime: null, loopSection: false },
      metrics: { fps: 0, processTime: 0, psnr: 0, ssim: 0, compression: 0, paletteSize: 0 }
    };
    this.listeners = new Map();
  }
  
  get(path) {
    if (!path) return this.data;
    const keys = path.split('.');
    let value = this.data;
    for (const key of keys) { if (value === undefined || value === null) return undefined; value = value[key]; }
    return value;
  }
  
  set(path, value, silent = false) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    let target = this.data;
    for (const key of keys) { if (!(key in target)) target[key] = {}; target = target[key]; }
    const oldValue = target[lastKey];
    target[lastKey] = value;
    if (!silent) this.notifyChange(path, value, oldValue);
  }
  
  setMultiple(updates, silent = false) {
    for (const [path, value] of Object.entries(updates)) this.set(path, value, silent);
  }
  
  update(path, updates) {
    const current = this.get(path);
    if (typeof current !== 'object' || current === null) return;
    this.set(path, { ...current, ...updates });
  }
  
  subscribe(callback) {
    const id = Symbol();
    this.listeners.set(id, callback);
    return () => this.listeners.delete(id);
  }
  
  notifyChange(path, newValue, oldValue) {
    if (this.eventBus) this.eventBus.emit('state:changed', { path, newValue, oldValue });
    for (const callback of this.listeners.values()) {
      try { callback(path, newValue, oldValue); } catch (e) { console.error('[State] Error:', e); }
    }
  }
  
  reset(path = null) {
    if (path) { const iv = this.getInitialValue(path); if (iv !== undefined) this.set(path, iv); }
    else { const old = this.data; this.data = this.getInitialState(); this.notifyChange('', this.data, old); }
  }
  
  getInitialState() {
    return {
      media: { file: null, type: null, isPlaying: false, duration: 0, currentTime: 0, playbackSpeed: 1 },
      config: {
        effect: 'floyd-steinberg', isMonochrome: false, useOriginalColor: false,
        colorCount: 4, colors: [], ditherScale: 2, serpentineScan: false,
        diffusionStrength: 1.0, patternStrength: 0.5,
        brightness: 0, contrast: 1.0, saturation: 1.0,
        curvesLUTs: null, algorithmParams: {}, labMode: false
      },
      timeline: { markerInTime: null, markerOutTime: null, loopSection: false },
      metrics: { fps: 0, processTime: 0, psnr: 0, ssim: 0, compression: 0, paletteSize: 0 }
    };
  }
  
  getInitialValue(path) {
    const initial = this.getInitialState();
    const keys = path.split('.');
    let value = initial;
    for (const key of keys) { if (value === undefined || value === null) return undefined; value = value[key]; }
    return value;
  }
  
  export() { return JSON.parse(JSON.stringify(this.data)); }
  import(data) { this.data = JSON.parse(JSON.stringify(data)); this.notifyChange('', this.data, null); }
  print() { console.log('📊 Estado:', JSON.stringify(this.data, null, 2)); }
}

if (typeof window !== 'undefined') window.State = State;
