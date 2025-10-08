/**
 * ============================================================================
 * DitherLab v7 - Módulo de Gestión de Archivos (File Handler)
 * ============================================================================
 */
import { events } from '../app/events.js';
import { updateState, getState, updateConfig } from '../app/state.js';
import { showToast } from '../utils/helpers.js';

let currentFileURL = null;

async function generatePaletteFromMedia(media, colorCount, p) {
    showToast('Generando paleta desde el medio...');
    const tempCanvas = p.createGraphics(100, 100);
    tempCanvas.pixelDensity(1);

    let sourceImage = media;

    if (getState().mediaType === 'video') {
        media.pause();
        
        await new Promise(resolve => {
            media.elt.onseeked = () => {
                media.elt.onseeked = null;
                resolve();
            };
            media.time(0);
        });
        
        sourceImage = media.get();
    }
    
    tempCanvas.image(sourceImage, 0, 0, tempCanvas.width, tempCanvas.height);
    tempCanvas.loadPixels();
    
    const pixels = [];
    for (let i = 0; i < tempCanvas.pixels.length; i += 4) {
        if (tempCanvas.pixels[i+3] > 128) {
            pixels.push([tempCanvas.pixels[i], tempCanvas.pixels[i+1], tempCanvas.pixels[i+2]]);
        }
    }

    if (pixels.length === 0) {
        showToast("No se pudieron leer los colores del video.", 3000);
        return ['#000000', '#FFFFFF'];
    }

    // ... (k-means logic)
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

        // ✅ CORRECCIÓN FINAL: Emitir el evento con los datos necesarios
        events.emit('media:loaded', {
            media: mediaElement,
            mediaType
        });

        const newPalette = await generatePaletteFromMedia(mediaElement, getState().config.colorCount, p);
        updateConfig({ colors: newPalette });
        
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
