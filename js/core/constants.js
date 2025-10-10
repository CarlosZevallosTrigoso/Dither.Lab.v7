/**
 * ============================================================================
 * DitherLab v7 - Constantes y Datos Estáticos
 * ============================================================================
 * - Almacena datos inmutables que la aplicación necesita, como las matrices
 * de difusión de error (kernels) y las descripciones de los algoritmos.
 * - Separar estos datos de la lógica hace que el código sea más limpio y
 * fácil de actualizar.
 * ============================================================================
 */

// Define las matrices de difusión de error para varios algoritmos.
// dx, dy: desplazamiento relativo del píxel vecino.
// w: peso del error a distribuir.
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
  'two-row-sierra': {
    divisor: 16,
    points: [
        { dx: 1, dy: 0, w: 4 }, { dx: 2, dy: 0, w: 3 },
        { dx: -2, dy: 1, w: 1 }, { dx: -1, dy: 1, w: 2 }, { dx: 0, dy: 1, w: 3 }, { dx: 1, dy: 1, w: 2 }, { dx: 2, dy: 1, w: 1 }
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

// Textos descriptivos para cada algoritmo que se mostrarán en la UI.
export const ALGORITHM_INFO = {
  'none': "Muestra el medio original sin procesamiento.",
  'posterize': "Reduce los colores sin tramado. Útil para ver el 'banding' de color puro.",
  'floyd-steinberg': 'Algoritmo de difusión de error más popular. Balance perfecto entre velocidad y calidad. Distribuye el error a 4 píxeles vecinos.',
  'atkinson': "Difusión parcial desarrollada en Apple. Solo distribuye 6/8 del error, creando imágenes con más contraste y brillo. Icónico del Mac clásico.",
  'stucki': "Difusión compleja a 12 píxeles vecinos. Produce el tramado más suave y de mayor calidad, ideal para gradientes.",
  'bayer': 'Dithering ordenado con matriz de umbrales fija. Produce un patrón geométrico característico. Extremadamente rápido, estética retro.',
  'blue-noise': "Dithering ordenado de alta calidad usando ruido azul. Produce patrones menos perceptibles que Bayer, más agradable visualmente.",
  'variable-error': "Algoritmo adaptativo que ajusta la difusión según el contenido local. Preserva mejor los bordes y detalles finos.",
  'jarvis-judice-ninke': "Difusión de error a 12 píxeles. Mayor área de difusión que Floyd-Steinberg, produce resultados muy suaves con menos artefactos.",
  'sierra': "Variante de difusión de error con 10 píxeles. Balance entre Stucki y Floyd-Steinberg. Buena calidad con rendimiento aceptable.",
  'two-row-sierra': "Versión optimizada de Sierra que solo difunde a 7 píxeles en dos filas. Ofrece una excelente calidad visual con un rendimiento mejorado.",
  'sierra-lite': "Versión ligera de Sierra con solo 4 píxeles. Muy rápido, ideal para preview o imágenes grandes. Similar a Floyd-Steinberg pero más simple.",
  'burkes': "Difusión de error a 7 píxeles. Distribución equilibrada similar a Sierra. Buenos resultados con fotografías y gradientes.",
  'ostromoukhov': "Difusión de error modulada con ruido azul. Varía la distribución del error para romper los patrones repetitivos, logrando un acabado muy orgánico.",
  'riemersma': "Procesa los píxeles siguiendo una curva de Hilbert. El error se acumula y pasa de un píxel al siguiente en la curva, creando texturas únicas.",
  'halftone-dither': 'Simula la técnica de impresión de semitonos usando puntos de tamaño variable para representar tonos. Ideal para un look de cómic o periódico.',
};

// Nombres para mostrar en los menús desplegables.
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
  'two-row-sierra': "Two-Row Sierra",
  'sierra-lite': "Sierra Lite",
  'burkes': "Burkes",
  'ostromoukhov': "Ostromoukhov",
  'riemersma': "Riemersma (Hilbert Curve)",
  'halftone-dither': "Halftone Dither",
};
