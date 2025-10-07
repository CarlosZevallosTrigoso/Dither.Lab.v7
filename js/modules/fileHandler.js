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
// LÍNEA CORREGIDA: Se añade 'getState' a la importación.
import { updateState, getState } from '../app/state.js';
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
    const padding = 32;
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
    if (media && typeof media.remove === 'function') {
        media.remove();
    }
    if (currentFileURL) {
        URL.revokeObjectURL(currentFileURL);
    }

    currentFileURL = URL.createObjectURL(file);
    const mediaType = isVideo ? 'video' : 'image';

    const loadPromise = new Promise((resolve, reject) => {
        const callback = (mediaElement) => {
            if (mediaElement.width > 0 || (mediaElement.elt && mediaElement.elt.readyState >= 1)) {
                resolve(mediaElement);
            } else {
                // Si la imagen no carga inmediatamente, puede ser un error
                setTimeout(() => reject(new Error("No se pudo cargar el medio.")), 3000);
            }
        };
        
        if (isVideo) {
            const videoElement = p.createVideo(currentFileURL, () => resolve(videoElement));
            videoElement.elt.addEventListener('error', reject);
        } else {
            p.loadImage(currentFileURL, callback, () => reject(new Error("Error al cargar la imagen")));
        }
    });

    try {
        const mediaElement = await loadPromise;
        mediaElement.hide();

        const { width: canvasWidth, height: canvasHeight } = calculateCanvasDimensions(mediaElement.width, mediaElement.height);

        const mediaInfo = {
            width: mediaElement.width,
            height: mediaElement.height,
            duration: isVideo ? mediaElement.duration() : 0,
            fileName: file.name
        };
        
        updateState({ media: mediaElement, mediaType, mediaInfo });
        events.emit('media:loaded', { canvasWidth, canvasHeight });
        showToast(`${mediaType === 'video' ? 'Video' : 'Imagen'} cargado: ${file.name}`);

    } catch (error) {
        console.error(error);
        showToast('Error al cargar el archivo.');
    }
}


/**
 * Inicializa los listeners de eventos para la carga de archivos.
 * @param {p5} p - La instancia de p5.js.
 */
export function initializeFileHandler(p) {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');

    document.body.addEventListener("dragover", e => {
        e.preventDefault();
        dropZone.classList.add("border-cyan-400");
    });
    document.body.addEventListener("dragleave", (e) => {
        if (e.relatedTarget === null) {
           dropZone.classList.remove("border-cyan-400");
        }
    });
    document.body.addEventListener("drop", e => {
        e.preventDefault();
        dropZone.classList.remove("border-cyan-400");
        if (e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0], p);
        }
    });

    dropZone.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", e => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0], p);
        }
    });

    console.log('File Handler inicializado.');
}
