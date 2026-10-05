// Barramento de eventos simples (pub/sub).
// Permite que os sistemas se comuniquem sem acoplamento direto.
// Eventos previstos nesta etapa: 'tiro', 'danoRecebido', 'tanqueMorto',
// 'recargaIniciada', 'recargaCompleta'.

export class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  on(event, handler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(handler);
    return () => this.off(event, handler);
  }

  off(event, handler) {
    const set = this.listeners.get(event);
    if (set) set.delete(handler);
  }

  emit(event, payload) {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const handler of set) {
      handler(payload);
    }
  }

  clear() {
    this.listeners.clear();
  }
}
