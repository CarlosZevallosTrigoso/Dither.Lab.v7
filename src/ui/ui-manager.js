/**
 * ui-manager.js
 * Orquesta la construcción y actualización de toda la interfaz de usuario.
 */
import { eventBus } from '../event-bus.js';
import { createMediaPanel } from './components/media-panel.js';
import { createTimelinePanel } from './components/timeline.js';
import { createAlgorithmPanel } from './components/algorithm-panel.js';
import { createPalettePanel } from './components/palette-editor.js';
import { createImageAdjustmentsPanel } from './components/adjustments-panel.js';
import { createExportPanel } from './components/export-panel.js';

export function initializeUIManager(sidebarContainer, modalContainer, state, bus) {
  // Crear una instancia de cada componente
  const components = [
    createMediaPanel(state, bus),
    createTimelinePanel(state, bus),
    createAlgorithmPanel(state, bus),
    createPalettePanel(state, bus),
    createImageAdjustmentsPanel(state, bus),
    createExportPanel(state, bus)
  ];

  // Renderizar cada componente en el sidebar
  components.forEach(component => {
    sidebarContainer.appendChild(component.element);
  });

  // Suscribirse a los cambios de estado para actualizar la UI
  bus.subscribe('state:changed', (newState) => {
    components.forEach(component => {
      if (component.update) {
        component.update(newState);
      }
    });
  });

  // Lógica para mostrar toasts (notificaciones)
  bus.subscribe('ui:showToast', (toast) => {
    const toastElement = document.createElement('div');
    toastElement.className = `toast ${toast.type === 'error' ? 'bg-red-600' : 'bg-slate-700'}`;
    toastElement.textContent = toast.message;
    document.body.appendChild(toastElement);
    setTimeout(() => {
        toastElement.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => toastElement.remove(), 300);
    }, toast.duration || 3000);
  });
}