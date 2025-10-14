import { BaseAlgorithm } from '../BaseAlgorithm.js';
import { KERNELS } from '../../constants/kernels.js';

class VariableError extends BaseAlgorithm {
  constructor() {
    super('variable-error', 'Variable Error');
    this.kernel = KERNELS['floyd-steinberg']; // Usa un kernel base
  }

  process(pixels, width, height, config, utils) {
    const { lumaLUT } = utils;
    const { diffusionStrength } = config;

    // 1. Calcular gradientes para detectar bordes
    const gradients = new Float32Array(width * height);
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const i = (y * width + x) * 4;
        const gx = Math.abs(pixels[i + 4] - pixels[i - 4]);
        const gy = Math.abs(pixels[i + width * 4] - pixels[i - width * 4]);
        gradients[y * width + x] = Math.sqrt(gx * gx + gy * gy) / 255;
      }
    }

    // 2. Aplicar difusión de error con fuerza adaptativa
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const gradient = gradients[y * width + x] || 0;
        const adaptiveStrength = diffusionStrength * (1 - gradient * 0.75); // Menos difusión en los bordes

        const oldLuma = pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114;
        const [r, g, b] = lumaLUT.map(oldLuma);
        const newLuma = r * 0.299 + g * 0.587 + b * 0.114;

        pixels[i] = r;
        pixels[i + 1] = g;
        pixels[i + 2] = b;

        const error = (oldLuma - newLuma) * adaptiveStrength;

        for (const pt of this.kernel.points) {
            const nx = x + pt.dx;
            const ny = y + pt.dy;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                const ni = (ny * width + nx) * 4;
                const weight = pt.w / this.kernel.divisor;
                const adjustment = error * weight;
                pixels[ni] = Math.min(255, Math.max(0, pixels[ni] + adjustment));
                pixels[ni + 1] = Math.min(255, Math.max(0, pixels[ni + 1] + adjustment));
                pixels[ni + 2] = Math.min(255, Math.max(0, pixels[ni + 2] + adjustment));
            }
        }
      }
    }
    return pixels;
  }
}
export default new VariableError();
