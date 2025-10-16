/**
 * constants.js
 * Datos estáticos y constantes para la aplicación.
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
      {dx:1, dy:0, w:8}, {dx:2, dy:0, w:4},
      {dx:-2, dy:1, w:2}, {dx:-1, dy:1, w:4}, {dx:0, dy:1, w:8}, {dx:1, dy:1, w:4}, {dx:2, dy:1, w:2},
      {dx:-2, dy:2, w:1}, {dx:-1, dy:2, w:2}, {dx:0, dy:2, w:4}, {dx:1, dy:2, w:2}, {dx:2, dy:2, w:1}
    ]
  },
  'jarvis-judice-ninke': {
    divisor: 48,
    points: [
      {dx:1, dy:0, w:7}, {dx:2, dy:0, w:5},
      {dx:-2, dy:1, w:3}, {dx:-1, dy:1, w:5}, {dx:0, dy:1, w:7}, {dx:1, dy:1, w:5}, {dx:2, dy:1, w:3},
      {dx:-2, dy:2, w:1}, {dx:-1, dy:2, w:3}, {dx:0, dy:2, w:5}, {dx:1, dy:2, w:3}, {dx:2, dy:2, w:1}
    ]
  },
  'sierra': {
    divisor: 32,
    points: [
      {dx:1, dy:0, w:5}, {dx:2, dy:0, w:3},
      {dx:-2, dy:1, w:2}, {dx:-1, dy:1, w:4}, {dx:0, dy:1, w:5}, {dx:1, dy:1, w:4}, {dx:2, dy:1, w:2},
      {dx:-1, dy:2, w:2}, {dx:0, dy:2, w:3}, {dx:1, dy:2, w:2}
    ]
  },
  'sierra-lite': {
    divisor: 4,
    points: [
      {dx:1, dy:0, w:2},
      {dx:-1, dy:1, w:1}, {dx:0, dy:1, w:1}
    ]
  },
  'burkes': {
    divisor: 32,
    points: [
      {dx:1, dy:0, w:8}, {dx:2, dy:0, w:4},
      {dx:-2, dy:1, w:2}, {dx:-1, dy:1, w:4}, {dx:0, dy:1, w:8}, {dx:1, dy:1, w:4}, {dx:2, dy:1, w:2}
    ]
  }
};

export const ALGORITHM_INFO = {
  'none': "Muestra el medio original sin procesamiento, pero con los ajustes de imagen aplicados.",
  'posterize': "Reduce los colores sin tramado. Útil para ver el 'banding' de color puro.",
  'floyd-steinberg': 'El algoritmo de difusión de error más popular. Balance perfecto entre velocidad y calidad.',
  'atkinson': "Crea imágenes con más contraste y brillo. Icónico del Mac clásico.",
  'stucki': "Produce el tramado más suave y de mayor calidad, ideal para gradientes.",
  'bayer': 'Dithering ordenado con un patrón geométrico característico. Extremadamente rápido, estética retro.',
  'blue-noise': "Dithering ordenado de alta calidad que produce patrones menos perceptibles que Bayer.",
  'jarvis-judice-ninke': "Difusión de error que produce resultados muy suaves con menos artefactos.",
  'sierra': "Variante de difusión de error con un buen balance entre calidad y rendimiento.",
  'sierra-lite': "Versión muy rápida de Sierra, ideal para previews o imágenes grandes.",
  'burkes': "Difusión de error equilibrada, con buenos resultados en fotografías y gradientes."
};

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