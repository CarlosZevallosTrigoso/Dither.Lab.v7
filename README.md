# 🎨 DitherLab v7

<div align="center">

![DitherLab](https://img.shields.io/badge/DitherLab-v7.0-06b6d4?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cmVjdCBmaWxsPSIjMDZiNmQ0IiB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1zaXplPSI2MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iIGZpbGw9IndoaXRlIj5EPC90ZXh0Pjwvc3ZnPg==)
![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)
![Status](https://img.shields.io/badge/status-active-success?style=for-the-badge)

**Una herramienta web moderna y modular para aplicar efectos de tramado (dithering) a imágenes y videos en tiempo real.**

[Demo en Vivo (Próximamente)] • [Reportar un Bug]

</div>

**DitherLab v7** es la evolución de la popular herramienta de dithering, reconstruida desde cero con una arquitectura de software moderna y escalable. Te permite experimentar con algoritmos clásicos y avanzados, ajustar paletas de colores y exportar tus creaciones en múltiples formatos. Es una PWA (Progressive Web App) instalable que funciona sin conexión.

## ✨ Características Principales

* **11 Algoritmos de Dithering**: Incluye clásicos como Floyd-Steinberg y Atkinson, y otros avanzados como Blue Noise.
* **Soporte Multimedia**: Funciona con imágenes (PNG, JPG) y videos (MP4, WEBM).
* **Paletas de Color Dinámicas**: Genera una paleta de colores automáticamente desde tu archivo o personalízala a tu gusto.
* **Ajustes de Imagen Avanzados**: Controla el brillo, contraste, saturación y curvas de color para un control total.
* **Exportación Flexible**: Guarda tu trabajo como **WebM**, **GIF**, **Sprite Sheet** o **secuencia PNG**.
* **Timeline para Videos**: Define puntos de entrada y salida, crea bucles y ajusta la velocidad de reproducción.
* **Sistema de Presets**: Guarda y carga tus configuraciones favoritas.
* **Análisis de Métricas**: Mide la calidad de la imagen con métricas como PSNR y SSIM.

## 🏗️ Nueva Arquitectura Modular (v7)

DitherLab v7 ha sido refactorizado para ser más robusto y fácil de mantener. La nueva arquitectura se basa en principios de software modernos:

* **Separación de Incumbencias**: Cada parte de la aplicación (UI, estado, renderizado, algoritmos) es ahora un módulo independiente.
* **Estado Centralizado**: Una única fuente de verdad gestiona todos los datos de la aplicación, eliminando inconsistencias.
* **Comunicación por Eventos**: Los módulos se comunican de forma desacoplada, lo que facilita la adición de nuevas funcionalidades sin romper las existentes.

Esto significa que DitherLab es ahora más rápido, más estable y está preparado para futuras mejoras.

## 🚀 Cómo Empezar

1.  **Arrastra un archivo**: Suelta una imagen o video en el panel lateral.
2.  **Elige un algoritmo**: Selecciona uno de los efectos de la lista. El más popular es **Floyd-Steinberg**.
3.  **Ajusta los controles**:
    * Modifica la cantidad de colores y la paleta.
    * Ajusta el brillo, contraste o la escala del efecto.
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

## 🎨 Algoritmos Disponibles

DitherLab incluye una selección curada de algoritmos de tramado, cada uno con una estética única:

#### Difusión de Error (Resultados suaves)
* **Floyd-Steinberg**: El más popular y equilibrado.
* **Jarvis-Judice-Ninke**: Más suave, ideal para gradientes.
* **Stucki**: Produce el tramado más limpio y de mayor calidad.
* **Atkinson**: Crea imágenes con alto contraste, icónico del Mac clásico.
* **Burkes**: Equilibrado y con buenos resultados en fotografías.
* **Sierra** & **Sierra-Lite**: Variantes rápidas con buena calidad.

#### Dithering Ordenado (Patrones geométricos)
* **Bayer**: Produce un patrón geométrico característico, de estilo retro y muy rápido.
* **Blue Noise**: Ofrece un tramado de alta calidad con una distribución más natural que Bayer.

#### Otros
* **Posterize**: Reduce los colores sin tramado, creando un efecto de "banding".

---