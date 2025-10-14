import { BaseAlgorithm } from '../BaseAlgorithm.js';
import { KERNELS } from '../../constants/kernels.js';

class FloydSteinberg extends BaseAlgorithm {
  constructor() {
    super('floyd-steinberg', 'Floyd-Steinberg');
    this.kernel = KERNELS['floyd-steinberg'];
  }

  /**
   * (NUEVO) Procesa un único canal de color (R, G, o B).
   */
  processChannel(channel, width, height, config) {
    const { serpentineScan, diffusionStrength, colorCount } = config;
    const levels = colorCount - 1;

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
            channel[ni] = Math.min(255, Math.max(0, channel[ni] + error * (pt.w / this.kernel.divisor)));
          }
        }
      }
    }
  }

  process(pixels, width, height, config, utils) {
    const { useOriginalColor } = config;

    if (useOriginalColor) {
      // (NUEVO) Lógica para procesar cada canal de color por separado.
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
    } else {
      // Lógica original basada en luminancia y paleta.
      const { lumaLUT } = utils;
      const { serpentineScan, diffusionStrength } = config;

      for (let y = 0; y < height; y++) {
        const isReversed = serpentineScan && y % 2 === 1;
        const xStart = isReversed ? width - 1 : 0;
        const xEnd = isReversed ? -1 : width;
        const xStep = isReversed ? -1 : 1;

        for (let x = xStart; x !== xEnd; x += xStep) {
          const i = (y * width + x) * 4;
          const oldLuma = pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114;
          const [r, g, b] = lumaLUT.map(oldLuma);
          const newLuma = r * 0.299 + g * 0.587 + b * 0.114;

          pixels[i] = r;
          pixels[i + 1] = g;
          pixels[i + 2] = b;

          const error = (oldLuma - newLuma) * diffusionStrength;

          for (const pt of this.kernel.points) {
            const dx = isReversed ? -pt.dx : pt.dx;
            const nx = x + dx;
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
    }
    return pixels;
  }
}
export default new FloydSteinberg();
