import { BaseAlgorithm } from '../BaseAlgorithm.js';
import { KERNELS } from '../../constants/kernels.js';

class VariableError extends BaseAlgorithm {
  constructor() {
    super('variable-error', 'Variable Error');
    this.kernel = KERNELS['floyd-steinberg']; // Usa un kernel base
  }

  process(pixels, width, height, config, utils) {
    // ==================================================================
    // === INICIO DE LA SECCIÓN MODIFICADA                          ===
    // ==================================================================
    const { diffusionStrength } = config;

    // 1. Calcular gradientes para detectar bordes (se mantiene, es la clave de este algoritmo)
    // Se realiza sobre la imagen original antes de cualquier modificación.
    const gradients = new Float32Array(width * height);
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const i = (y * width + x) * 4;
        const lumaCenter = pixels[i] * 0.299 + pixels[i+1] * 0.587 + pixels[i+2] * 0.114;
        const lumaRight = pixels[i + 4] * 0.299 + pixels[i+5] * 0.587 + pixels[i+6] * 0.114;
        const lumaDown = pixels[i + width * 4] * 0.299 + pixels[i+width*4+1] * 0.587 + pixels[i+width*4+2] * 0.114;
        
        const gx = Math.abs(lumaRight - lumaCenter);
        const gy = Math.abs(lumaDown - lumaCenter);
        gradients[y * width + x] = Math.sqrt(gx * gx + gy * gy) / 255;
      }
    }

    // 2. Aplicar difusión de error con fuerza adaptativa usando la lógica RGB correcta
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
    
    const tempPixelsR = new Float32Array(pixels.length / 4);
    const tempPixelsG = new Float32Array(pixels.length / 4);
    const tempPixelsB = new Float32Array(pixels.length / 4);
    
    for(let i = 0; i < pixels.length / 4; i++) {
        tempPixelsR[i] = pixels[i * 4];
        tempPixelsG[i] = pixels[i * 4 + 1];
        tempPixelsB[i] = pixels[i * 4 + 2];
    }
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        
        // La fuerza de difusión se adapta según el gradiente del borde
        const gradient = gradients[i] || 0;
        const adaptiveStrength = diffusionStrength * (1 - gradient * 0.75); // Menos difusión en los bordes

        const oldR = tempPixelsR[i];
        const oldG = tempPixelsG[i];
        const oldB = tempPixelsB[i];

        const [newR, newG, newB] = findClosestColor(oldR, oldG, oldB);

        const finalIndex = i * 4;
        pixels[finalIndex] = newR;
        pixels[finalIndex + 1] = newG;
        pixels[finalIndex + 2] = newB;

        const errorR = (oldR - newR) * adaptiveStrength;
        const errorG = (oldG - newG) * adaptiveStrength;
        const errorB = (oldB - newB) * adaptiveStrength;

        for (const pt of this.kernel.points) {
            const nx = x + pt.dx;
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
export default new VariableError();
