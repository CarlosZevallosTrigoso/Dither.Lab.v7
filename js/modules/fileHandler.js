/**
 * ============================================================================
 * DitherLab v7 - Módulo de Gestión de Archivos (File Handler)
 * ============================================================================
 * - Encapsula toda la lógica para cargar y procesar los archivos.
 * - Incluye la generación automática de paletas desde el medio.
 * ============================================================================
 */
import { events } from '../app/events.js';
import { updateState, getState, updateConfig } from '../app/state.js';
import { showToast } from '../utils/helpers.js';

let currentFileURL = null;

/**
 * Genera una paleta de colores usando el algoritmo k-means++ desde el medio.
 * @param {p5.MediaElement|p5.Image} media - El elemento de video o imagen.
 * @param {number} colorCount - El número de colores a extraer.
 * @param {p5} p - La instancia de p5.js.
 * @returns {Promise<string[]>} Una promesa que resuelve a un array de colores hexadecimales.
 */
async function generatePaletteFromMedia(media, colorCount, p) {
    showToast('Generando paleta desde el medio...');
    const tempCanvas = p.createGraphics(100, 100);
    tempCanvas.pixelDensity(1);

    if (getState().mediaType === 'video') {
        media.pause();
        
        // ✅ MEJORA: Esperar de forma fiable a que el primer frame esté listo
        await new Promise(resolve => {
            // Cuando el video confirme que ha 'buscado' el frame 0, resolvemos la promesa
            media.elt.onseeked = () => resolve();
            media.time(0);
        });
    }
    
    tempCanvas.image(media, 0, 0, tempCanvas.width, tempCanvas.height);
    tempCanvas.loadPixels();
    
    const pixels = [];
    for (let i = 0; i < tempCanvas.pixels.length; i += 4) {
        pixels.push([tempCanvas.pixels[i], tempCanvas.pixels[i+1], tempCanvas.pixels[i+2]]);
    }

    // ... (El resto de la lógica de k-means es correcta y se mantiene igual)
    const colorDist = (c1, c2) => Math.sqrt((c1[0]-c2[0])**2 + (c1[1]-c2[1])**2 + (c1[2]-c2[2])**2);
    let centroids = [pixels[Math.floor(Math.random() * pixels.length)]];
    
    while (centroids.length < colorCount) {
        const distances = pixels.map(px => {
            let minDist = Infinity;
            centroids.forEach(c => { minDist = Math.min(minDist, colorDist(px, c)); });
            return minDist * minDist;
        });
        const sumDist = distances.reduce((a, b) => a + b, 0);
        let rand = Math.random() * sumDist;
        for (let i = 0; i < pixels.length; i++) {
            rand -= distances[i];
            if (rand <= 0) {
                centroids.push(pixels[i]);
                break;
            }
        }
    }

    for (let iter = 0; iter < 10; iter++) {
        const assignments = pixels.map(px => {
            let bestCentroid = 0;
            let minDist = Infinity;
            centroids.forEach((c, j) => {
                const dist = colorDist(px, c);
                if (dist < minDist) {
                    minDist = dist;
                    bestCentroid = j;
                }
            });
            return bestCentroid;
        });

        const newCentroids = Array(colorCount).fill(0).map(() => [0,0,0]);
        const counts = Array(colorCount).fill(0);
        pixels.forEach((px, i) => {
            const centroidIndex = assignments[i];
            newCentroids[centroidIndex][0] += px[0];
            newCentroids[centroidIndex][1] += px[1];
            newCentroids[centroidIndex][2] += px[2];
            counts[centroidIndex]++;
        });

        centroids = newCentroids.map((sum, i) => counts[i] > 0 ? sum.map(v => Math.round(v / counts[i])) : centroids[i]);
    }
    
    tempCanvas.remove();
    
    centroids.sort((a,b) => (a[0]*0.299 + a[1]*0.587 + a[2]*0.114) - (b[0]*0.299 + b[1]*0.587 + b[2]*0.114));
    return centroids.map(c => '#' + c.map(v => v.toString(16).padStart(2, '0')).join(''));
}


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
    return { width: Math.max(100, Math.floor(canvasW)), height: Math.max(100, Math.floor(canvasH)) };
}

async function handleFile(file, p) {
    const fileType = file.type;
    const isVideo = fileType.startsWith('video/');
    const isImage = fileType.startsWith('image/');

    if (!isVideo && !isImage) {
        showToast('Formato no soportado.');
        return;
    }

    let { media } = getState();
    if (media && typeof media.remove === 'function') media.remove();
    if (currentFileURL) URL.revokeObjectURL(currentFileURL);

    currentFileURL = URL.createObjectURL(file);
    const mediaType = isVideo ? 'video' : 'image';

    try {
        const mediaElement = await new Promise((resolve, reject) => {
            if (isVideo) {
                const video = p.createVideo(currentFileURL, () => resolve(video));
                video.elt.addEventListener('error', () => reject(new Error('Error al cargar el video.')));
            } else {
                p.loadImage(currentFileURL, img => resolve(img), () => reject(new Error('Error al cargar la imagen.')));
            }
        });

        if (isVideo) mediaElement.hide();

        const { width: canvasWidth, height: canvasHeight } = calculateCanvasDimensions(mediaElement.width, mediaElement.height);
        
        updateState({ 
            media: mediaElement, 
            mediaType, 
            mediaInfo: {
                width: mediaElement.width,
                height: mediaElement.height,
                duration: isVideo ? mediaElement.duration() : 0,
                fileName: file.name
            }
        });

        const newPalette = await generatePaletteFromMedia(mediaElement, getState().config.colorCount, p);
        updateConfig({ colors: newPalette });

        events.emit('media:loaded', { 
            canvasWidth, 
            canvasHeight,
            media: mediaElement,
            mediaType
        });
        
        showToast(`${mediaType === 'video' ? 'Video' : 'Imagen'} cargado.`);

    } catch (error) {
        console.error("Error en handleFile:", error);
        showToast('No se pudo cargar el archivo.');
    }
}

export function initializeFileHandler(p) {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');

    document.body.addEventListener("dragover", e => {
        e.preventDefault();
        dropZone.classList.add("border-cyan-400");
    });
    document.body.addEventListener("dragleave", (e) => {
        if (!dropZone.contains(e.relatedTarget)) {
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
