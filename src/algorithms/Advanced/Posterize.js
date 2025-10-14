import { BaseAlgorithm } from '../BaseAlgorithm.js';

class Posterize extends BaseAlgorithm {
    constructor() {
        super('posterize', 'Posterize');
    }

    process(pixels, width, height, config, utils) {
        const { lumaLUT } = utils;

        for (let i = 0; i < pixels.length; i += 4) {
            const luma = pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114;
            const [r, g, b] = lumaLUT.map(luma);
            pixels[i] = r;
            pixels[i + 1] = g;
            pixels[i + 2] = b;
        }
        return pixels;
    }
}
export default new Posterize();
