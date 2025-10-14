/**
 * @file TimelineController.js
 * @description Gestiona la lógica de los marcadores de la línea de tiempo (in/out).
 */
import { store } from '../core/Store.js';
import { eventBus } from '../core/EventBus.js';

export class TimelineController {
  constructor() {
    eventBus.subscribe('timeline:set-marker', (type) => this.setMarker(type));
    eventBus.subscribe('timeline:clear-markers', () => this.clearMarkers());
    eventBus.subscribe('timeline:drag-marker', (payload) => this.dragMarker(payload));
    eventBus.subscribe('media:load-file', () => this.clearMarkers()); // Reset en carga
  }

  setMarker(type) {
    const { playback, timeline } = store.getState();
    const currentTime = playback.currentTime;
    
    if (type === 'in') {
        // El marcador de entrada no puede ser posterior al de salida
        if (timeline.markerOutTime !== null && currentTime > timeline.markerOutTime) {
            store.setState({ timeline: { markerInTime: timeline.markerOutTime, markerOutTime: currentTime } });
        } else {
            store.setKey('timeline.markerInTime', currentTime);
        }
    } else if (type === 'out') {
        // El marcador de salida no puede ser anterior al de entrada
        if (timeline.markerInTime !== null && currentTime < timeline.markerInTime) {
            store.setState({ timeline: { markerInTime: currentTime, markerOutTime: timeline.markerInTime } });
        } else {
            store.setKey('timeline.markerOutTime', currentTime);
        }
    }
  }

  clearMarkers() {
    store.setState({
      timeline: {
        markerInTime: null,
        markerOutTime: null,
      }
    });
  }

  dragMarker({ marker, percent }) {
    const duration = store.getState().media.duration;
    if (duration <= 0) return;
    
    const time = percent * duration;
    
    // Validar para que los marcadores no se crucen
    const { markerInTime, markerOutTime } = store.getState().timeline;
    
    if (marker === 'in') {
        const newInTime = (markerOutTime !== null) ? Math.min(time, markerOutTime) : time;
        store.setKey('timeline.markerInTime', newInTime);
    } else if (marker === 'out') {
        const newOutTime = (markerInTime !== null) ? Math.max(time, markerInTime) : time;
        store.setKey('timeline.markerOutTime', newOutTime);
    }
  }
}
