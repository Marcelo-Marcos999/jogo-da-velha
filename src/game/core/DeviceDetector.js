// Detecção automática de dispositivo (Etapa 3).
// Considera mobile quando há suporte a toque E (tela estreita OU userAgent
// mobile). Reavalia em resize/orientação e emite 'device:changed'.

const MOBILE_UA = /Android|iPhone|iPad|iPod|Mobile|Windows Phone|Opera Mini/i;

export class DeviceDetector {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.isMobile = false;
    this.hasTouch = false;

    this._onChange = () => this.evaluate();
    window.addEventListener('resize', this._onChange);
    window.addEventListener('orientationchange', this._onChange);

    this.evaluate();
  }

  evaluate() {
    const hasTouch =
      'ontouchstart' in window ||
      (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0);
    const narrow = window.innerWidth <= 900;
    const uaMobile = MOBILE_UA.test(navigator.userAgent || '');
    const isMobile = hasTouch && (narrow || uaMobile);

    if (isMobile !== this.isMobile || hasTouch !== this.hasTouch) {
      this.isMobile = isMobile;
      this.hasTouch = hasTouch;
      this.eventBus.emit('device:changed', { isMobile, hasTouch });
    }
  }

  dispose() {
    window.removeEventListener('resize', this._onChange);
    window.removeEventListener('orientationchange', this._onChange);
  }
}
