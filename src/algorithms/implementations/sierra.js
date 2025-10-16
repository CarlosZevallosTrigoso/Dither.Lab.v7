import { KERNELS } from '../../utils/constants.js';
import { applyErrorDiffusion } from './diffusion-helpers.js';

export function applySierra(pixels, w, h, config, utils) {
  applyErrorDiffusion(pixels, w, h, config, utils, KERNELS['sierra']);
}