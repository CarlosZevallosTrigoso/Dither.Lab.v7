import { BaseErrorDiffusionAlgorithm } from './BaseErrorDiffusionAlgorithm.js';
import { KERNELS } from '../../constants/kernels.js';

class Atkinson extends BaseErrorDiffusionAlgorithm {
  constructor() {
    super('atkinson', 'Atkinson', KERNELS['atkinson']);
  }
}
export default new Atkinson();
