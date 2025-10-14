/**
 * @file PlaybackManager.js
 * @description Gestiona el estado de reproducción del medio (play, pause, seek, velocidad).
 */
import { store } from '../core/Store.js';
import { eventBus } from '../core/EventBus.js';

export class PlaybackManager {
  constructor() {
    this.animationFrameId = null;

    eventBus.subscribe('playback:toggle', () => this.togglePlay());
    eventBus.subscribe('playback:play', () => this.play());
    eventBus.subscribe('playback:pause', () => this.pause());
    eventBus.subscribe('playback:restart', () => this.seekTime(0));
    eventBus.subscribe('playback:seek', (percent) => this.seekPercent(percent));
    eventBus.subscribe('playback:seek-time', (time) => this.seekTime(time));
    eventBus.subscribe('playback:set-speed', (speed) => this.setSpeed(speed));
    eventBus.subscribe('playback:step-frame', (direction) => this.stepFrame(direction));
    eventBus.subscribe('playback:start-recording', (options) => this.handleStartRecording(options));
  }

  getMediaInstance() {
    return store.getState().media.instance;
  }

  togglePlay() {
    const isPlaying = store.getState().playback.isPlaying;
    if (isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  play() {
    const media = this.getMediaInstance();
    if (media && media.elt && typeof media.elt.play === 'function') {
      media.loop(); // Usamos loop() de p5 para reproducción continua
      store.setState({ playback: { isPlaying: true } });
      this.startPlaybackLoop();
    }
  }

  pause() {
    const media = this.getMediaInstance();
    if (media && media.elt && typeof media.elt.pause === 'function') {
      media.pause();
      store.setState({ playback: { isPlaying: false } });
      this.stopPlaybackLoop();
    }
  }

  seekPercent(percent) {
    const media = this.getMediaInstance();
    const duration = store.getState().media.duration;
    if (media && duration > 0) {
      this.seekTime(percent * duration);
    }
  }
  
  seekTime(time) {
    const media = this.getMediaInstance();
    const duration = store.getState().media.duration;
    if (media) {
      const clampedTime = Math.max(0, Math.min(time, duration));
      media.time(clampedTime);
      // Actualizar el estado para que la UI reaccione
      store.setKey('playback.currentTime', clampedTime);
    }
  }

  setSpeed(speed) {
    const media = this.getMediaInstance();
    if (media) {
      media.speed(speed);
      store.setKey('playback.speed', speed);
    }
  }
  
  stepFrame(direction) {
    this.pause();
    const media = this.getMediaInstance();
    if (media) {
        const newTime = media.time() + (direction * (1/30)); // Asumimos 30fps
        this.seekTime(newTime);
    }
  }

  handleStartRecording({ useMarkers }) {
    const { timeline } = store.getState();
    let startTime = 0;
    if (useMarkers && timeline.markerInTime !== null) {
        startTime = timeline.markerInTime;
    }
    this.seekTime(startTime);
    this.play();
  }

  // Bucle para actualizar la UI con el tiempo de reproducción actual
  startPlaybackLoop() {
    const update = () => {
      const media = this.getMediaInstance();
      if (media && store.getState().playback.isPlaying) {
        store.setKey('playback.currentTime', media.time());
        this.animationFrameId = requestAnimationFrame(update);
      }
    };
    this.animationFrameId = requestAnimationFrame(update);
  }

  stopPlaybackLoop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
}
