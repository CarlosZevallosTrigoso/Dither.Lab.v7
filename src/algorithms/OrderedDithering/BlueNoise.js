import { BaseAlgorithm } from '../BaseAlgorithm.js';

class BlueNoise extends BaseAlgorithm {
  constructor() {
    super('blue-noise', 'Blue Noise');
  }

  process(pixels, width, height, config, utils) {
    const { lumaLUT, blueNoiseLUT } = utils;
    const { colorCount, patternStrength } = config;

    const ditherStrength = (255 / colorCount) * patternStrength * 2;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const ditherOffset = blueNoiseLUT.get(x, y) * ditherStrength;
        const luma = pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114;
        const adjustedLuma = Math.min(255, Math.max(0, luma + ditherOffset));
        const [r, g, b] = lumaLUT.map(adjustedLuma);

        pixels[i] = r;
        pixels[i + 1] = g;
        pixels[i + 2] = b;
      }
    }
    return pixels;
  }
}
export default new BlueNoise();
