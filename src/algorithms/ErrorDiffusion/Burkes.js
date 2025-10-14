import { BaseErrorDiffusionAlgorithm } from './BaseErrorDiffusionAlgorithm.js';
import { KERNELS } from '../../constants/kernels.js';

class Burkes extends BaseErrorDiffusionAlgorithm {
  constructor() {
    super('burkes', 'Burkes', KERNELS['burkes']);
  }
}
export default new Burkes();
