/**
 * renderer.js
 * Encapsula toda la lógica de renderizado con p5.js.
 * Se suscribe a los cambios de estado para redibujar.
 */
import { DitherFactory } from '../algorithms/index.js';
import { LumaLUT, BayerLUT, BlueNoiseLUT, applyImageAdjustments } from '../utils/helpers.js';

export function createRenderer(container, state, eventBus) {
  let canvas;
  let buffer; // Búfer para el procesamiento de la imagen
  
  // Instancias de utilidades
  const lumaLUT = new LumaLUT();
  const bayerLUT = new BayerLUT();
  const blueNoiseLUT = new BlueNoiseLUT();
  
  const utils = { lumaLUT, bayerLUT, blueNoiseLUT, applyImageAdjustments };

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

      // --- Lógica de Renderizado Principal ---
      const { media, config } = currentState;
      const scale = config.ditherScale || 1;
      
      const pw = Math.floor(p.width / scale);
      const ph = Math.floor(p.height / scale);

      // Asegurarse de que el búfer exista y tenga el tamaño correcto
      if (!buffer || buffer.width !== pw || buffer.height !== ph) {
        if (buffer) buffer.remove();
        buffer = p.createGraphics(pw, ph);
        buffer.pixelDensity(1);
        buffer.noSmooth();
      }

      // Reconstruir la LumaLUT si los colores han cambiado
      // (Esta es una optimización importante)
      const p5colors = config.colors.map(c => p.color(c));
      if (lumaLUT.needsRebuild(p5colors)) {
        lumaLUT.build(p5colors, p);
      }

      // Aplicar el efecto usando la fábrica de algoritmos
      DitherFactory.applyEffect(buffer, media, config, utils);

      // Dibujar el búfer procesado en el lienzo principal, escalado
      p.image(buffer, 0, 0, p.width, p.height);
    };

    // --- Suscripciones a Eventos ---
    eventBus.subscribe('state:changed', (newState) => {
      if (newState.media) {
        p.redraw();
      }
    });
    
    eventBus.subscribe('media:loaded', ({ media, mediaType }) => {
      // Redimensionar el canvas para que coincida con el aspect ratio del medio
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      const mediaAspect = media.width / media.height;
      
      let newWidth, newHeight;
      if (containerWidth / containerHeight > mediaAspect) {
        newHeight = containerHeight;
        newWidth = newHeight * mediaAspect;
      } else {
        newWidth = containerWidth;
        newHeight = newWidth / mediaAspect;
      }
      p.resizeCanvas(Math.floor(newWidth), Math.floor(newHeight));

      if (mediaType === 'video') {
        media.loop(); // Reproducir video
        p.loop();     // Activar el bucle de p5 para videos
      } else {
        p.noLoop();   // Detener para imágenes
        p.redraw();   // Dibujar el primer frame
      }
    });

    // Suscripción a eventos de control de medios
    bus.subscribe('media:toggle-play', () => {
        const { media, isPlaying } = state.get();
        if (media) {
            if (isPlaying) media.pause();
            else media.loop();
            state.mutate({ isPlaying: !isPlaying });
        }
    });

    bus.subscribe('media:restart', () => {
        const { media } = state.get();
        if (media) media.time(0);
    });
  };

  return new p5(sketch);
}
