// Classe central: loop (requestAnimationFrame + delta time), máquina de estados
// e orquestração dos sistemas. Ponto único de extensão para novas fases/modos.

import { Renderer } from './Renderer.js';
import { Input } from './Input.js';
import { Time } from './Time.js';
import { EventBus } from './EventBus.js';
import { Arena } from '../world/Arena.js';
import { Tank } from '../entities/Tank.js';
import { MovementSystem } from '../systems/MovementSystem.js';
import { AimSystem } from '../systems/AimSystem.js';
import { WeaponSystem } from '../systems/WeaponSystem.js';
import { ProjectileSystem } from '../systems/ProjectileSystem.js';
import { HealthSystem } from '../systems/HealthSystem.js';
import { DamageSystem } from '../systems/DamageSystem.js';
import { EnemySystem } from '../systems/EnemySystem.js';
import { CameraRig } from '../systems/CameraRig.js';
import { WaveSystem } from '../systems/WaveSystem.js';
import { ScoreSystem } from '../systems/ScoreSystem.js';
import { EffectsSystem } from '../systems/EffectsSystem.js';
import { GameState } from './GameState.js';
import { DeviceDetector } from './DeviceDetector.js';
import { GAME_STATES, TANK_PROFILES, FIXED_STEP } from '../config.js';

export class Game {
  constructor(container, options = {}) {
    this.container = container;
    this.options = options;

    this.eventBus = new EventBus();
    this.renderer = new Renderer(container);
    this.input = new Input(this.renderer.domElement);
    this.time = new Time(FIXED_STEP);

    this.arena = new Arena();
    this.renderer.scene.add(this.arena.group);

    this.cameraRig = new CameraRig(this.renderer.camera);
    this.movementSystem = new MovementSystem(this.arena);
    this.aimSystem = new AimSystem(this.renderer);
    this.healthSystem = new HealthSystem(this.eventBus);
    this.damageSystem = new DamageSystem(this.healthSystem, this.eventBus);
    this.projectileSystem = new ProjectileSystem(
      this.renderer.scene,
      this.arena,
      this.damageSystem,
      this.eventBus,
    );
    this.weaponSystem = new WeaponSystem(this.projectileSystem, this.eventBus);
    this.enemySystem = new EnemySystem(
      this.renderer.scene,
      this.arena,
      this.weaponSystem,
      this.eventBus,
    );

    // Etapa 3: ondas, pontuação, efeitos, estados e detecção de dispositivo.
    this.waveSystem = new WaveSystem({
      enemySystem: this.enemySystem,
      arena: this.arena,
      eventBus: this.eventBus,
    });
    this.scoreSystem = new ScoreSystem(this.eventBus);
    this.effectsSystem = new EffectsSystem(this.renderer.scene, this.eventBus);
    this.gameState = new GameState(GAME_STATES.MENU);
    this.deviceDetector = new DeviceDetector(this.eventBus);

    this.tanks = [];
    this.player = null;
    this.isMobile = this.deviceDetector.isMobile;
    this._score = { score: 0, highScore: this.scoreSystem.highScore, accuracy: 0, kills: 0 };

    this._raf = null;
    this._running = false;
    this._hudAccumulator = 0;
    this._lastHitAt = 0;

    this._onStateChange = options.onStateChange || (() => {});
    this._onHud = options.onHud || (() => {});

    this._unsubs = [];
    this._unsubs.push(
      this.gameState.onChange((next) => {
        this._onStateChange(next);
        this._emitHud();
      }),
    );
    this._unsubs.push(
      this.eventBus.on('tanqueMorto', ({ tank }) => {
        if (tank === this.player) {
          this.scoreSystem.finalize();
          this.gameState.set(GAME_STATES.DERROTA);
        }
      }),
    );
    this._unsubs.push(
      this.eventBus.on('danoRecebido', ({ tank }) => {
        if (tank === this.player) {
          this._lastHitAt = performance.now();
        }
      }),
    );
    this._unsubs.push(
      this.eventBus.on('waves:completed', () => {
        if (this.gameState.is(GAME_STATES.JOGANDO)) {
          this.scoreSystem.finalize();
          this.gameState.set(GAME_STATES.VITORIA);
        }
      }),
    );
    this._unsubs.push(
      this.eventBus.on('score:changed', (payload) => {
        this._score = payload;
        this._emitHud();
      }),
    );
    this._unsubs.push(
      this.eventBus.on('device:changed', ({ isMobile }) => {
        this.isMobile = isMobile;
        this._emitHud();
      }),
    );

    this._loop = this._loop.bind(this);

    // Cria o mundo inicial (visível no MENU).
    this._resetWorld();
  }

  // Estado atual (string) — mantém a API anterior baseada em GAME_STATES.
  get state() {
    return this.gameState.get();
  }

  // ---- Ciclo de vida -------------------------------------------------------

  start() {
    if (this._running) return;
    this._running = true;
    this.time.start(performance.now());
    this._raf = requestAnimationFrame(this._loop);
  }

  stop() {
    this._running = false;
    if (this._raf !== null) {
      cancelAnimationFrame(this._raf);
      this._raf = null;
    }
  }

  dispose() {
    this.stop();
    for (const unsub of this._unsubs) unsub();
    this._unsubs.length = 0;
    this.projectileSystem.clear();
    this.enemySystem.clear();
    this.effectsSystem.dispose();
    this.waveSystem.dispose();
    this.scoreSystem.dispose();
    this.deviceDetector.dispose();
    this.gameState.clear();
    if (this.player) this.player.dispose();
    this.arena.dispose();
    this.input.dispose();
    this.renderer.dispose();
    this.eventBus.clear();
  }

