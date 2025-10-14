import { BaseErrorDiffusionAlgorithm } from './BaseErrorDiffusionAlgorithm.js';
import { KERNELS } from '../../constants/kernels.js';

class Sierra extends BaseErrorDiffusionAlgorithm {
  constructor() {
    super('sierra', 'Sierra', KERNELS['sierra']);
  }
}
export default new Sierra();
