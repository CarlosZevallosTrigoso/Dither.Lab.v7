// ============================================================================
// ALGORITHM REGISTRY - Sistema de registro de algoritmos
// ============================================================================
// Permite registrar y gestionar algoritmos de dithering de forma dinámica
// Los algoritmos se pueden agregar sin modificar código existente

class AlgorithmRegistry {
  constructor() {
    // Mapa de algoritmos registrados: id -> clase del algoritmo
    this.algorithms = new Map();
    
    // Mapa de categorías
    this.categories = new Map();
    
    // Algoritmo por defecto
    this.defaultAlgorithm = 'floyd-steinberg';
    
    console.log('🎨 AlgorithmRegistry inicializado');
  }
  
  /**
   * Registrar un algoritmo
   * @param {string} id - Identificador único del algoritmo
   * @param {class} AlgorithmClass - Clase del algoritmo (debe extender AlgorithmBase)
   * @param {object} options - Opciones adicionales
   */
  register(id, AlgorithmClass, options = {}) {
    // Validar que la clase tenga las propiedades requeridas
    if (!AlgorithmClass.displayName) {
      console.warn(`[AlgorithmRegistry] Algoritmo "${id}" no tiene displayName`);
    }
    
    if (!AlgorithmClass.description) {
      console.warn(`[AlgorithmRegistry] Algoritmo "${id}" no tiene description`);
    }
    
    if (!AlgorithmClass.category) {
      console.warn(`[AlgorithmRegistry] Algoritmo "${id}" no tiene category`);
    }
    
    // Registrar algoritmo
    this.algorithms.set(id, {
      id,
      class: AlgorithmClass,
      displayName: AlgorithmClass.displayName || id,
      description: AlgorithmClass.description || '',
      category: AlgorithmClass.category || 'other',
      parameters: AlgorithmClass.parameters || [],
      ...options
    });
    
    // Agregar a categoría
    const category = AlgorithmClass.category || 'other';
    if (!this.categories.has(category)) {
      this.categories.set(category, []);
    }
    this.categories.get(category).push(id);
    
    console.log(`  ✓ Algoritmo registrado: ${id} (${AlgorithmClass.displayName})`);
  }
  
  /**
   * Obtener un algoritmo por ID
   * @param {string} id - ID del algoritmo
   * @returns {object|null} - Información del algoritmo
   */
  get(id) {
    return this.algorithms.get(id) || null;
  }
  
  /**
   * Verificar si un algoritmo existe
   * @param {string} id - ID del algoritmo
   * @returns {boolean}
   */
  has(id) {
    return this.algorithms.has(id);
  }
  
  /**
   * Obtener clase de un algoritmo
   * @param {string} id - ID del algoritmo
   * @returns {class|null}
   */
  getClass(id) {
    const algorithm = this.algorithms.get(id);
    return algorithm ? algorithm.class : null;
  }
  
  /**
   * Crear instancia de un algoritmo
   * @param {string} id - ID del algoritmo
   * @param {object} config - Configuración para el algoritmo
   * @returns {object|null} - Instancia del algoritmo
   */
  createInstance(id, config = {}) {
    const AlgorithmClass = this.getClass(id);
    
    if (!AlgorithmClass) {
      console.error(`[AlgorithmRegistry] Algoritmo no encontrado: ${id}`);
      return null;
    }
    
    try {
      return new AlgorithmClass(config);
    } catch (error) {
      console.error(`[AlgorithmRegistry] Error al crear instancia de "${id}":`, error);
      return null;
    }
  }
  
  /**
   * Obtener todos los algoritmos registrados
   * @returns {array} - Array de objetos con información de algoritmos
   */
  getAll() {
    return Array.from(this.algorithms.values()).map(algo => ({
      id: algo.id,
      displayName: algo.displayName,
      description: algo.description,
      category: algo.category,
      parameters: algo.parameters
    }));
  }
  
  /**
   * Obtener algoritmos por categoría
   * @param {string} category - Nombre de la categoría
   * @returns {array}
   */
  getByCategory(category) {
    const ids = this.categories.get(category) || [];
    return ids.map(id => this.get(id)).filter(Boolean);
  }
  
  /**
   * Obtener todas las categorías
   * @returns {array} - Array de nombres de categorías
   */
  getCategories() {
    return Array.from(this.categories.keys());
  }
  
  /**
   * Obtener algoritmos agrupados por categoría
   * @returns {object} - Objeto con categorías como keys y arrays de algoritmos como values
   */
  getAllGroupedByCategory() {
    const grouped = {};
    
    for (const [category, ids] of this.categories.entries()) {
      grouped[category] = ids.map(id => this.get(id)).filter(Boolean);
    }
    
    return grouped;
  }
  
