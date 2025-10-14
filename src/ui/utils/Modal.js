/**
 * @file Modal.js
 * @description Clase genérica para gestionar ventanas modales.
 */

export class Modal {
  /**
   * @param {string} modalId - El ID del elemento modal en el DOM.
   */
  constructor(modalId) {
    this.modal = document.getElementById(modalId);
    if (!this.modal) {
      console.error(`Elemento modal no encontrado con ID: ${modalId}`);
      return;
    }
    this.init();
  }

  init() {
    const closeButtons = this.modal.querySelectorAll('[data-close-modal]');
    closeButtons.forEach(btn => btn.addEventListener('click', () => this.close()));

    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.close();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen()) {
        this.close();
      }
    });
  }
  
  /**
   * Vincula un botón para abrir este modal.
   * @param {string} buttonId 
   */
  bindOpenButton(buttonId) {
    const openButton = document.getElementById(buttonId);
    if (openButton) {
        openButton.addEventListener('click', () => this.open());
    } else {
        console.error(`Botón de apertura no encontrado con ID: ${buttonId}`);
    }
  }

  open() {
    this.modal.style.display = 'flex';
  }

  close() {
    this.modal.style.display = 'none';
  }

  isOpen() {
    return this.modal.style.display === 'flex';
  }
}
