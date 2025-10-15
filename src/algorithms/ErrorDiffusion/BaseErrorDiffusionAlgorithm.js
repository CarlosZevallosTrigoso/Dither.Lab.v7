import { BaseAlgorithm } from '../BaseAlgorithm.js';

export class BaseErrorDiffusionAlgorithm extends BaseAlgorithm {
  constructor(id, name, kernel) {
    super(id, name);
    if (!kernel) {
        throw new Error("Un algoritmo de difusión de error debe tener un kernel.");
    }
    this.kernel = kernel;
  }

  // ==================================================================
  // === INICIO DE LA RECONSTRUCCIÓN BASADA EN LA LÓGICA DE V6     ===
  // ==================================================================
  process(pixels, width, height, config, utils) {
    // Esta nueva lógica implementa fielmente el método que funciona en la v6:
    // calcular y difundir el error para cada canal RGB de forma independiente,
    // pero adaptado para usar una paleta de colores personalizada.

    // --- Lógica para el modo "Aplicar a Color Original" (se mantiene, ya que es correcta) ---
    if (config.useOriginalColor) {
        const r = new Float32Array(width * height);
        const g = new Float32Array(width * height);
        const b = new Float32Array(width * height);

        for (let i = 0; i < pixels.length / 4; i++) {
            r[i] = pixels[i * 4];
            g[i] = pixels[i * 4 + 1];
            b[i] = pixels[i * 4 + 2];
        }

        // 'processChannel' se encarga de la cuantización y difusión para un solo canal.
        this.processChannel(r, width, height, config);
        this.processChannel(g, width, height, config);
        this.processChannel(b, width, height, config);

        for (let i = 0; i < pixels.length / 4; i++) {
            pixels[i * 4] = r[i];
            pixels[i * 4 + 1] = g[i];
            pixels[i * 4 + 2] = b[i];
        }
        return pixels;
    }
    
    // --- Lógica reconstruida para PALETAS DE COLOR (la causa del problema) ---
    
    // 1. Convertir la paleta de HEX a RGB una sola vez para optimizar.
    const paletteRGB = config.colors.map(hex => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return [r, g, b];
    });

    // 2. Función para encontrar el color más cercano en el espacio de color RGB.
    const findClosestColor = (r, g, b) => {
        let closestColor = paletteRGB[0];
        let minDistanceSq = Infinity;

        for (const color of paletteRGB) {
            const dr = r - color[0];
            const dg = g - color[1];
            const db = b - color[2];
            const distanceSq = dr * dr + dg * dg + db * db;
            if (distanceSq < minDistanceSq) {
                minDistanceSq = distanceSq;
                closestColor = color;
            }
        }
        return closestColor;
    };

    const { serpentineScan, diffusionStrength } = config;
    
    // 3. Usar buffers de 32 bits para acumular errores con precisión, evitando el redondeo.
    const tempPixelsR = new Float32Array(pixels.length / 4);
    const tempPixelsG = new Float32Array(pixels.length / 4);
    const tempPixelsB = new Float32Array(pixels.length / 4);
    
    for(let i = 0; i < pixels.length / 4; i++) {
        tempPixelsR[i] = pixels[i * 4];
        tempPixelsG[i] = pixels[i * 4 + 1];
        tempPixelsB[i] = pixels[i * 4 + 2];
    }

    // 4. Bucle principal de dithering.
    for (let y = 0; y < height; y++) {
        const isReversed = serpentineScan && y % 2 === 1;
        const xStart = isReversed ? width - 1 : 0;
        const xEnd = isReversed ? -1 : width;
        const xStep = isReversed ? -1 : 1;

        for (let x = xStart; x !== xEnd; x += xStep) {
            const i = y * width + x;

            const oldR = tempPixelsR[i];
            const oldG = tempPixelsG[i];
            const oldB = tempPixelsB[i];

            // 5. Encontrar el color más cercano de la paleta.
            const [newR, newG, newB] = findClosestColor(oldR, oldG, oldB);

            // 6. Asignar el color de la paleta al píxel final que se mostrará.
            const finalIndex = i * 4;
            pixels[finalIndex] = newR;
            pixels[finalIndex + 1] = newG;
            pixels[finalIndex + 2] = newB;

            // 7. Calcular el error para CADA canal por separado (la "lógica de oro" de la v6).
            const errorR = (oldR - newR) * diffusionStrength;
            const errorG = (oldG - newG) * diffusionStrength;
            const errorB = (oldB - newB) * diffusionStrength;

            // 8. Difundir los tres errores a los píxeles vecinos.
            for (const pt of this.kernel.points) {
                const dx = isReversed ? -pt.dx : pt.dx;
                const nx = x + dx;
                const ny = y + pt.dy;

                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                    const ni = ny * width + nx;
                    const weight = pt.w / this.kernel.divisor;
                    
                    tempPixelsR[ni] += errorR * weight;
                    tempPixelsG[ni] += errorG * weight;
                    tempPixelsB[ni] += errorB * weight;
                }
            }
        }
    }
    
    return pixels;
  }

  // Esta función auxiliar solo es usada por el modo "Aplicar a Color Original"
  processChannel(channel, width, height, config) {
    const { serpentineScan, diffusionStrength, colorCount } = config;
    const levels = Math.max(1, colorCount - 1);

    for (let y = 0; y < height; y++) {
      const isReversed = serpentineScan && y % 2 === 1;
      const xStart = isReversed ? width - 1 : 0;
      const xEnd = isReversed ? -1 : width;
      const xStep = isReversed ? -1 : 1;

      for (let x = xStart; x !== xEnd; x += xStep) {
        const i = y * width + x;
        const oldVal = channel[i];
        const newVal = Math.round(oldVal / 255 * levels) * (255 / levels);
        channel[i] = newVal;
        
        const error = (oldVal - newVal) * diffusionStrength;

        for (const pt of this.kernel.points) {
          const dx = isReversed ? -pt.dx : pt.dx;
          const nx = x + dx;
          const ny = y + pt.dy;

          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const ni = ny * width + nx;
            const weight = pt.w / this.kernel.divisor;
            channel[ni] = Math.min(255, Math.max(0, channel[ni] + error * weight));
          }
        }
      }
    }
  }
  // ==================================================================
  // === FIN DE LA RECONSTRUCCIÓN                                 ===
  // ==================================================================
}