  /**
   * Buscar algoritmos por nombre o descripción
   * @param {string} query - Texto a buscar
   * @returns {array}
   */
  search(query) {
    const lowerQuery = query.toLowerCase();
    
    return this.getAll().filter(algo => {
      return algo.displayName.toLowerCase().includes(lowerQuery) ||
             algo.description.toLowerCase().includes(lowerQuery) ||
             algo.id.toLowerCase().includes(lowerQuery);
    });
  }
  
  /**
   * Desregistrar un algoritmo
   * @param {string} id - ID del algoritmo
   * @returns {boolean} - true si se eliminó exitosamente
   */
  unregister(id) {
    const algorithm = this.algorithms.get(id);
    
    if (!algorithm) {
      return false;
    }
    
    // Remover de categoría
    const category = algorithm.category;
    if (this.categories.has(category)) {
      const ids = this.categories.get(category);
      const index = ids.indexOf(id);
      if (index > -1) {
        ids.splice(index, 1);
      }
      
      // Limpiar categoría si está vacía
      if (ids.length === 0) {
        this.categories.delete(category);
      }
    }
    
    // Remover algoritmo
    this.algorithms.delete(id);
    
    console.log(`  ✓ Algoritmo desregistrado: ${id}`);
    return true;
  }
  
  /**
   * Limpiar todos los algoritmos
   */
  clear() {
    this.algorithms.clear();
    this.categories.clear();
    console.log('[AlgorithmRegistry] Registro limpiado');
  }
  
  /**
   * Obtener información del algoritmo por defecto
   * @returns {object|null}
   */
  getDefault() {
    return this.get(this.defaultAlgorithm);
  }
  
  /**
   * Establecer algoritmo por defecto
   * @param {string} id - ID del algoritmo
   */
  setDefault(id) {
    if (this.has(id)) {
      this.defaultAlgorithm = id;
      console.log(`[AlgorithmRegistry] Algoritmo por defecto: ${id}`);
    } else {
      console.warn(`[AlgorithmRegistry] No se puede establecer "${id}" como default: no existe`);
    }
  }
  
  /**
   * Obtener estadísticas del registro
   * @returns {object}
   */
  getStats() {
    return {
      totalAlgorithms: this.algorithms.size,
      categories: this.categories.size,
      algorithmsByCategory: Object.fromEntries(
        Array.from(this.categories.entries()).map(([cat, ids]) => [cat, ids.length])
      ),
      defaultAlgorithm: this.defaultAlgorithm
    };
  }
  
  /**
   * Validar que un algoritmo tenga todos los métodos requeridos
   * @param {class} AlgorithmClass - Clase a validar
   * @returns {object} - { valid: boolean, missing: array }
   */
  static validateAlgorithmClass(AlgorithmClass) {
    const requiredMethods = ['process'];
    const requiredStaticProps = ['displayName', 'description', 'category'];
    
    const missing = [];
    
    // Verificar métodos de instancia
    const prototype = AlgorithmClass.prototype;
    for (const method of requiredMethods) {
      if (typeof prototype[method] !== 'function') {
        missing.push(`method: ${method}`);
      }
    }
    
    // Verificar propiedades estáticas
    for (const prop of requiredStaticProps) {
      if (!AlgorithmClass[prop]) {
        missing.push(`static property: ${prop}`);
      }
    }
    
    return {
      valid: missing.length === 0,
      missing
    };
  }
  
  /**
   * Registrar múltiples algoritmos a la vez
   * @param {array} algorithms - Array de { id, class, options }
   */
  registerBatch(algorithms) {
    console.log(`[AlgorithmRegistry] Registrando ${algorithms.length} algoritmos...`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const algo of algorithms) {
      try {
        this.register(algo.id, algo.class, algo.options || {});
        successCount++;
      } catch (error) {
        console.error(`[AlgorithmRegistry] Error registrando "${algo.id}":`, error);
        errorCount++;
      }
    }
    
    console.log(`[AlgorithmRegistry] Registro completado: ${successCount} éxito, ${errorCount} errores`);
  }
  
  /**
   * Exportar configuración del registro (útil para debugging)
   * @returns {object}
   */
  export() {
    return {
      algorithms: this.getAll(),
      categories: Array.from(this.categories.entries()),
      defaultAlgorithm: this.defaultAlgorithm,
      stats: this.getStats()
    };
  }
  
  /**
   * Imprimir lista de algoritmos en consola (debugging)
   */
  printList() {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Algoritmos Registrados');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const grouped = this.getAllGroupedByCategory();
    
    for (const [category, algorithms] of Object.entries(grouped)) {
      console.log(`\n📁 ${category.toUpperCase()}`);
      for (const algo of algorithms) {
        console.log(`  • ${algo.displayName} (${algo.id})`);
        console.log(`    ${algo.description.substring(0, 80)}...`);
      }
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Total: ${this.algorithms.size} algoritmos en ${this.categories.size} categorías`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }
}

// Exportar
if (typeof window !== 'undefined') {
  window.AlgorithmRegistry = AlgorithmRegistry;
}