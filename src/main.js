// src/main.js

import AppState from './core/appState.js';
import UIManager from './components/uiManager.js';
import DitherProcessor from './core/ditherProcessor.js';
import MediaHandler from './core/mediaHandler.js';
import { initializePresets } from './services/presetsManager.js';
import { initializePWA } from './services/pwa.js';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Inicializar el estado central
  const appState = new AppState();

  // 2. Inicializar el procesador de dithering (motor de p5.js)
  // Se le pasa el estado para que pueda reaccionar a los cambios
  const ditherProcessor = new DitherProcessor('canvasContainer', appState);

  // 3. Inicializar el manejador de la UI
  // Se le pasa el estado para que pueda modificarlo
  const uiManager = new UIManager(appState);

  // 4. Inicializar el manejador de medios
  // Necesita el estado y el procesador para cargar y mostrar los archivos
  const mediaHandler = new MediaHandler(appState, ditherProcessor);

  // 5. Conectar los módulos que necesitan comunicarse entre sí
  // Cuando la UI esté lista, informamos al manejador de medios para que active el drag & drop
  uiManager.onReady(() => {
    mediaHandler.initializeDropZone();
  });

  // Cuando se carga un nuevo medio, la UI debe actualizarse (ej: timeline)
  mediaHandler.onMediaLoaded((mediaType) => {
    uiManager.handleMediaLoaded(mediaType);
  });
  
  // 6. Cargar funcionalidades adicionales
  initializePresets(appState, uiManager);
  initializePWA();

  console.log('DitherLab v7 Modular aplication inicializada.');
});
