import { BaseAlgorithm } from '../BaseAlgorithm.js';
import { KERNELS } from '../../constants/kernels.js';

class Burkes extends BaseAlgorithm {
  constructor() {
    super('burkes', 'Burkes');
    this.kernel = KERNELS['burkes'];
  }

  process(pixels, width, height, config, utils) {
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
    return pixels;
  }
}
export default new Burkes();
