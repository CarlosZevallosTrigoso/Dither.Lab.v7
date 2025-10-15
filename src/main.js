/**
 * @file main.js
 * @description Punto de entrada principal para la aplicación DitherLab v7.
 * Este archivo es responsable de inicializar todos los módulos, controladores y
 * registros en el orden correcto para que la aplicación funcione.
 */

// Core
import { eventBus } from './core/EventBus.js';
import { store } from './core/Store.js';
import { CanvasManager } from './core/CanvasManager.js';
import { MediaLoader } from './core/MediaLoader.js';

// UI
import { UIController } from './ui/UIController.js';

// Systems
import { PlaybackManager } from './timeline/PlaybackManager.js';
import { TimelineController } from './timeline/TimelineController.js';
import { PresetManager } from './presets/PresetManager.js';
import { MetricsCalculator } from './metrics/MetricsCalculator.js';

// Exporters
import { exporterRegistry } from './exporters/ExporterRegistry.js';
import PNGExporter from './exporters/PNGExporter.js';
import WebMExporter from './exporters/WebMExporter.js';
import GIFExporter from './exporters/GIFExporter.js';
import SpriteSheetExporter from './exporters/SpriteSheetExporter.js';
import SequenceExporter from './exporters/SequenceExporter.js';

// Utils
import { debounce } from './utils/debounce.js';


/**
 * @class App
 * @description Clase principal que encapsula la inicialización de la aplicación.
 */
class App {
  constructor() {
    this.canvasManager = null;
    this.mediaLoader = null;
    this.uiController = null;
    this.playbackManager = null;
    this.timelineController = null;
    this.presetManager = null;
    this.metricsCalculator = null;
  }

  /**
   * Inicializa la aplicación.
   * El orden de inicialización es crucial:
   * 1. El CanvasManager debe iniciarse primero para crear la instancia de p5.
   * 2. Se espera el evento 'canvas:ready' que notifica que p5 está listo.
   * 3. Se inicializan todos los demás módulos que dependen de p5 o del DOM.
   * 4. Se registran los exportadores.
   */
  init() {
    console.log('DitherLab v7 - Inicializando aplicación...');

    // 1. Iniciar el gestor del canvas
    this.canvasManager = new CanvasManager('canvasContainer');
    this.canvasManager.init();
    
    // 2. Iniciar el controlador de la UI, que a su vez inicializa todos los paneles.
    // Esto se hace ahora para asegurar que los elementos del DOM existen.
    this.uiController = new UIController();
    this.uiController.init();

    // 3. Esperar a que p5.js esté listo para inicializar los módulos dependientes de él.
    eventBus.subscribe('canvas:ready', (p5_instance) => {
      console.log('Canvas listo. Inicializando módulos dependientes de p5...');

      // 4. Inicializar todos los demás sistemas
      this.mediaLoader = new MediaLoader(p5_instance);
      eventBus.subscribe('media:load-file', (file) => this.mediaLoader.loadFile(file));

      this.playbackManager = new PlaybackManager();
      this.timelineController = new TimelineController();
      this.presetManager = new PresetManager();
      this.metricsCalculator = new MetricsCalculator();
      this.metricsCalculator.init(p5_instance);

      // Iniciar el registro de exportadores
      this.registerExporters();
      
      this.presetManager.init();

      // Añadir listener para el redimensionado de la ventana
      window.addEventListener('resize', debounce(() => {
        this.canvasManager.resizeCanvasToContainer();
      }, 150));


      console.log('DitherLab v7 - Todos los módulos inicializados.');
      eventBus.publish('ui:showToast', { message: 'Bienvenido a DitherLab v7' });
    });
  }

  /**
   * Registra todos los módulos de exportación en el registro central.
   */
  registerExporters() {
    exporterRegistry.init(this.canvasManager);
    exporterRegistry.register(PNGExporter);
    exporterRegistry.register(WebMExporter);
    exporterRegistry.register(GIFExporter);
    exporterRegistry.register(SpriteSheetExporter);
    exporterRegistry.register(SequenceExporter);
    console.log('Todos los exportadores han sido registrados.');
  }
}

// Iniciar la aplicación una vez que el DOM esté completamente cargado.
window.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
