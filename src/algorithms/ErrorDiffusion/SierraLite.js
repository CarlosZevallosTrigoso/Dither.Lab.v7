import { BaseErrorDiffusionAlgorithm } from './BaseErrorDiffusionAlgorithm.js';
import { KERNELS } from '../../constants/kernels.js';

class SierraLite extends BaseErrorDiffusionAlgorithm {
  constructor() {
    super('sierra-lite', 'Sierra Lite', KERNELS['sierra-lite']);
  }
}
export default new SierraLite();
