/**
 * main.js
 * Punto de entrada principal de DitherLab v7.
 * Responsable de inicializar y conectar todos los módulos.
 */
import { eventBus } from './event-bus.js';
import { state } from './state.js';
import { createRenderer } from './core/renderer.js';
import { initializeMediaLoader } from './core/media-loader.js';
import { initializeUIManager } from './ui/ui-manager.js';

// --- Inicialización de la Aplicación ---

document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 DitherLab v7 inicializando...');

  // 1. Contenedores del DOM
  const canvasContainer = document.getElementById('canvas-container');
  const sidebarContainer = document.getElementById('sidebar-container');
  const modalContainer = document.getElementById('modal-container');

  // 2. Inicializar el Motor de Renderizado (p5.js)
  //    Le pasamos el estado y el bus de eventos para que pueda reaccionar a los cambios.
  const renderer = createRenderer(canvasContainer, state, eventBus);

  // 3. Inicializar el Cargador de Medios
  //    Se encargará de la lógica de arrastrar y soltar archivos.
  initializeMediaLoader(state, eventBus);

  // 4. Inicializar el Manejador de la UI
  //    Construirá dinámicamente toda la interfaz de usuario y la conectará a los eventos.
  initializeUIManager(sidebarContainer, modalContainer, state, eventBus);
  
  // 5. Configurar PWA (opcional, pero buena práctica)
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then(() => console.log('Service Worker registrado con éxito.'))
        .catch(err => console.error('Error en Service Worker:', err));
    });
  }

  console.log('✅ DitherLab v7 listo.');
});