// Máquina de estados do jogo (Etapa 3).
// Estados: MENU, JOGANDO, PAUSADO, VITORIA, DERROTA.
// Mantém o estado atual e notifica observadores em cada transição, sem
// acoplamento com o restante do núcleo.

import { GAME_STATES } from '../config.js';

export { GAME_STATES };

export class GameState {
  constructor(initial = GAME_STATES.MENU) {
    this.current = initial;
    this._listeners = new Set();
  }

  get() {
    return this.current;
  }

  is(state) {
    return this.current === state;
  }

  // Define um novo estado. Retorna true se houve transição.
  set(next) {
    if (this.current === next) return false;
    this.current = next;
    for (const fn of this._listeners) fn(next);
    return true;
  }

  // Registra um observador; retorna a função de cancelamento.
  onChange(handler) {
    this._listeners.add(handler);
    return () => this._listeners.delete(handler);
  }

  clear() {
    this._listeners.clear();
  }
}
