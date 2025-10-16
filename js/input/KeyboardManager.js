// ============================================================================
// KEYBOARD MANAGER - Gestión de atajos de teclado
// ============================================================================

class KeyboardManager {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.isEnabled = true;
    
    this.shortcuts = {
      ' ': 'media:toggle-play',
      'arrowleft': 'media:prev-frame',
      'arrowright': 'media:next-frame',
      'i': 'timeline:mark-in',
      'o': 'timeline:mark-out',
      'r': 'export:start-recording',
      's': 'export:stop-recording',
      'd': 'export:png',
      'f': 'app:toggle-fullscreen',
      'm': 'modal:metrics',
      '?': 'modal:shortcuts',
      'escape': 'modal:close-all'
    };
    
    console.log('⌨️ KeyboardManager inicializado');
  }

  /**
   * Inicializar listeners
   */
  init() {
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    console.log('  ✓ Keyboard shortcuts activos');
  }

  /**
   * Manejar keydown
   */
  handleKeyDown(e) {
    // Ignorar si está deshabilitado
    if (!this.isEnabled) return;
    
    // Ignorar si estamos en un input
    if (this.isTyping(e.target)) return;
    
    const key = e.key.toLowerCase();
    
    // Buscar shortcut
    if (key in this.shortcuts) {
      e.preventDefault();
      const event = this.shortcuts[key];
      this.eventBus.emit(event);
    }
  }

  /**
   * Verificar si estamos escribiendo en un input
   */
  isTyping(target) {
    const tagName = target.tagName;
    return tagName === 'INPUT' || tagName === 'SELECT' || tagName === 'TEXTAREA';
  }

  /**
   * Habilitar/deshabilitar shortcuts
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
  }

  /**
   * Registrar nuevo shortcut
   */
  register(key, event) {
    this.shortcuts[key.toLowerCase()] = event;
  }

  /**
   * Desregistrar shortcut
   */
  unregister(key) {
    delete this.shortcuts[key.toLowerCase()];
  }

  /**
   * Obtener todos los shortcuts
   */
  getAll() {
    return { ...this.shortcuts };
  }
}

// Exportar
if (typeof window !== 'undefined') {
  window.KeyboardManager = KeyboardManager;
}