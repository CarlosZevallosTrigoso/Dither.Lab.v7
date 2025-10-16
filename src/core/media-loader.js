/**
 * media-loader.js
 * Maneja la carga de imágenes y videos.
 */
import { eventBus } from '../event-bus.js';

let p5Instance; // Se recibirá desde el renderer

function handleFile(file, state) {
  const fileType = file.type;
  const isVideo = fileType.startsWith('video/');
  const isImage = fileType.startsWith('image/');

  if (!isVideo && !isImage) {
    eventBus.publish('ui:showToast', { message: 'Formato no soportado', type: 'error' });
    return;
  }
  
  const fileURL = URL.createObjectURL(file);
  const mediaType = isVideo ? 'video' : 'image';

  if (isVideo) {
    const media = p5Instance.createVideo([fileURL], () => {
      media.volume(0);
      media.hide();
      state.mutate({ media, mediaType, isPlaying: false });
      eventBus.publish('media:loaded', { media, mediaType });
    });
  } else {
    const media = p5Instance.loadImage(fileURL, () => {
      state.mutate({ media, mediaType });
      eventBus.publish('media:loaded', { media, mediaType });
    });
  }
}

export function initializeMediaLoader(state, bus) {
  // Esperar a que el renderer nos envíe la instancia de p5
  bus.subscribe('renderer:ready', (p5) => {
    p5Instance = p5;
    
    const dropZone = document.getElementById('sidebar-container'); // O un elemento específico si se crea en la UI
    
    // Usamos el body para una experiencia de drop más amplia
    document.body.addEventListener("dragover", e => e.preventDefault());
    document.body.addEventListener("dragleave", e => e.preventDefault());
    document.body.addEventListener("drop", e => {
      e.preventDefault();
      if (e.dataTransfer.files.length > 0) {
        handleFile(e.dataTransfer.files[0], state);
      }
    });
  });
}