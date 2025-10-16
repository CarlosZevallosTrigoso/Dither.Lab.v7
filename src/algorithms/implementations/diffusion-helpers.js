/**
 * diffusion-helpers.js
 * Contiene la lógica compartida para todos los algoritmos de difusión de error.
 */
export function applyErrorDiffusion(pixels, w, h, config, utils, kernel) {
  const { lumaLUT } = utils;
  const { serpentineScan, diffusionStrength, colorCount } = config;
  const levels = colorCount > 1 ? colorCount - 1 : 1;
  const step = 255 / levels;

  for (let y = 0; y < h; y++) {
    const isReversed = serpentineScan && y % 2 === 1;
    const xStart = isReversed ? w - 1 : 0;
    const xEnd = isReversed ? -1 : w;
    const xStep = isReversed ? -1 : 1;

    for (let x = xStart; x !== xEnd; x += xStep) {
      const i = (y * w + x) * 4;
      const oldLuma = pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114;
      
      const newLuma = Math.round(oldLuma / step) * step;
      const [r, g, b] = lumaLUT.map(newLuma);
      
      pixels[i] = r;
      pixels[i + 1] = g;
      pixels[i + 2] = b;

      const error = (oldLuma - newLuma) * diffusionStrength;
      
      for (const pt of kernel.points) {
        const dx = isReversed ? -pt.dx : pt.dx;
        const nx = x + dx;
        const ny = y + pt.dy;
        
        if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
          const ni = (ny * w + nx) * 4;
          const weight = pt.w / kernel.divisor;
          const adjustment = error * weight;
          pixels[ni]     = Math.min(255, Math.max(0, pixels[ni]     + adjustment));
          pixels[ni + 1] = Math.min(255, Math.max(0, pixels[ni + 1] + adjustment));
          pixels[ni + 2] = Math.min(255, Math.max(0, pixels[ni + 2] + adjustment));
        }
      }
    }
  }
}