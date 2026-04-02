// ============================================================================
// MAIN ENTRY POINT - DitherLab v8 Architecture
// ============================================================================
// Inicializa todos los módulos de forma coordinada.
// Este es el ÚNICO punto de inicialización.

(function() {
  'use strict';
  
  console.log('🚀 Inicializando DitherLab v8...');
  
  // ========================================================================
  // Verificar dependencias
  // ========================================================================
  if (typeof EventBus === 'undefined' || typeof State === 'undefined') {
    console.error('❌ Core modules no cargados (EventBus/State)');
    return;
  }
  
  // ========================================================================
  // Core: EventBus + State
  // ========================================================================
  const eventBus = window.eventBus; // Singleton creado en EventBus.js
  const state = new State(eventBus);
  window.state = state;
  
  console.log('  ✓ Core (EventBus + State)');
  
  // ========================================================================
  // MediaManager
  // ========================================================================
  if (typeof MediaManager !== 'undefined') {
    window.mediaManager = new MediaManager(state, eventBus);
    console.log('  ✓ MediaManager');
  }
  
  // ========================================================================
  // ExportManager
  // ========================================================================
  if (typeof ExportManager !== 'undefined') {
    window.exportManager = new ExportManager(state, eventBus);
    console.log('  ✓ ExportManager');
  }
  
  // ========================================================================
  // TimelineManager
  // ========================================================================
  if (typeof TimelineManager !== 'undefined') {
    window.timelineManager = new TimelineManager(state, eventBus);
    // .init() será llamado por app.js cuando se cargue un video
    console.log('  ✓ TimelineManager');
  }
  
  // ========================================================================
  // UIController — maneja TODOS los eventos DOM
  // ========================================================================
  if (typeof UIController !== 'undefined') {
    const uiController = new UIController(state, eventBus);
    window.uiController = uiController;
    
    const initUI = () => uiController.init();
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initUI);
    } else {
      initUI();
    }
    
    console.log('  ✓ UIController');
  }
  
  // ========================================================================
  // AlgorithmRegistry (estructura para futuro, no activa aún)
  // ========================================================================
  if (typeof AlgorithmRegistry !== 'undefined') {
    window.algorithmRegistry = new AlgorithmRegistry();
    console.log('  ✓ AlgorithmRegistry');
  }
  
  // ========================================================================
  // Debugging helpers
  // ========================================================================
  window.DitherLab = {
    version: '8.0',
    state,
    eventBus,
    mediaManager: window.mediaManager,
    exportManager: window.exportManager,
    timelineManager: window.timelineManager,
    uiController: window.uiController,
    
    printState() { state.print(); },
    
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
  
  console.log('✅ DitherLab v8 inicializado');
  console.log('💡 window.DitherLab para debugging');
  
  eventBus.emit('app:initialized');
  
})();
