/**
 * ============================================================================
 * DitherLab v7 - Módulo de Gestión de Archivos (File Handler)
 * ============================================================================
 * - Encapsula toda la lógica para cargar y procesar los archivos de
 * imagen y video del usuario.
 * - Gestiona el Drag & Drop y el input de tipo 'file'.
 * - Emite el evento 'media:loaded' cuando un archivo se ha cargado
 * correctamente, pasando la información necesaria a otros módulos.
 * ============================================================================
 */
import { events } from '../app/events.js';
import { updateState } from '../app/state.js';
import { showToast } from '../utils/helpers.js';

let currentFileURL = null; // Para gestionar y revocar ObjectURLs

/**
 * Calcula las dimensiones óptimas del canvas para ajustarse al contenedor.
 * @param {number} mediaWidth - Ancho del medio original.
 * @param {number} mediaHeight - Alto del medio original.
 * @returns {{width: number, height: number}} - Dimensiones del canvas.
 */
function calculateCanvasDimensions(mediaWidth, mediaHeight) {
    const container = document.getElementById('canvasContainer');
    const padding = 32; // Espacio de margen dentro del contenedor
    const availableWidth = container.clientWidth - padding;
    const availableHeight = container.clientHeight - padding;
    const mediaAspect = mediaWidth / mediaHeight;
    const containerAspect = availableWidth / availableHeight;

    let canvasW, canvasH;

    if (mediaAspect > containerAspect) {
        canvasW = availableWidth;
        canvasH = canvasW / mediaAspect;
    } else {
        canvasH = availableHeight;
        canvasW = canvasH * mediaAspect;
    }
    
    return { width: Math.floor(canvasW), height: Math.floor(canvasH) };
}

/**
 * Procesa el archivo seleccionado por el usuario.
 * @param {File} file - El archivo a procesar.
 * @param {p5} p - La instancia de p5.js para crear elementos multimedia.
 */
async function handleFile(file, p) {
    const fileType = file.type;
    const isVideo = fileType.startsWith('video/');
    const isImage = fileType.startsWith('image/');

    if (!isVideo && !isImage) {
        showToast('Formato no soportado.');
        return;
    }

    // Si había un medio cargado, lo liberamos.
    let { media } = getState();
    if (media) {
        if (media.elt && typeof media.remove === 'function') {
            media.remove();
        }
    }
    if (currentFileURL) {
        URL.revokeObjectURL(currentFileURL);
    }

    currentFileURL = URL.createObjectURL(file);
    const mediaType = isVideo ? 'video' : 'image';

    const mediaElement = isVideo
        ? p.createVideo(currentFileURL)
        : p.loadImage(currentFileURL);
        
    mediaElement.hide();

    // Esperar a que el medio se cargue para obtener sus dimensiones
    await new Promise((resolve) => {
        if (isVideo) {
            mediaElement.elt.addEventListener('loadedmetadata', resolve, { once: true });
        } else {
            mediaElement.width > 0 ? resolve() : setTimeout(resolve, 100); // Pequeña espera para imágenes
        }
    });

    const { width: canvasWidth, height: canvasHeight } = calculateCanvasDimensions(mediaElement.width, mediaElement.height);

    const mediaInfo = {
        width: mediaElement.width,
        height: mediaElement.height,
        duration: isVideo ? mediaElement.duration() : 0,
        fileName: file.name
    };
    
    // Actualizamos el estado global
    updateState({ media: mediaElement, mediaType, mediaInfo });

    // Notificamos al resto de la app que el medio está listo
    events.emit('media:loaded', { canvasWidth, canvasHeight });
    showToast(`${mediaType === 'video' ? 'Video' : 'Imagen'} cargado: ${file.name}`);
}


/**
 * Inicializa los listeners de eventos para la carga de archivos.
 * @param {p5} p - La instancia de p5.js.
 */
export function initializeFileHandler(p) {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');

    // Drag & Drop
    document.body.addEventListener("dragover", e => {
        e.preventDefault();
        dropZone.classList.add("border-cyan-400");
    });
    document.body.addEventListener("dragleave", () => {
        dropZone.classList.remove("border-cyan-400");
    });
    document.body.addEventListener("drop", e => {
        e.preventDefault();
        dropZone.classList.remove("border-cyan-400");
        if (e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0], p);
        }
    });

    // Click
    dropZone.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", e => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0], p);
        }
    });

    console.log('File Handler inicializado.');
}