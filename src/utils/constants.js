// src/utils/constants.js

/**
 * Contiene las matrices de difusión de error para varios algoritmos.
 * Cada kernel define cómo se distribuye el error a los píxeles vecinos.
 */
export const KERNELS = {
  'floyd-steinberg': {
    divisor: 16, 
    points: [
      {dx:1, dy:0, w:7}, {dx:-1, dy:1, w:3},
      {dx:0, dy:1, w:5}, {dx:1, dy:1, w:1}
    ]
  },
  'atkinson': {
    divisor: 8, 
    points: [
      {dx:1, dy:0, w:1}, {dx:2, dy:0, w:1}, {dx:-1, dy:1, w:1},
      {dx:0, dy:1, w:1}, {dx:1, dy:1, w:1}, {dx:0, dy:2, w:1}
    ]
  },
  'stucki': {
    divisor: 42, 
    points: [
      {dx:1, dy:0, w:8}, {dx:2, dy:0, w:4}, {dx:-2, dy:1, w:2}, {dx:-1, dy:1, w:4},
      {dx:0, dy:1, w:8}, {dx:1, dy:1, w:4}, {dx:2, dy:1, w:2}, {dx:-2, dy:2, w:1},
      {dx:-1, dy:2, w:2}, {dx:0, dy:2, w:4}, {dx:1, dy:2, w:2}, {dx:2, dy:2, w:1}
    ]
  },
  'jarvis-judice-ninke': {
    divisor: 48,
    points: [
      {dx:1, dy:0, w:7}, {dx:2, dy:0, w:5}, {dx:-2, dy:1, w:3}, {dx:-1, dy:1, w:5},
      {dx:0, dy:1, w:7}, {dx:1, dy:1, w:5}, {dx:2, dy:1, w:3}, {dx:-2, dy:2, w:1},
      {dx:-1, dy:2, w:3}, {dx:0, dy:2, w:5}, {dx:1, dy:2, w:3}, {dx:2, dy:2, w:1}
    ]
  },
  'sierra': {
    divisor: 32,
    points: [
      {dx:1, dy:0, w:5}, {dx:2, dy:0, w:3}, {dx:-2, dy:1, w:2}, {dx:-1, dy:1, w:4},
      {dx:0, dy:1, w:5}, {dx:1, dy:1, w:4}, {dx:2, dy:1, w:2}, {dx:-1, dy:2, w:2},
      {dx:0, dy:2, w:3}, {dx:1, dy:2, w:2}
    ]
  },
  'sierra-lite': {
    divisor: 4,
    points: [
      {dx:1, dy:0, w:2}, {dx:-1, dy:1, w:1}, {dx:0, dy:1, w:1}
    ]
  },
  'burkes': {
    divisor: 32,
    points: [
      {dx:1, dy:0, w:8}, {dx:2, dy:0, w:4}, {dx:-2, dy:1, w:2},
      {dx:-1, dy:1, w:4}, {dx:0, dy:1, w:8}, {dx:1, dy:1, w:4}, {dx:2, dy:1, w:2}
    ]
  }
};

/**
 * Descripciones textuales para cada algoritmo, mostradas en la UI.
 */
export const ALGORITHM_INFO = {
  'none': "Muestra el medio original sin procesamiento.",
  'posterize': "Reduce los colores sin tramado. Útil para ver el 'banding' de color puro.",
  'floyd-steinberg': 'El algoritmo de difusión de error más popular. Balanceado y de alta calidad.',
  'atkinson': "Crea imágenes con más contraste y brillo. Icónico del Mac clásico.",
  'stucki': "Produce el tramado más suave y de mayor calidad, ideal para gradientes.",
  'bayer': 'Dithering ordenado que produce un patrón geométrico. Muy rápido y de estética retro.',
  'blue-noise': "Dithering ordenado de alta calidad que produce patrones menos perceptibles que Bayer.",
  'variable-error': "Algoritmo adaptativo que preserva mejor los bordes y detalles finos.",
  'jarvis-judice-ninke': "Produce resultados muy suaves con menos artefactos que Floyd-Steinberg.",
  'sierra': "Un buen balance entre Stucki y Floyd-Steinberg en términos de calidad y rendimiento.",
  'sierra-lite': "Versión muy rápida y simple de Sierra, ideal para previews.",
  'burkes': "Equilibrado y con buenos resultados en fotografías y gradientes."
};

/**
 * Nombres de los algoritmos para mostrar en la UI.
 */
export const ALGORITHM_NAMES = {
  'none': "Ninguno", 
  'posterize': "Posterize", 
  'floyd-steinberg': "Floyd-Steinberg", 
  'atkinson': "Atkinson",
  'stucki': "Stucki",
  'bayer': "Bayer",
  'blue-noise': "Blue Noise",
  'variable-error': "Variable Error",
  'jarvis-judice-ninke': "Jarvis-Judice-Ninke",
  'sierra': "Sierra",
  'sierra-lite': "Sierra Lite",
  'burkes': "Burkes"
};
