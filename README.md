# 🎨 DitherLab v7 - Arquitectura Modular

<div align="center">

![DitherLab v7](https://img.shields.io/badge/DitherLab-v7.0-06b6d4?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cmVjdCBmaWxsPSIjMDZiNmQ0IiB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1zaXplPSI2MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iIGZpbGw9IndoaXRlIj5ENzwvdGV4dD48L3N2Zz4=)
![Status](https://img.shields.io/badge/status-en--desarrollo-success?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)

**Una herramienta web PWA para aplicar efectos de tramado (dithering) a imágenes y videos, refactorizada con una arquitectura modular profesional.**

[Demo en Vivo (Próximamente)](#) • [Reportar un Bug](#)

</div>

**DitherLab v7** es la evolución de su predecesor, reconstruido desde cero con un enfoque en la modularidad, escalabilidad y mantenibilidad. Permite a artistas digitales, desarrolladores y entusiastas experimentar con algoritmos de dithering clásicos y modernos en tiempo real, directamente en el navegador y con capacidad offline.

## ✨ Características Principales

DitherLab v7 mantiene todas las potentes características de la v6, pero ahora sobre una base de código robusta y extensible:

* **Motor de Algoritmos por Plugins**: Incluye 11 algoritmos de dithering, desde clásicos como **Floyd-Steinberg** hasta avanzados como **Variable Error**. La nueva arquitectura permite añadir nuevos algoritmos sin modificar el núcleo del sistema.
* **Soporte Multimedia Avanzado**: Procesa imágenes (PNG, JPG) y videos (MP4, WEBM) utilizando un gestor de medios desacoplado.
* **Paletas de Color Dinámicas**: Genera paletas de color optimizadas automáticamente desde el medio usando K-Means++, o personaliza cada color a tu gusto.
* **Edición de Imagen Profesional**: Controla el brillo, contraste, saturación y, por primera vez, un **editor de curvas RGB por canal** totalmente interactivo.
* **Sistema de Exportación Flexible**: Guarda tu trabajo en 5 formatos distintos: **PNG**, **WebM**, **GIF animado**, **Sprite Sheet** y **secuencia PNG**.
* **Timeline Precisa para Videos**: Define puntos de entrada y salida, crea bucles y ajusta la velocidad de reproducción con un controlador de timeline dedicado.
* **Gestión de Estado Centralizada**: Toda la configuración de la aplicación se gestiona en un `Store` único (similar a Redux), facilitando la depuración y la consistencia del estado.
* **Análisis de Métricas**: Mide la calidad y características de la imagen procesada con métricas como PSNR, SSIM y análisis de compresión de paleta.

## 🚀 Cómo Empezar

1.  **Arrastra un archivo**: Suelta una imagen o video en el área designada.
2.  **Elige un algoritmo**: Selecciona uno de los efectos de la lista. **Floyd-Steinberg** es un excelente punto de partida.
3.  **Ajusta los controles**:
    * Modifica la cantidad de colores, la paleta o activa el modo monocromático.
    * Refina la imagen con los controles de brillo, contraste o el potente editor de curvas.
    * Ajusta los parámetros avanzados del algoritmo, como la escala o la fuerza de difusión.
4.  **Exporta tu creación**: Descarga el resultado en el formato que prefieras.

### Atajos de Teclado

| Tecla | Acción |
| :--- | :--- |
| `Espacio` | Play / Pausa |
| `←` / `→` | Frame Anterior / Siguiente |
| `I` / `O` | Marcar Entrada / Salida |
| `D` | Descargar como PNG |
| `F` | Pantalla Completa |
| `?` | Ver todos los atajos |

---

## 🏗️ Arquitectura de DitherLab v7

Esta versión fue diseñada siguiendo principios de software profesional para maximizar la modularidad y facilitar futuras contribuciones.

El código fuente está organizado en directorios con responsabilidades únicas:

* `src/core/`: Contiene el núcleo de la aplicación:
    * **`EventBus.js`**: Un sistema de publicación/suscripción que permite la comunicación desacoplada entre módulos.
    * **`Store.js`**: Un gestor de estado centralizado que actúa como la "única fuente de verdad".
    * **`CanvasManager.js`**: Encapsula toda la lógica de renderizado de p5.js, respondiendo a los cambios de estado.
    * **`MediaLoader.js`**: Gestiona la carga y limpieza de archivos multimedia.

* `src/algorithms/`: Implementa la arquitectura de plugins. Cada algoritmo es una clase que hereda de `BaseAlgorithm.js` y se registra en `AlgorithmRegistry.js`.

* `src/processors/`: Lógica de procesamiento de imagen, separada de la UI y de los algoritmos. Incluye `ImageProcessor.js`, `PaletteGenerator.js` y `CurveProcessor.js`.

* `src/ui/`: Componentes de UI que leen el estado del `Store` y publican eventos al `EventBus`. `UIController.js` orquesta todos los paneles.

* `src/exporters/`: Sistema de plugins para los diferentes formatos de exportación. Cada exportador hereda de `BaseExporter.js` y se registra en `ExporterRegistry.js`.

* `src/main.js`: El punto de entrada de la aplicación. Su única responsabilidad es inicializar todos los módulos en el orden correcto.

### ¿Cómo añadir un nuevo algoritmo?

Gracias a la nueva arquitectura, añadir un algoritmo es muy sencillo:

1.  **Crea tu archivo**: Crea un nuevo archivo en `src/algorithms/`, por ejemplo, `src/algorithms/Advanced/MyNewAlgorithm.js`.
2.  **Implementa la clase**: Tu clase debe heredar de `BaseAlgorithm` e implementar el método `process()`.
3.  **Regístralo**: En `src/processors/ImageProcessor.js`, importa tu nueva clase y regístrala en el `AlgorithmRegistry` dentro del método `registerAlgorithms()`.
4.  **Añádelo a la UI**: Agrega una nueva opción en el `<select>` correspondiente dentro de `index.html`.

¡Eso es todo! El resto de la aplicación lo gestionará automáticamente.

---

Este proyecto es una demostración de cómo aplicar principios de ingeniería de software a una herramienta creativa basada en la web, transformando un script monolítico en una aplicación robusta, mantenible y divertida de extender.
