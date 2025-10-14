/**
 * @file CurveProcessor.js
 * @description Genera LUTs a partir de las curvas de color y las aplica a un buffer de píxeles.
 */

class CurveProcessor {
  constructor() {
    this.luts = {
      rgb: this.createIdentityLUT(),
      r: this.createIdentityLUT(),
      g: this.createIdentityLUT(),
      b: this.createIdentityLUT(),
    };
    this.cachedCurves = null;
  }

  /**
   * Crea una LUT de identidad (sin cambios).
   * @returns {Uint8Array}
   */
  createIdentityLUT() {
    const lut = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      lut[i] = i;
    }
    return lut;
  }

  /**
   * Genera las LUTs para todos los canales si las curvas han cambiado.
   * @param {object} curves - El objeto de curvas del estado de la aplicación.
   */
  generateLUTs(curves) {
    if (JSON.stringify(curves) === this.cachedCurves) {
      return; // No es necesario regenerar
    }

    for (const channel in curves) {
      if (this.luts[channel]) {
        this.luts[channel] = this.generateLUTForChannel(curves[channel]);
      }
    }
    this.cachedCurves = JSON.stringify(curves);
  }

  /**
   * Genera una LUT para un canal específico usando interpolación lineal entre puntos.
   * @param {Array<{x: number, y: number}>} points - Los puntos de la curva para el canal.
   * @returns {Uint8Array}
   */
  generateLUTForChannel(points) {
    const lut = new Uint8Array(256);
    // Asegurarse de que los puntos están ordenados por X
    const sortedPoints = [...points].sort((a, b) => a.x - b.x);

    for (let i = 0; i < sortedPoints.length - 1; i++) {
      const p1 = sortedPoints[i];
      const p2 = sortedPoints[i + 1];

      for (let x = p1.x; x <= p2.x; x++) {
        const t = (p2.x - p1.x === 0) ? 0 : (x - p1.x) / (p2.x - p1.x);
        const y = p1.y + t * (p2.y - p1.y);
        lut[x] = Math.round(Math.max(0, Math.min(255, y)));
      }
    }
    return lut;
  }

  /**
   * Aplica las LUTs de curvas generadas a un array de píxeles.
   * @param {Uint8ClampedArray} pixels - El array de píxeles.
   * @param {object} curves - El objeto de curvas del estado de la aplicación.
   * @returns {Uint8ClampedArray} El array de píxeles modificado.
   */
  apply(pixels, curves) {
    if (!curves) return pixels;

    this.generateLUTs(curves);

    const { rgb, r, g, b } = this.luts;

    for (let i = 0; i < pixels.length; i += 4) {
      // Primero se aplica la curva RGB (maestra)
      let red = rgb[pixels[i]];
      let green = rgb[pixels[i + 1]];
      let blue = rgb[pixels[i + 2]];

      // Luego se aplican las curvas de canal individuales
      pixels[i] = r[red];
      pixels[i + 1] = g[green];
      pixels[i + 2] = b[blue];
    }
    return pixels;
  }
}

export const curveProcessor = new CurveProcessor();
