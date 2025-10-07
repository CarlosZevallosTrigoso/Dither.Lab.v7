/**
 * ============================================================================
 * DitherLab v7 - Lógica de PWA
 * ============================================================================
 * - Se encarga de registrar el Service Worker para habilitar las
 * capacidades offline de la aplicación.
 * - Podría incluir lógica adicional para manejar la instalación o
 * notificaciones push en el futuro.
 * ============================================================================
 */

export function initializePWA() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then(registration => {
                    console.log('Service Worker registrado con éxito:', registration);
                })
                .catch(error => {
                    console.error('Fallo en el registro del Service Worker:', error);
                });
        });

        // Opcional: Escuchar cambios de conectividad para informar al usuario
        window.addEventListener('online', () => {
            // Se podría emitir un evento o mostrar un toast
            console.log('La aplicación está online.');
        });

        window.addEventListener('offline', () => {
            console.log('La aplicación está offline. Usando caché.');
        });

    } else {
        console.warn('Service Worker no es soportado en este navegador.');
    }
}

// Para que funcione, llamamos a la inicialización.
initializePWA();