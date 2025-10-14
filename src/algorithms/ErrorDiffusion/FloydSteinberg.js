import { BaseErrorDiffusionAlgorithm } from './BaseErrorDiffusionAlgorithm.js';
import { KERNELS } from '../../constants/kernels.js';

class FloydSteinberg extends BaseErrorDiffusionAlgorithm {
  constructor() {
    super('floyd-steinberg', 'Floyd-Steinberg', KERNELS['floyd-steinberg']);
  }
}
export default new FloydSteinberg();
