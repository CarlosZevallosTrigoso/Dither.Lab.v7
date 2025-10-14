/**
 * @file dither.worker.js
 * @description (FUTURO) Web Worker para procesar algoritmos de dithering en segundo plano.
 * Esto evitará que la interfaz de usuario se bloquee al procesar medios de gran tamaño.
 * La arquitectura actual está diseñada para integrar este worker en el futuro.
 */

self.onmessage = (event) => {
  const { imageData, config } = event.data;

  // --- Lógica del Worker (a implementar en el futuro) ---
  // 1. Importar o definir la función del algoritmo de dithering.
  // 2. Ejecutar el algoritmo sobre los datos de 'imageData'.
  // 3. Devolver los píxeles procesados al hilo principal.
  
  console.log('Dither Worker ha recibido una tarea (funcionalidad futura).');

  // Por ahora, simplemente devolvemos los datos originales.
  self.postMessage({ processedImageData: imageData }, [imageData.data.buffer]);
};
