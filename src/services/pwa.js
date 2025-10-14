// src/services/pwa.js

import { showToast } from '../utils/helpers.js';

/**
 * Inicializa la funcionalidad de Progressive Web App (PWA).
 * Registra el Service Worker y los listeners de conectividad.
 */
export function initializePWA() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => {
          console.log('Service Worker registrado con éxito:', reg);
          document.getElementById('pwaBadge').style.display = 'inline-block';
        })
        .catch(err => console.error('Fallo en el registro del Service Worker:', err));
    });
  }

  // Detectar cambios de conectividad
  const pwaBadge = document.getElementById('pwaBadge');
  window.addEventListener('online', () => {
    showToast('Conexión restaurada');
    if(pwaBadge) pwaBadge.textContent = 'PWA';
  });

  window.addEventListener('offline', () => {
    showToast('Estás en modo offline');
    if(pwaBadge) pwaBadge.textContent = 'OFFLINE';
  });
}
