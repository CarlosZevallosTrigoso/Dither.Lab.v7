/**
 * @file Toast.js
 * @description Gestiona la creación y visualización de notificaciones "toast".
 */

export class Toast {
  /**
   * Muestra una notificación toast.
   * @param {string} message - El mensaje a mostrar.
   * @param {number} [duration=3000] - La duración en milisegundos.
   */
  show(message, duration = 3000) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    // Animación de entrada. Usaremos el CSS existente.
    // La clase 'toast' ya tiene una animación de entrada 'slideIn' en styles.css
    
    setTimeout(() => {
      // Para la salida, invertimos la animación
      toast.style.animation = 'slideIn 0.3s ease-out reverse';
      // Eliminar del DOM después de la animación de salida
      toast.addEventListener('animationend', () => {
        toast.remove();
      }, { once: true });
    }, duration);
  }
}

export const toast = new Toast();
