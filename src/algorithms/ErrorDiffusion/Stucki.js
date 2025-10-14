import { BaseErrorDiffusionAlgorithm } from './BaseErrorDiffusionAlgorithm.js';
import { KERNELS } from '../../constants/kernels.js';

class Stucki extends BaseErrorDiffusionAlgorithm {
  constructor() {
    super('stucki', 'Stucki', KERNELS['stucki']);
  }
}
export default new Stucki();
