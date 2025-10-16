export function applyBlueNoise(pixels, w, h, config, utils) {
  const { lumaLUT, blueNoiseLUT } = utils;
  const levels = config.colorCount;
  const baseStrength = 255 / levels;
  const ditherStrength = baseStrength * config.patternStrength * 2;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const ditherOffset = blueNoiseLUT.get(x, y) * ditherStrength;
      const luma = pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114;
      const adjustedLuma = Math.min(255, Math.max(0, luma + ditherOffset));
      const [r, g, b] = lumaLUT.map(adjustedLuma);
      pixels[i] = r;
      pixels[i + 1] = g;
      pixels[i + 2] = b;
    }
  }
}