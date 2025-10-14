/**
 * @file algorithms.js
 * @description Constantes con metadatos para cada algoritmo de dithering.
 */

export const ALGORITHMS = {
  'none': {
    name: "Ninguno",
    description: "Muestra el medio original sin procesamiento."
  },
  'posterize': {
    name: "Posterize",
    description: "Reduce los colores sin tramado. Útil para ver el 'banding' de color puro."
  },
  'floyd-steinberg': {
    name: "Floyd-Steinberg",
    description: 'Algoritmo de difusión de error más popular. Balance perfecto entre velocidad y calidad.'
  },
  'atkinson': {
    name: "Atkinson",
    description: "Crea imágenes con más contraste y brillo. Icónico del Mac clásico."
  },
  'stucki': {
    name: "Stucki",
    description: "Produce el tramado más suave y de mayor calidad, ideal para gradientes."
  },
  'jarvis-judice-ninke': {
    name: "Jarvis-Judice-Ninke",
    description: "Difusión de error extendida que produce resultados muy suaves con menos artefactos."
  },
  'sierra': {
    name: "Sierra",
    description: "Variante de difusión de error con buena calidad y rendimiento aceptable."
  },
  'sierra-lite': {
    name: "Sierra Lite",
    description: "Versión muy rápida de Sierra, ideal para previews o imágenes grandes."
  },
  'burkes': {
    name: "Burkes",
    description: "Difusión de error equilibrada, con buenos resultados en fotografías."
  },
  'bayer': {
    name: "Bayer",
    description: 'Dithering ordenado extremadamente rápido con un patrón geométrico característico.'
  },
  'blue-noise': {
    name: "Blue Noise",
    description: "Dithering ordenado de alta calidad con una distribución de ruido más natural que Bayer."
  },
  'variable-error': {
    name: "Variable Error",
    description: "Algoritmo adaptativo que ajusta la difusión para preservar mejor los bordes y detalles."
  }
};
