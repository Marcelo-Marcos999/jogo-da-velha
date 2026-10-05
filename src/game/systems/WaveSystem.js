// Sistema de ondas (Etapa 3).
// Controla a progressão das ondas: spawna inimigos em pontos válidos da arena
// (longe do jogador), aguarda a limpeza da onda, faz a contagem regressiva e
// inicia a próxima. Emite 'wave:started', 'wave:cleared', 'wave:countdown' e
// 'waves:completed'. Reaproveita EnemySystem/EnemyTank.

import { WAVES, ENEMY } from '../config.js';

export class WaveSystem {
  constructor({ enemySystem, arena, eventBus, config = WAVES }) {
    this.enemySystem = enemySystem;
    this.arena = arena;
    this.eventBus = eventBus;
    this.config = config;

    this.player = null;
    this.waveIndex = -1;
    this.phase = 'idle'; // idle | spawning | active | countdown | done
    this.pending = 0;
    this.spawnTimer = 0;
    this.countdown = 0;
    this.currentConfig = null;
    this._lastCountdownSecond = -1;

    this._unsubs = [];
    this._unsubs.push(
      this.eventBus.on('tanqueMorto', ({ tank }) => {
        if (tank && tank.team === 'enemy') this._onEnemyKilled();
      }),
    );
  }

  get totalWaves() {
    return this.config.total;
  }

  get currentWave() {
    return Math.max(0, this.waveIndex + 1);
  }

  // Inimigos ainda vivos + os que faltam nascer nesta onda.
  get enemiesRemaining() {
    return this.enemySystem.aliveCount() + this.pending;
  }

  get countdownSeconds() {
    return this.phase === 'countdown' ? Math.max(0, Math.ceil(this.countdown)) : 0;
  }

  start(player) {
    this.player = player;
    this.waveIndex = -1;
    this.pending = 0;
    this.countdown = 0;
    this.phase = 'idle';
    this._startNextWave();
  }

  reset() {
    this.player = null;
    this.waveIndex = -1;
    this.pending = 0;
    this.countdown = 0;
    this.phase = 'idle';
    this.currentConfig = null;
    this._lastCountdownSecond = -1;
  }

  update(dt) {
    switch (this.phase) {
      case 'spawning':
        this._updateSpawning(dt);
        break;
      case 'active':
        if (this.enemySystem.aliveCount() === 0) {
          this.eventBus.emit('wave:cleared', {
            wave: this.currentWave,
            total: this.totalWaves,
          });
          this.phase = 'countdown';
          this.countdown = this.config.countdown;
          this._lastCountdownSecond = -1;
        }
        break;
      case 'countdown':
        this._updateCountdown(dt);
        break;
      default:
        break;
    }
  }

  // ---- Interno -------------------------------------------------------------

  _updateSpawning(dt) {
    this.spawnTimer -= dt;
    if (this.pending > 0 && this.spawnTimer <= 0) {
      this._spawnOne();
      this.spawnTimer = this.currentConfig.spawnInterval;
    }
    if (this.pending <= 0) this.phase = 'active';
  }

  _updateCountdown(dt) {
    this.countdown -= dt;
    const second = Math.max(0, Math.ceil(this.countdown));
    if (second !== this._lastCountdownSecond) {
      this._lastCountdownSecond = second;
      this.eventBus.emit('wave:countdown', { seconds: second });
    }
    if (this.countdown <= 0) this._startNextWave();
  }

  _startNextWave() {
    this.waveIndex += 1;
    if (this.waveIndex >= this.totalWaves) {
      this.phase = 'done';
      this.eventBus.emit('waves:completed', { waves: this.totalWaves });
      return;
    }

    const wave = this._waveConfig(this.waveIndex);
    this.currentConfig = wave;
    this.pending = wave.enemies;
    this.spawnTimer = 0;
    this.phase = 'spawning';
    this.eventBus.emit('wave:started', {
      wave: this.currentWave,
      total: this.totalWaves,
      config: wave,
    });
  }

  _onEnemyKilled() {
    // Nada a fazer aqui além de deixar o update detectar a limpeza da onda.
    // Mantido como gancho para futuras regras (ex.: drops).
  }

  // Configuração da onda, escalando além das definidas em config.
  _waveConfig(index) {
    const list = this.config.waves;
    if (index < list.length) return list[index];
    const last = list[list.length - 1];
    const extra = index - list.length + 1;
    return {
      ...last,
      enemies: last.enemies + extra,
      healthMul: last.healthMul * (1 + 0.15 * extra),
      speedMul: last.speedMul * (1 + 0.05 * extra),
      fireRateMul: last.fireRateMul * (1 + 0.1 * extra),
    };
  }

  _spawnOne() {
    const points = this._validSpawnPoints();
    if (!points.length) {
      this.pending = 0;
      return;
    }
    const point = points[Math.floor(Math.random() * points.length)];
    this.enemySystem.spawnAt(point, this._scaledProfile(this.currentConfig));
    this.pending -= 1;
  }

  _scaledProfile(wave) {
    const base = ENEMY.profile;
    return {
      ...base,
      maxHealth: Math.round(base.maxHealth * wave.healthMul),
      speed: base.speed * wave.speedMul,
      reload: base.reload / wave.fireRateMul,
    };
  }

  _validSpawnPoints() {
    const minDist = ENEMY.spawnMinDistance;
    const player = this.player;
    const valid = this.arena.getSpawnPoints().filter((p) => {
      if (!player) return true;
      const dx = p.x - player.position.x;
      const dz = p.z - player.position.z;
      return dx * dx + dz * dz >= minDist * minDist;
    });

    for (let i = valid.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [valid[i], valid[j]] = [valid[j], valid[i]];
    }
    return valid;
  }

  dispose() {
    for (const unsub of this._unsubs) unsub();
    this._unsubs.length = 0;
  }
}
