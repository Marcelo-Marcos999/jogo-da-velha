// Áudio do jogo (Etapa 4): todos os sons são sintetizados via Web Audio API,
// sem arquivos externos nem dependências novas.
//
// O AudioContext só é criado após a primeira interação do usuário (exigência
// dos navegadores, inclusive no mobile). Volume e mute são persistidos em
// localStorage. O sistema escuta os eventos do EventBus e não conhece o resto
// do jogo.

import { AUDIO } from '../config.js';

export class AudioSystem {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.ctx = null; // criado apenas na primeira interação
    this.master = null;

    // Preferências persistidas.
    const stored = this._read();
    this.volume = stored.volume;
    this.muted = stored.muted;

    this._unsubs = [];
    this._bindEvents();
  }

  // ---- Preferências --------------------------------------------------------

  _read() {
    try {
      const raw = window.localStorage.getItem(AUDIO.storageKey);
      if (!raw) return { volume: AUDIO.defaultVolume, muted: false };
      const data = JSON.parse(raw);
      return {
        volume: Number.isFinite(data.volume) ? Math.max(0, Math.min(1, data.volume)) : AUDIO.defaultVolume,
        muted: !!data.muted,
      };
    } catch {
      return { volume: AUDIO.defaultVolume, muted: false };
    }
  }

  _persist() {
    try {
      window.localStorage.setItem(AUDIO.storageKey, JSON.stringify({ volume: this.volume, muted: this.muted }));
    } catch {
      /* localStorage indisponível: segue sem persistir */
    }
  }

  setVolume(value) {
    this.volume = Math.max(0, Math.min(1, Number(value) || 0));
    this._applyGain();
    this._persist();
  }

  setMuted(muted) {
    this.muted = !!muted;
    this._applyGain();
    this._persist();
  }

  toggleMuted() {
    this.setMuted(!this.muted);
  }

  _applyGain() {
    if (this.master) {
      this.master.gain.value = this.muted ? 0 : this.volume;
    }
  }

  // ---- Inicialização tardia ------------------------------------------------

  // Deve ser chamado na primeira interação (clique/toque/tecla). Se o contexto
  // já existe, apenas retoma (necessário após bloqueio em mobile).
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : this.volume;
    this.master.connect(this.ctx.destination);
  }

  // ---- Primitivas de síntese ----------------------------------------------

  _now() {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  // Oscilador com envelope simples (attack/decay exponencial).
  _tone({ type = 'square', freq = 440, endFreq = null, dur = 0.2, gain = 0.3, delay = 0 }) {
    if (!this.ctx || this.muted) return;
    const t = this._now() + delay;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (endFreq !== null) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), t + dur);
    }
    env.gain.setValueAtTime(gain, t);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(env).connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  // Ruído filtrado (impactos, explosões, fumaça).
  _noise({ dur = 0.25, gain = 0.3, filterFreq = 1200, filterType = 'lowpass', delay = 0, sweepTo = null }) {
    if (!this.ctx || this.muted) return;
    const t = this._now() + delay;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(filterFreq, t);
    if (sweepTo !== null) {
      filter.frequency.exponentialRampToValueAtTime(Math.max(20, sweepTo), t + dur);
    }
    const env = this.ctx.createGain();
    env.gain.setValueAtTime(gain, t);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter).connect(env).connect(this.master);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  // ---- Sons do jogo --------------------------------------------------------

  _sfxShot() {
    this._tone({ type: 'square', freq: 220, endFreq: 60, dur: 0.14, gain: 0.28 });
    this._noise({ dur: 0.12, gain: 0.22, filterFreq: 2400, sweepTo: 300 });
  }

  _sfxReloadStart() {
    this._tone({ type: 'triangle', freq: 160, endFreq: 110, dur: 0.12, gain: 0.16 });
  }

  _sfxReloadDone() {
    this._tone({ type: 'triangle', freq: 420, dur: 0.08, gain: 0.16 });
    this._tone({ type: 'triangle', freq: 620, dur: 0.1, gain: 0.16, delay: 0.09 });
  }

  _sfxWallHit() {
    this._noise({ dur: 0.14, gain: 0.2, filterFreq: 900, sweepTo: 200 });
    this._tone({ type: 'square', freq: 140, endFreq: 70, dur: 0.08, gain: 0.12 });
  }

  _sfxEnemyHit() {
    this._tone({ type: 'sawtooth', freq: 320, endFreq: 140, dur: 0.12, gain: 0.2 });
    this._noise({ dur: 0.1, gain: 0.14, filterFreq: 1800, sweepTo: 400 });
  }

  _sfxExplosion() {
    this._noise({ dur: 0.7, gain: 0.4, filterFreq: 900, sweepTo: 60 });
    this._tone({ type: 'sine', freq: 90, endFreq: 30, dur: 0.6, gain: 0.3 });
  }

  _sfxPlayerHurt() {
    this._tone({ type: 'sawtooth', freq: 180, endFreq: 70, dur: 0.22, gain: 0.24 });
    this._noise({ dur: 0.18, gain: 0.16, filterFreq: 700, sweepTo: 150 });
  }

  _sfxVictory() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => this._tone({ type: 'triangle', freq: f, dur: 0.22, gain: 0.2, delay: i * 0.14 }));
  }

  _sfxDefeat() {
    const notes = [392, 330, 262, 196];
    notes.forEach((f, i) => this._tone({ type: 'sawtooth', freq: f, dur: 0.3, gain: 0.18, delay: i * 0.18 }));
  }

  // ---- Eventos -------------------------------------------------------------

  _bindEvents() {
    const sub = (event, handler) => this._unsubs.push(this.eventBus.on(event, handler));

    sub('tiro', () => this._sfxShot());
    sub('recargaIniciada', () => this._sfxReloadStart());
    sub('recargaCompleta', () => this._sfxReloadDone());
    sub('impacto', ({ target }) => (target ? this._sfxEnemyHit() : this._sfxWallHit()));
    sub('tanqueMorto', () => this._sfxExplosion());
    sub('danoRecebido', ({ tank }) => {
      if (tank && tank.team === 'player') this._sfxPlayerHurt();
    });
    sub('jogo:vitoria', () => this._sfxVictory());
    sub('jogo:derrota', () => this._sfxDefeat());
  }

  dispose() {
    for (const unsub of this._unsubs) unsub();
    this._unsubs.length = 0;
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
      this.master = null;
    }
  }
}
