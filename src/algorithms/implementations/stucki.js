import { KERNELS } from '../../utils/constants.js';
import { applyErrorDiffusion } from './diffusion-helpers.js';

export function applyStucki(pixels, w, h, config, utils) {
  applyErrorDiffusion(pixels, w, h, config, utils, KERNELS['stucki']);
}