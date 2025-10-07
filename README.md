# 🎨 DitherLab v7 - Modular Edition

<div align="center">

[![Versión](https://img.shields.io/badge/DitherLab-v7.0-06b6d4?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cmVjdCBmaWxsPSIjMDZiNmQ0IiB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1zaXplPSI2MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iIGZpbGw9IndoaXRlIj5EPC90ZXh0Pjwvc3ZnPg==)](https://github.com/CarlosZevallosTrigoso/dither.lab)
[![Licencia: CC BY-NC 4.0](https://img.shields.io/badge/License-CC%20BY--NC%204.0-lightgrey.svg?style=for-the-badge)](https://creativecommons.org/licenses/by-nc/4.0/)
[![Demo Online](https://img.shields.io/badge/Demo-Online-brightgreen?style=for-the-badge&logo=github)](https://carloszevallostrigoso.github.io/dither.lab/)
[![Estado](https://img.shields.io/badge/status-activo-success?style=for-the-badge)](https://github.com/CarlosZevallosTrigoso/dither.lab/commits/main)

**Una herramienta web PWA para aplicar efectos de tramado (dithering) a imágenes y videos en tiempo real, ahora con una arquitectura completamente modular para un fácil mantenimiento y escalabilidad.**

</div>

**DitherLab v7** es un procesador de dithering avanzado que te permite experimentar con algoritmos clásicos y modernos, ajustar paletas de colores, modificar curvas de color y exportar tus creaciones en múltiples formatos. Es una Progressive Web App (PWA) instalable que funciona sin conexión.

## ✨ Características Principales

* **11+ Algoritmos de Dithering**: Desde clásicos como Floyd-Steinberg y Atkinson, hasta opciones avanzadas como Blue Noise y Variable Error.
* **Soporte Multimedia**: Funciona con imágenes (PNG, JPG, GIF) y videos (MP4, WEBM, MOV).
* **Edición Avanzada de Imagen**: Control total sobre brillo, contraste, saturación y un editor de curvas RGB por canales.
* **Paletas de Color Dinámicas**: Genera una paleta de colores automáticamente desde tu archivo o personalízala a tu gusto.
* **Exportación Flexible**: Guarda tu trabajo como **WebM**, **GIF animado**, **Sprite Sheet** o **secuencia PNG**.
* **Timeline para Videos**: Define puntos de entrada y salida, crea bucles y ajusta la velocidad de reproducción.
* **Sistema de Presets**: Guarda y carga tus configuraciones favoritas para reutilizarlas fácilmente.
* **Análisis de Métricas**: Mide la calidad de la imagen procesada con métricas estándar como PSNR y SSIM.
* **PWA y Offline-First**: Instala la aplicación en tu escritorio o móvil y úsala sin necesidad de conexión a internet.

## 🚀 Cómo Empezar

1.  **Arrastra un archivo**: Suelta una imagen o video en el área designada.
2.  **Elige un algoritmo**: Selecciona uno de los efectos de la lista. **Floyd-Steinberg** es un excelente punto de partida.
3.  **Ajusta los controles**:
    * Modifica la cantidad de colores y la paleta.
    * Ajusta el brillo, contraste o las curvas de color.
4.  **Exporta tu creación**: Descarga el resultado en el formato que prefieras.

## 📜 Licencia

Este proyecto está bajo la licencia **Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)**.

Esto significa que eres libre de:
* **Compartir** — copiar y redistribuir el material en cualquier medio o formato.
* **Adaptar** — remezclar, transformar y construir sobre el material.

Bajo los siguientes términos:
* **Atribución** — Debes dar crédito de manera adecuada, brindar un enlace a la licencia, e indicar si se han realizado cambios.
* **No Comercial** — No puedes utilizar el material para una finalidad comercial.

Para más detalles, consulta el archivo `LICENSE` en este repositorio.

---

## 🏗️ Arquitectura de DitherLab v7

Esta versión ha sido refactorizada desde cero para ser completamente modular. La lógica está separada en componentes independientes (UI, renderizado, estado, exportación, etc.) que se comunican a través de un bus de eventos. Esto permite que futuras actualizaciones y la adición de nuevas características sean mucho más sencillas y seguras de implementar.