import { BaseErrorDiffusionAlgorithm } from './BaseErrorDiffusionAlgorithm.js';
import { KERNELS } from '../../constants/kernels.js';

class JarvisJudiceNinke extends BaseErrorDiffusionAlgorithm {
  constructor() {
    super('jarvis-judice-ninke', 'Jarvis-Judice-Ninke', KERNELS['jarvis-judice-ninke']);
  }
}
export default new JarvisJudiceNinke();
