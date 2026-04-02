// ============================================================================
// CONSTANTES Y DATOS ESTÁTICOS — DitherLab v8
// ============================================================================

const KERNELS = {
  'floyd-steinberg': { divisor: 16, points: [{dx:1,dy:0,w:7},{dx:-1,dy:1,w:3},{dx:0,dy:1,w:5},{dx:1,dy:1,w:1}] },
  'atkinson': { divisor: 8, points: [{dx:1,dy:0,w:1},{dx:2,dy:0,w:1},{dx:-1,dy:1,w:1},{dx:0,dy:1,w:1},{dx:1,dy:1,w:1},{dx:0,dy:2,w:1}] },
  'stucki': { divisor: 42, points: [{dx:1,dy:0,w:8},{dx:2,dy:0,w:4},{dx:-2,dy:1,w:2},{dx:-1,dy:1,w:4},{dx:0,dy:1,w:8},{dx:1,dy:1,w:4},{dx:2,dy:1,w:2},{dx:-2,dy:2,w:1},{dx:-1,dy:2,w:2},{dx:0,dy:2,w:4},{dx:1,dy:2,w:2},{dx:2,dy:2,w:1}] },
  'jarvis-judice-ninke': { divisor: 48, points: [{dx:1,dy:0,w:7},{dx:2,dy:0,w:5},{dx:-2,dy:1,w:3},{dx:-1,dy:1,w:5},{dx:0,dy:1,w:7},{dx:1,dy:1,w:5},{dx:2,dy:1,w:3},{dx:-2,dy:2,w:1},{dx:-1,dy:2,w:3},{dx:0,dy:2,w:5},{dx:1,dy:2,w:3},{dx:2,dy:2,w:1}] },
  'sierra': { divisor: 32, points: [{dx:1,dy:0,w:5},{dx:2,dy:0,w:3},{dx:-2,dy:1,w:2},{dx:-1,dy:1,w:4},{dx:0,dy:1,w:5},{dx:1,dy:1,w:4},{dx:2,dy:1,w:2},{dx:-1,dy:2,w:2},{dx:0,dy:2,w:3},{dx:1,dy:2,w:2}] },
  'sierra-lite': { divisor: 4, points: [{dx:1,dy:0,w:2},{dx:-1,dy:1,w:1},{dx:0,dy:1,w:1}] },
  'burkes': { divisor: 32, points: [{dx:1,dy:0,w:8},{dx:2,dy:0,w:4},{dx:-2,dy:1,w:2},{dx:-1,dy:1,w:4},{dx:0,dy:1,w:8},{dx:1,dy:1,w:4},{dx:2,dy:1,w:2}] }
};

const ALGORITHM_INFO = {
  'none': "Muestra el medio original sin procesamiento.",
  'posterize': "Reduce los colores sin tramado. Útil para ver el 'banding' de color puro.",
  'floyd-steinberg': "Difusión de error más popular. Balance entre velocidad y calidad. Distribuye el error a 4 píxeles vecinos.",
  'atkinson': "Difusión parcial desarrollada en Apple. Solo distribuye 6/8 del error, creando alto contraste. Icónico del Mac clásico.",
  'stucki': "Difusión compleja a 12 píxeles. Produce el tramado más suave y de mayor calidad, ideal para gradientes.",
  'jarvis-judice-ninke': "Difusión de error a 12 píxeles. Mayor área de difusión que Floyd-Steinberg, resultados muy suaves.",
  'sierra': "Variante de difusión de error con 10 píxeles. Balance entre Stucki y Floyd-Steinberg.",
  'sierra-lite': "Versión ligera de Sierra con solo 4 píxeles. Muy rápido, ideal para preview.",
  'burkes': "Difusión de error a 7 píxeles. Buenos resultados con fotografías y gradientes.",
  'bayer': "Dithering ordenado con matriz de umbrales fija. Patrón geométrico retro. Extremadamente rápido.",
  'blue-noise': "Dithering ordenado de alta calidad usando ruido azul. Distribución más natural que Bayer.",
  'variable-error': "Algoritmo adaptativo que ajusta la difusión según el contenido local. Preserva bordes y detalles.",
  'threshold': "Umbral simple con control de nivel. El control de Fuerza del Patrón determina el punto de corte (0–100%). Limpio y de alto contraste.",
  'random': "Umbral aleatorio por píxel. Produce textura granular tipo película fotográfica. Fuerza del Patrón controla la intensidad del ruido.",
  'riemersma': "Difusión de error sobre curva de Hilbert. Elimina los artefactos direccionales de los algoritmos raster, distribución orgánica sin dirección privilegiada.",
  'halftone': "Simulación de trama de impresión offset. Dibuja puntos de tamaño variable según la luminosidad local. Fuerza del Patrón controla el tamaño de celda.",
  'crosshatch': "Tramado artístico por líneas cruzadas. Simula grabado o ilustración a pluma. Capas de líneas en distintos ángulos según la oscuridad."
};

const ALGORITHM_NAMES = {
  'none': "Ninguno",
  'posterize': "Posterize",
  'floyd-steinberg': "Floyd-Steinberg",
  'atkinson': "Atkinson",
  'stucki': "Stucki",
  'jarvis-judice-ninke': "Jarvis-Judice-Ninke",
  'sierra': "Sierra",
  'sierra-lite': "Sierra Lite",
  'burkes': "Burkes",
  'bayer': "Bayer",
  'blue-noise': "Blue Noise",
  'variable-error': "Variable Error",
  'threshold': "Threshold",
  'random': "Random",
  'riemersma': "Riemersma",
  'halftone': "Halftone",
  'crosshatch': "Crosshatch"
};
