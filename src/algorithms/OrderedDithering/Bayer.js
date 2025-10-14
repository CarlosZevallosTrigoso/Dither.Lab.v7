import { BaseAlgorithm } from '../BaseAlgorithm.js';

class Bayer extends BaseAlgorithm {
  constructor() {
    super('bayer', 'Bayer');
  }

  process(pixels, width, height, config, utils) {
    const { lumaLUT, bayerLUT } = utils;
    const { colorCount, patternStrength, useOriginalColor } = config;

    const ditherStrength = (255 / (colorCount -1)) * patternStrength * 2;
    const levels = Math.max(1, colorCount - 1);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const ditherOffset = bayerLUT.get(x, y) * ditherStrength;

        if (useOriginalColor) {
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];

          pixels[i] = Math.round((Math.min(255, Math.max(0, r + ditherOffset))) / 255 * levels) * (255 / levels);
          pixels[i+1] = Math.round((Math.min(255, Math.max(0, g + ditherOffset))) / 255 * levels) * (255 / levels);
          pixels[i+2] = Math.round((Math.min(255, Math.max(0, b + ditherOffset))) / 255 * levels) * (255 / levels);

        } else {
          const luma = pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114;
          const adjustedLuma = Math.min(255, Math.max(0, luma + ditherOffset));
          const [r, g, b] = lumaLUT.map(adjustedLuma);

          pixels[i] = r;
          pixels[i + 1] = g;
          pixels[i + 2] = b;
        }
      }
    }
    return pixels;
  }
}
export default new Bayer();
