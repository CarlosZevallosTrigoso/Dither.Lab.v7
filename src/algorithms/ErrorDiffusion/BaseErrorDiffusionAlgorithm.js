import { BaseAlgorithm } from '../BaseAlgorithm.js';

export class BaseErrorDiffusionAlgorithm extends BaseAlgorithm {
  constructor(id, name, kernel) {
    super(id, name);
    if (!kernel) {
        throw new Error("Un algoritmo de difusión de error debe tener un kernel.");
    }
    this.kernel = kernel;
  }

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

  process(pixels, width, height, config, utils) {
    // ==================================================================
    // === INICIO DE LA SECCIÓN MODIFICADA                          ===
    // ==================================================================

    // ---- MODO 1: Dithering a color completo (Esta lógica es correcta y se mantiene) ----
    if (config.useOriginalColor) {
      const r = new Float32Array(width * height);
      const g = new Float32Array(width * height);
      const b = new Float32Array(width * height);

      for (let i = 0; i < pixels.length / 4; i++) {
        r[i] = pixels[i * 4];
        g[i] = pixels[i * 4 + 1];
        b[i] = pixels[i * 4 + 2];
      }

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

    // ---- MODO 2: Dithering con Paleta de Color (LÓGICA ANTERIOR ELIMINADA Y RECONSTRUIDA) ----
    
    // El bloque 'else' anterior se eliminó por completo. La nueva implementación sigue.
    
    // Caché para no convertir los colores hexadecimales de la paleta en cada píxel (optimización)
    const paletteRGB = config.colors.map(hex => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return [r, g, b];
    });

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
    
    // Usamos buffers de 32 bits para precisión al difundir el error
    const tempPixelsR = new Float32Array(pixels.length / 4);
    const tempPixelsG = new Float32Array(pixels.length / 4);
    const tempPixelsB = new Float32Array(pixels.length / 4);
    
    for(let i = 0; i < pixels.length / 4; i++) {
        tempPixelsR[i] = pixels[i * 4];
        tempPixelsG[i] = pixels[i * 4 + 1];
        tempPixelsB[i] = pixels[i * 4 + 2];
    }

    for (let y = 0; y < height; y++) {
        const isReversed = serpentineScan && y % 2 === 1;
        const xStart = isReversed ? width - 1 : 0;
        const xEnd = isReversed ? -1 : width;
        const xStep = isReversed ? -1 : 1;

        for (let x = xStart; x !== xEnd; x += xStep) {
            const i = y * width + x;

            // 1. Obtener el color original (con el error ya difundido de píxeles anteriores)
            const oldR = tempPixelsR[i];
            const oldG = tempPixelsG[i];
            const oldB = tempPixelsB[i];

            // 2. Encontrar el color más cercano en la paleta (en el espacio de color RGB, no luma)
            const [newR, newG, newB] = findClosestColor(oldR, oldG, oldB);

            // 3. Escribir el nuevo color de la paleta en el buffer final de píxeles
            const finalIndex = i * 4;
            pixels[finalIndex] = newR;
            pixels[finalIndex + 1] = newG;
            pixels[finalIndex + 2] = newB;

            // 4. Calcular el error para CADA canal por separado
            const errorR = (oldR - newR) * diffusionStrength;
            const errorG = (oldG - newG) * diffusionStrength;
            const errorB = (oldB - newB) * diffusionStrength;

            // 5. Difundir los tres errores de canal a los píxeles vecinos
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
    
    // ==================================================================
    // === FIN DE LA SECCIÓN MODIFICADA                             ===
    // ==================================================================
  }
}
