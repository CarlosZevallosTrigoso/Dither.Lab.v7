/**
 * @file UIController.js
 * @description Orquestador principal de todos los componentes de la UI.
 * Inicializa los paneles, modales y listeners de eventos globales.
 */
import { store } from '../core/Store.js';
import { eventBus } from '../core/EventBus.js';
import { Toast, toast } from './utils/Toast.js';
import { Modal } from './utils/Modal.js';
import { MediaPanel } from './components/MediaPanel.js';
import { AlgorithmPanel } from './components/AlgorithmPanel.js';
import { PalettePanel } from './components/PalettePanel.js';
// (Importaremos los otros paneles en las siguientes fases)

export class UIController {
  constructor() {
    this.store = store;
    this.eventBus = eventBus;
    this.panels = {};
    this.modals = {};
  }

  /**
   * Inicializa todos los componentes de la UI.
   */
  init() {
    this.initComponents();
    this.initGlobalListeners();
    console.log('UI Controller inicializado.');
  }

  initComponents() {
    // Inicializar Paneles
    this.panels.media = new MediaPanel();
    this.panels.algorithm = new AlgorithmPanel();
    this.panels.palette = new PalettePanel();
    // (Añadiremos más paneles aquí)

    for (const panelName in this.panels) {
      this.panels[panelName].init();
    }
    
    // Inicializar Modales
    this.modals.shortcuts = new Modal('shortcutsModal');
    this.modals.shortcuts.bindOpenButton('shortcutsBtn');
    
    this.modals.metrics = new Modal('metricsModal');
    this.modals.metrics.bindOpenButton('metricsBtn');
  }

  /**
   * Inicializa listeners para eventos que no pertenecen a un panel específico.
   */
  initGlobalListeners() {
    // Listener para mostrar notificaciones toast
    this.eventBus.subscribe('ui:showToast', (data) => {
      toast.show(data.message, data.duration);
    });

    // Listener para el atajo de teclado de pantalla completa
    document.addEventListener('keydown', (e) => {
        // Ignorar si se está escribiendo en un input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

        if (e.key.toLowerCase() === 'f') {
            this.toggleFullscreen();
        }
    });
  }
  
  toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.error(`Error al intentar entrar en pantalla completa: ${err.message} (${err.name})`);
        });
    } else {
        document.exitFullscreen();
    }
  }
}
