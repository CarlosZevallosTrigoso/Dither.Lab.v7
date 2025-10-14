/**
 * @file UIController.js
 * @description Orquestador principal de todos los componentes de la UI.
 * Inicializa los paneles, modales y listeners de eventos globales.
 */
import { store } from '../core/Store.js';
import { eventBus } from '../core/EventBus.js';
import { toast } from './utils/Toast.js';
import { Modal } from './utils/Modal.js';

// Importar todos los paneles
import { MediaPanel } from './components/MediaPanel.js';
import { AlgorithmPanel } from './components/AlgorithmPanel.js';
import { PalettePanel } from './components/PalettePanel.js';
import { ImageAdjustmentsPanel } from './components/ImageAdjustmentsPanel.js';
import { CurvesEditor } from './components/CurvesEditor.js';
import { TimelinePanel } from './components/TimelinePanel.js';
import { ExportPanel } from './components/ExportPanel.js';
import { PresetsPanel } from './components/PresetsPanel.js';
import { MetricsPanel } from './components/MetricsPanel.js';
import { StatsPanel } from './components/StatsPanel.js';

export class UIController {
  constructor() {
    this.store = store;
    this.eventBus = eventBus;
    this.panels = {};
    this.modals = {};
  }

  init() {
    this.initComponents();
    this.initGlobalListeners();
    console.log('UI Controller inicializado con todos los paneles.');
  }

  initComponents() {
    // Inicializar Paneles
    this.panels.media = new MediaPanel();
    this.panels.algorithm = new AlgorithmPanel();
    this.panels.palette = new PalettePanel();
    this.panels.imageAdjustments = new ImageAdjustmentsPanel();
    this.panels.curvesEditor = new CurvesEditor(); // El editor de curvas también es un panel
    this.panels.timeline = new TimelinePanel();
    this.panels.export = new ExportPanel();
    this.panels.presets = new PresetsPanel();
    this.panels.metrics = new MetricsPanel();
    this.panels.stats = new StatsPanel();

    for (const panelName in this.panels) {
      this.panels[panelName].init();
    }
    
    // Inicializar Modales
    this.modals.shortcuts = new Modal('shortcutsModal');
    this.modals.shortcuts.bindOpenButton('shortcutsBtn');
    
    this.modals.metrics = new Modal('metricsModal');
    this.modals.metrics.bindOpenButton('metricsBtn');
  }

  initGlobalListeners() {
    this.eventBus.subscribe('ui:showToast', (data) => toast.show(data.message, data.duration));
    
    // Conectar eventos del núcleo a paneles específicos
    this.eventBus.subscribe('stats:update', (stats) => this.panels.stats.updateFrameStats(stats));
    this.eventBus.subscribe('metrics:updated', (metrics) => this.panels.metrics.updateMetrics(metrics));

    document.addEventListener('keydown', (e) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
      
      const keyMap = {
          ' ': () => this.eventBus.publish('playback:toggle'),
          'arrowleft': () => this.eventBus.publish('playback:step-frame', -1),
          'arrowright': () => this.eventBus.publish('playback:step-frame', 1),
          'i': () => this.eventBus.publish('timeline:set-marker', 'in'),
          'o': () => this.eventBus.publish('timeline:set-marker', 'out'),
          'd': () => this.eventBus.publish('export:start', { format: 'png' }),
          'f': () => this.toggleFullscreen(),
          '?': () => this.modals.shortcuts.open(),
      };
      
      const action = keyMap[e.key.toLowerCase()];
      if (action) {
        e.preventDefault();
        action();
      }
    });
  }
  
  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error al entrar en pantalla completa: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  }
}
