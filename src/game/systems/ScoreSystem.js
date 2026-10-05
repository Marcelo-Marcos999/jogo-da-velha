// Pontuação e progressão de sessão (Etapa 3).
// Soma pontos por inimigo destruído, bônus por onda concluída e bônus por
// precisão (acertos / disparos). Persiste o recorde em localStorage com chave
// versionada e emite 'score:changed' / 'score:highscore'.

import { SCORE } from '../config.js';

export class ScoreSystem {
  constructor(eventBus, config = SCORE) {
    this.eventBus = eventBus;
    this.config = config;

    this.score = 0;
    this.highScore = this._loadHighScore();
    this.shotsFired = 0;
    this.shotsHit = 0;
    this.kills = 0;
    this.active = false;

    this._unsubs = [];
    this._unsubs.push(
      this.eventBus.on('tiro', ({ tank }) => {
        if (this.active && tank && tank.team === 'player') this.shotsFired += 1;
      }),
    );
    this._unsubs.push(
      this.eventBus.on('danoAplicado', ({ target, source }) => {
        if (
          this.active &&
          source &&
          source.team === 'player' &&
          target &&
          target.team === 'enemy'
        ) {
          this.shotsHit += 1;
        }
      }),
    );
    this._unsubs.push(
      this.eventBus.on('tanqueMorto', ({ tank }) => {
        if (!this.active || !tank || tank.team !== 'enemy') return;
        const value =
          this.config.enemyValue[tank.profile.id] ?? this.config.enemyValue.default;
        this.kills += 1;
        this._add(value);
      }),
    );
    this._unsubs.push(
      this.eventBus.on('wave:cleared', ({ wave }) => {
        if (!this.active) return;
        this._add(this.config.waveBonus * wave);
      }),
    );
  }

  get accuracy() {
    if (this.shotsFired <= 0) return 0;
    return Math.min(1, this.shotsHit / this.shotsFired);
  }

  // Inicia uma sessão de pontuação (chamado ao começar/reiniciar o jogo).
  start() {
    this.score = 0;
    this.shotsFired = 0;
    this.shotsHit = 0;
    this.kills = 0;
    this.active = true;
    this._emitChanged();
  }

  reset() {
    this.score = 0;
    this.shotsFired = 0;
    this.shotsHit = 0;
    this.kills = 0;
    this.active = false;
    this._emitChanged();
  }

  // Encerra a sessão: aplica bônus de precisão e atualiza o recorde.
  finalize() {
    if (!this.active) return;
    this.active = false;

    const bonus = Math.round(this.accuracy * this.config.accuracyBonus);
    if (bonus > 0) this._add(bonus);

    if (this.score > this.highScore) {
      this.highScore = this.score;
      this._saveHighScore();
      this.eventBus.emit('score:highscore', { highScore: this.highScore });
    }
    this._emitChanged();
  }

  _add(amount) {
    this.score += amount;
    this._emitChanged();
  }

  _emitChanged() {
    this.eventBus.emit('score:changed', {
      score: this.score,
      highScore: this.highScore,
      accuracy: this.accuracy,
      kills: this.kills,
      shotsFired: this.shotsFired,
      shotsHit: this.shotsHit,
    });
  }

  _loadHighScore() {
    try {
      const raw = window.localStorage.getItem(this.config.storageKey);
      const value = raw ? parseInt(raw, 10) : 0;
      return Number.isFinite(value) && value > 0 ? value : 0;
    } catch (err) {
      return 0;
    }
  }

  _saveHighScore() {
    try {
      window.localStorage.setItem(this.config.storageKey, String(this.highScore));
    } catch (err) {
      // localStorage indisponível (modo privado): ignora silenciosamente.
    }
  }

  dispose() {
    for (const unsub of this._unsubs) unsub();
    this._unsubs.length = 0;
  }
}