  // ---- Máquina de estados --------------------------------------------------

  setState(next) {
    this.gameState.set(next);
  }

  startGame() {
    this._resetWorld();
    this.scoreSystem.start();
    this.gameState.set(GAME_STATES.JOGANDO);
    this.waveSystem.start(this.player);
    this._emitHud();
  }

  pause() {
    if (this.gameState.is(GAME_STATES.JOGANDO)) {
      this.gameState.set(GAME_STATES.PAUSADO);
    }
  }

  resume() {
    if (this.gameState.is(GAME_STATES.PAUSADO)) {
      this.gameState.set(GAME_STATES.JOGANDO);
    }
  }

  togglePause() {
    if (this.gameState.is(GAME_STATES.JOGANDO)) this.pause();
    else if (this.gameState.is(GAME_STATES.PAUSADO)) this.resume();
  }

  // ---- Mundo ---------------------------------------------------------------

  _resetWorld() {
    this.projectileSystem.clear();
    this.enemySystem.clear();
    this.effectsSystem.clear();
    this.waveSystem.reset();
    this.scoreSystem.reset();
    this.input.clearTouch();

    if (this.player) {
      this.renderer.scene.remove(this.player.group);
      this.player.dispose();
    }

    this.player = new Tank(TANK_PROFILES.player, { x: 0, z: -22, yaw: 0 });
    this.renderer.scene.add(this.player.group);

    this.tanks = [this.player];
    this._lastHitAt = 0;

    this.cameraRig.snap(this.player);
    this._emitHud();
  }

  // ---- Loop ----------------------------------------------------------------

  _loop(now) {
    if (!this._running) return;
    this._raf = requestAnimationFrame(this._loop);

    this.time.update(now);
    this.time.consumeFixedSteps((dt) => this._fixedUpdate(dt));

    this._handleGlobalInput();
    this.renderer.render();
    this._updateHud(this.time.delta);
    this.input.endFrame();
  }

  _fixedUpdate(dt) {
    if (this.gameState.is(GAME_STATES.JOGANDO)) {
      const player = this.player;
      // 1) Input do jogador (movimento, mira, tiro).
      if (player && player.alive) {
        this.movementSystem.update(player, this.input, dt);
        this.aimSystem.update(player, this.input, dt);
        this.weaponSystem.update(player, this.input, dt);
      }
      // 2) IA + movimento/colisão dos inimigos.
      this.enemySystem.update(dt, player);
      // 3) Projéteis e dano (lista de tanques atualizada a cada passo).
      const tanks = [player, ...this.enemySystem.getTanks()];
      this.tanks = tanks;
      this.projectileSystem.update(dt, tanks);
      this.damageSystem.update(dt, tanks);
      // 4) Ondas (spawn/limpeza/contagem).
      this.waveSystem.update(dt);
      // 5) Câmera.
      this.cameraRig.update(player, dt);
    }

    // Efeitos continuam animando mesmo em pausa/vitória/derrota.
    this.effectsSystem.update(dt);
  }

  _handleGlobalInput() {
    if (this.input.consumeKey('Escape') || this.input.consumeKey('KeyP')) {
      this.togglePause();
    }

    if (this.gameState.is(GAME_STATES.MENU) && this.input.consumeKey('Enter')) {
      this.startGame();
    }

    if (
      (this.gameState.is(GAME_STATES.DERROTA) || this.gameState.is(GAME_STATES.VITORIA)) &&
      (this.input.consumeKey('KeyR') || this.input.consumeKey('Enter'))
    ) {
      this.startGame();
    }
  }

  // ---- HUD -----------------------------------------------------------------

  _updateHud(delta) {
    this._hudAccumulator += delta;
    if (this._hudAccumulator < 0.1) return;
    this._hudAccumulator = 0;
    this._emitHud();
  }

  // Indica se a mira atual aponta para um inimigo vivo (reticência de alvo).
  _aimValid() {
    const p = this.player;
    if (!p || !this.aimSystem.hasTarget) return false;
    const point = this.aimSystem.point;
    for (const enemy of this.enemySystem.getTanks()) {
      if (!enemy.alive) continue;
      const dx = enemy.position.x - point.x;
      const dz = enemy.position.z - point.z;
      const r = enemy.radius + 1.5;
      if (dx * dx + dz * dz <= r * r) return true;
    }
    return false;
  }

  _emitHud() {
    const p = this.player;
    this._onHud({
      state: this.state,
      health: p ? Math.max(0, Math.round(p.health)) : 0,
      maxHealth: p ? p.maxHealth : 0,
      ammo: p ? p.ammo : 0,
      magazine: p ? p.profile.magazine : 0,
      reloading: p ? p.reloading : false,
      reloadProgress: p ? p.reloadProgress : 0,
      enemies: this.enemySystem.aliveCount(),
      enemiesRemaining: this.waveSystem.enemiesRemaining,
      wave: this.waveSystem.currentWave,
      totalWaves: this.waveSystem.totalWaves,
      countdown: this.waveSystem.countdownSeconds,
      score: this._score.score,
      highScore: this._score.highScore,
      accuracy: this._score.accuracy,
      kills: this._score.kills,
      aimValid: this._aimValid(),
      isMobile: this.isMobile,
      lastHitAt: this._lastHitAt,
    });
  }
}
