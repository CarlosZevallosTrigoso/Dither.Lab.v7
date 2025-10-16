/**
 * renderer.js
 * Encapsula toda la lógica de renderizado con p5.js.
 * Se suscribe a los cambios de estado para redibujar.
 */

// Aún no importamos los algoritmos, lo haremos después.

export function createRenderer(container, state, eventBus) {
  let canvas;

  const sketch = p => {
    // --- Setup ---
    p.setup = () => {
      canvas = p.createCanvas(400, 225);
      canvas.parent(container);
      p.pixelDensity(1);
      p.noSmooth();
      canvas.elt.style.imageRendering = 'pixelated';
      p.noLoop(); // El redibujado será controlado por eventos

      // Notificar a otros módulos que p5 está listo
      eventBus.publish('renderer:ready', p);
    };

    // --- Draw ---
    p.draw = () => {
      const currentState = state.get();
      p.background(0);

      if (!currentState.media) {
        p.fill(128);
        p.textAlign(p.CENTER, p.CENTER);
        p.text('Arrastra un video o imagen para comenzar', p.width / 2, p.height / 2);
        return;
      }

      // Lógica de renderizado principal
      // Aquí llamaremos a la fábrica de algoritmos más adelante
      // Por ahora, solo mostramos la imagen original
      const { media, config } = currentState;
      
      // Lógica simple de redimensionamiento para encajar en el canvas
      const mediaAspect = media.width / media.height;
      const canvasAspect = p.width / p.height;
      let drawW, drawH, drawX, drawY;

      if (mediaAspect > canvasAspect) {
        drawW = p.width;
        drawH = p.width / mediaAspect;
      } else {
        drawH = p.height;
        drawW = p.height * mediaAspect;
      }
      drawX = (p.width - drawW) / 2;
      drawY = (p.height - drawH) / 2;
      
      p.image(media, drawX, drawY, drawW, drawH);
    };

    // --- Suscripciones a Eventos ---
    eventBus.subscribe('state:changed', () => {
      p.redraw();
    });
    
    eventBus.subscribe('media:loaded', ({ media, mediaType }) => {
       // Auto-play de videos para que el bucle de renderizado se active
       if (mediaType === 'video') {
         media.loop();
         p.loop(); // Activar el bucle de p5 para videos
       } else {
         p.noLoop(); // Detener para imágenes
       }
       p.redraw();
    });
  };

  return new p5(sketch);
}