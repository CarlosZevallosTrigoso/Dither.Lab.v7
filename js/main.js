// ============================================================================
// MAIN ENTRY POINT - v7 Architecture
// ============================================================================
// Inicializa los módulos v7 de forma coordinada

(function() {
  'use strict';
  
  console.log('🚀 Inicializando DitherLab v7...');
  
  // Verificar que las dependencias estén cargadas
  if (typeof EventBus === 'undefined') {
    console.error('❌ EventBus no está cargado');
    return;
  }
  
  if (typeof State === 'undefined') {
    console.error('❌ State no está cargado');
    return;
  }
  
  // ============================================================================
  // INICIALIZACIÓN DE CORE
  // ============================================================================
  
  // Crear instancia de EventBus (ya existe como singleton)
  const eventBus = window.eventBus;
  
  // Crear instancia de State
  const state = new State(eventBus);
  window.state = state; // Hacer global para acceso desde legacy code
  
  console.log('  ✓ Core inicializado (EventBus + State)');
  
  // ============================================================================
  // INICIALIZACIÓN DE MANAGERS
  // ============================================================================
  
  // MediaManager (si está disponible)
  if (typeof MediaManager !== 'undefined') {
    const mediaManager = new MediaManager(state, eventBus);
    window.mediaManager = mediaManager;
    console.log('  ✓ MediaManager inicializado');
  } else {
    console.warn('  ⚠️ MediaManager no disponible');
  }
  
  // ExportManager (si está disponible)
  if (typeof ExportManager !== 'undefined') {
    const exportManager = new ExportManager(state, eventBus);
    window.exportManager = exportManager;
    console.log('  ✓ ExportManager inicializado');
  } else {
    console.warn('  ⚠️ ExportManager no disponible');
  }
  
  // UIController (si está disponible)
  if (typeof UIController !== 'undefined') {
    const uiController = new UIController(state, eventBus);
    window.uiController = uiController;
    
    // Inicializar UI cuando el DOM esté listo
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        uiController.init();
      });
    } else {
      uiController.init();
    }
    
    console.log('  ✓ UIController inicializado');
  } else {
    console.warn('  ⚠️ UIController no disponible');
  }
  
  // AlgorithmRegistry (si está disponible)
  if (typeof AlgorithmRegistry !== 'undefined') {
    const algorithmRegistry = new AlgorithmRegistry();
    window.algorithmRegistry = algorithmRegistry;
    console.log('  ✓ AlgorithmRegistry inicializado');
    
    // TODO: Registrar algoritmos aquí cuando estén convertidos a clases
    // algorithmRegistry.register('floyd-steinberg', FloydSteinbergAlgorithm);
  } else {
    console.warn('  ⚠️ AlgorithmRegistry no disponible');
  }
  
  // ============================================================================
  // DEBUGGING HELPERS
  // ============================================================================
  
  // Exponer helpers globales para debugging en consola
  window.DitherLab = {
    version: '7.0',
    state,
    eventBus,
    mediaManager: window.mediaManager,
    exportManager: window.exportManager,
    uiController: window.uiController,
    algorithmRegistry: window.algorithmRegistry,
    
    // Métodos útiles
    printState() {
      state.print();
    },
    
    printEvents() {
      console.log('📡 Eventos registrados:');
      for (const [event, listeners] of eventBus.listeners.entries()) {
        console.log(`  • ${event}: ${listeners.length} listeners`);
      }
    },
    
    getStats() {
      return {
        stateSize: JSON.stringify(state.data).length,
        eventListeners: Array.from(eventBus.listeners.entries()).map(
          ([event, listeners]) => ({ event, count: listeners.length })
        ),
        mediaLoaded: !!state.get('media.file'),
        mediaType: state.get('media.type'),
        currentEffect: state.get('config.effect')
      };
    }
  };
  
  console.log('✅ DitherLab v7 inicializado correctamente');
  console.log('💡 Usa window.DitherLab para debugging en consola');
  
  // Emitir evento de inicialización completa
  eventBus.emit('app:initialized');
  
})();
