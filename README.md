# 🎨 DitherLab v7

<div align="center">

![DitherLab](https://img.shields.io/badge/DitherLab-v7.0_Modular-06b6d4?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cmVjdCBmaWxsPSIjMDZiNmQ0IiB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1zaXplPSI2MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iIGZpbGw9IndoaXRlIj5EPC90ZXh0Pjwvc3ZnPg==)
![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)
![Status](https://img.shields.io/badge/status-active-success?style=for-the-badge)

**Una herramienta web para aplicar efectos de tramado (dithering) a imágenes y videos en tiempo real, ahora con una arquitectura modular moderna.**

[Demo en Vivo](https://carloszevallostrigoso.github.io/dither.lab/) • [Reportar un Bug](https://github.com/CarlosZevallosTrigoso/dither.lab/issues)

</div>

**DitherLab v7** es la evolución de su predecesor, refactorizado para ser más mantenible, escalable y eficiente. Mantiene todas las funcionalidades que lo hicieron una herramienta poderosa, pero ahora sobre una base de código desacoplada que utiliza Módulos ES.

## ✨ Características Principales

* **11 Algoritmos de Dithering**: Incluye clásicos como Floyd-Steinberg y Atkinson, y otros avanzados como Blue Noise y Variable Error.
* **Soporte Multimedia**: Funciona con imágenes (PNG, JPG) y videos (MP4, WEBM).
* **Paletas de Color Dinámicas**: Genera una paleta de colores automáticamente desde tu archivo o personalízala a tu gusto.
* **Ajustes de Imagen Avanzados**: Controla el brillo, contraste, saturación y curvas de color para un control total.
* **Exportación Flexible**: Guarda tu trabajo como **WebM**, **GIF**, **Sprite Sheet** o **secuencia PNG**.
* **Timeline para Videos**: Define puntos de entrada y salida, crea bucles y ajusta la velocidad de reproducción.
* **Sistema de Presets**: Guarda y carga tus configuraciones favoritas.
* **Análisis de Métricas**: Mide la calidad de la imagen con métricas como PSNR y SSIM.

## 🏗️ Nueva Arquitectura Modular

La versión 7 introduce una estructura de código fuente organizada y desacoplada dentro del directorio `/src`.

* `/src/core`: Contiene el núcleo de la aplicación:
    * `appState.js`: Gestor de estado centralizado. La única fuente de la verdad.
    * `ditherProcessor.js`: Motor de renderizado con p5.js, aislado de la UI.
    * `mediaHandler.js`: Lógica para cargar y gestionar archivos multimedia.
* `/src/components`: Módulos que manejan la interfaz de usuario.
    * `uiManager.js`: Gestiona todos los eventos del DOM y actualiza el estado.
    * `curvesEditor.js`: Componente encapsulado para el editor de curvas.
    * `timeline.js`: Lógica de la línea de tiempo interactiva.
* `/src/services`: Funcionalidades adicionales como servicios.
    * `exportManager.js`: Lógica para exportar en todos los formatos.
    * `presetsManager.js`: Manejo de presets con `localStorage`.
    * `pwa.js`: Lógica del Service Worker.
* `/src/utils`: Funciones de ayuda y constantes.
    * `constants.js`: Kernels, nombres de algoritmos, etc.
    * `helpers.js`: Funciones de utilidad (toast, formatTime).
    * `metrics.js`: Funciones para calcular PSNR y SSIM.

## 🚀 Cómo Empezar

El uso de la aplicación no ha cambiado:
1.  **Arrastra un archivo**: Suelta una imagen o video en el área designada.
2.  **Elige un algoritmo**: Selecciona uno de los efectos de la lista.
3.  **Ajusta los controles**: Modifica la paleta, el brillo, el contraste, etc.
4.  **Exporta tu creación**: Descarga el resultado en tu formato preferido.

---
