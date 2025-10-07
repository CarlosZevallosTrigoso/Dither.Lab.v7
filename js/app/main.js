/**
 * ============================================================================
 * DitherLab v7 - Punto de Entrada Principal (main.js)
 * ============================================================================
 * - Este es el archivo que orquesta el inicio de toda la aplicación.
 * - Su única responsabilidad es importar e inicializar todos los módulos
 * en el orden correcto.
 * ============================================================================
 */
import { sketch } from '../core/renderer.js';
import { initializeFileHandler } from '../modules/fileHandler.js';
import { initializeUI } from '../modules/ui.js';
import { initializeTimeline } from '../modules/timeline.js';
import { initializeExporter } from '../modules/exporter.js';
import { initializePresets } from '../modules/presets.js';
import { initializeKeyboardShortcuts } from '../modules/keyboard.js';
import { initializeCurvesEditor } from '../modules/curvesEditor.js';

// Esperamos a que el DOM esté completamente cargado para empezar.
document.addEventListener('DOMContentLoaded', () => {
  console.log('DitherLab v7 inicializando...');

  // Creamos la instancia de p5.js. Esta instancia se pasará a los
  // módulos que la necesiten para interactuar con p5 (ej: fileHandler).
  // La función 'sketch' contiene el setup y draw.
  const p5Instance = new p5(sketch);

  // Inicializamos todos los módulos de la aplicación.
  // El orden puede ser importante si unos dependen de otros.
  initializeUI();
  initializeCurvesEditor();
  initializeFileHandler(p5Instance); // El file handler necesita p5 para crear videos/imágenes.
  initializeTimeline();
  initializeExporter(p5Instance); // El exportador necesita p5 para acceder al canvas.
  initializePresets();
  initializeKeyboardShortcuts();

  console.log('Todos los módulos han sido inicializados. DitherLab listo.');
});