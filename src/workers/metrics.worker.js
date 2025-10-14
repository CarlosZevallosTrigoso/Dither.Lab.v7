/**
 * @file metrics.worker.js
 * @description (FUTURO) Web Worker para calcular métricas de calidad de imagen en segundo plano.
 * Esto permitirá que la interfaz siga siendo responsiva durante el análisis.
 */

self.onmessage = (event) => {
  const { originalPixels, processedPixels } = event.data;

  // --- Lógica del Worker (a implementar en el futuro) ---
  // 1. Importar o definir las funciones de cálculo (PSNR, SSIM, etc.).
  // 2. Ejecutar los cálculos con los datos de píxeles proporcionados.
  // 3. Devolver los resultados al hilo principal.

  console.log('Metrics Worker ha recibido una tarea (funcionalidad futura).');

  // Por ahora, devolvemos resultados de marcador de posición.
  const results = {
    psnr: Infinity,
    ssim: 1,
    compression: { unique: 0, ratio: 100 },
  };
  
  self.postMessage({ metricsResults: results });
};
