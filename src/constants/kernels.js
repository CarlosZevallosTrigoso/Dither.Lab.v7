/**
 * @file kernels.js
 * @description Define las matrices de difusión de error (kernels) para varios algoritmos.
 * Cada kernel define cómo se distribuye el error a los píxeles vecinos.
 */

export const KERNELS = {
  'floyd-steinberg': {
    divisor: 16,
    points: [
      { dx: 1, dy: 0, w: 7 },
      { dx: -1, dy: 1, w: 3 },
      { dx: 0, dy: 1, w: 5 },
      { dx: 1, dy: 1, w: 1 }
    ]
  },
  'atkinson': {
    divisor: 8,
    points: [
      { dx: 1, dy: 0, w: 1 }, { dx: 2, dy: 0, w: 1 },
      { dx: -1, dy: 1, w: 1 }, { dx: 0, dy: 1, w: 1 }, { dx: 1, dy: 1, w: 1 },
      { dx: 0, dy: 2, w: 1 }
    ]
  },
  'stucki': {
    divisor: 42,
    points: [
      { dx: 1, dy: 0, w: 8 }, { dx: 2, dy: 0, w: 4 },
      { dx: -2, dy: 1, w: 2 }, { dx: -1, dy: 1, w: 4 }, { dx: 0, dy: 1, w: 8 }, { dx: 1, dy: 1, w: 4 }, { dx: 2, dy: 1, w: 2 },
      { dx: -2, dy: 2, w: 1 }, { dx: -1, dy: 2, w: 2 }, { dx: 0, dy: 2, w: 4 }, { dx: 1, dy: 2, w: 2 }, { dx: 2, dy: 2, w: 1 }
    ]
  },
  'jarvis-judice-ninke': {
    divisor: 48,
    points: [
      { dx: 1, dy: 0, w: 7 }, { dx: 2, dy: 0, w: 5 },
      { dx: -2, dy: 1, w: 3 }, { dx: -1, dy: 1, w: 5 }, { dx: 0, dy: 1, w: 7 }, { dx: 1, dy: 1, w: 5 }, { dx: 2, dy: 1, w: 3 },
      { dx: -2, dy: 2, w: 1 }, { dx: -1, dy: 2, w: 3 }, { dx: 0, dy: 2, w: 5 }, { dx: 1, dy: 2, w: 3 }, { dx: 2, dy: 2, w: 1 }
    ]
  },
  'sierra': {
    divisor: 32,
    points: [
      { dx: 1, dy: 0, w: 5 }, { dx: 2, dy: 0, w: 3 },
      { dx: -2, dy: 1, w: 2 }, { dx: -1, dy: 1, w: 4 }, { dx: 0, dy: 1, w: 5 }, { dx: 1, dy: 1, w: 4 }, { dx: 2, dy: 1, w: 2 },
      { dx: -1, dy: 2, w: 2 }, { dx: 0, dy: 2, w: 3 }, { dx: 1, dy: 2, w: 2 }
    ]
  },
  'sierra-lite': {
    divisor: 4,
    points: [
      { dx: 1, dy: 0, w: 2 },
      { dx: -1, dy: 1, w: 1 }, { dx: 0, dy: 1, w: 1 }
    ]
  },
  'burkes': {
    divisor: 32,
    points: [
      { dx: 1, dy: 0, w: 8 }, { dx: 2, dy: 0, w: 4 },
      { dx: -2, dy: 1, w: 2 }, { dx: -1, dy: 1, w: 4 }, { dx: 0, dy: 1, w: 8 }, { dx: 1, dy: 1, w: 4 }, { dx: 2, dy: 1, w: 2 }
    ]
  }
};
