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

    this.state = GAME_STATES.MENU;
    this.tanks = [];
    this.player = null;

    this._raf = null;
    this._running = false;
    this._hudAccumulator = 0;
    this._lastHitAt = 0;

    this._onStateChange = options.onStateChange || (() => {});
    this._onHud = options.onHud || (() => {});

    this._unsubs = [];
    this._unsubs.push(
      this.eventBus.on('tanqueMorto', ({ tank }) => {
        if (tank === this.player) {
          this.setState(GAME_STATES.DERROTA);
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

    this._loop = this._loop.bind(this);

    // Cria o mundo inicial (visível no MENU).
    this._resetWorld();
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
    if (this.player) this.player.dispose();
    this.arena.dispose();
    this.input.dispose();
    this.renderer.dispose();
    this.eventBus.clear();
  }

  // ---- Máquina de estados --------------------------------------------------

  setState(next) {
    if (this.state === next) return;
    this.state = next;
    this._onStateChange(next);
    this._emitHud();
  }

  startGame() {
    this._resetWorld();
    this.setState(GAME_STATES.JOGANDO);
  }

  pause() {
    if (this.state === GAME_STATES.JOGANDO) {
      this.setState(GAME_STATES.PAUSADO);
    }
  }

  resume() {
    if (this.state === GAME_STATES.PAUSADO) {
      this.setState(GAME_STATES.JOGANDO);
    }
  }

  togglePause() {
    if (this.state === GAME_STATES.JOGANDO) this.pause();
    else if (this.state === GAME_STATES.PAUSADO) this.resume();
  }

  // ---- Mundo ---------------------------------------------------------------

  _resetWorld() {
    this.projectileSystem.clear();

    if (this.player) {
      this.renderer.scene.remove(this.player.group);
      this.player.dispose();
    }

    this.player = new Tank(TANK_PROFILES.player, { x: 0, z: -22, yaw: 0 });
    this.renderer.scene.add(this.player.group);

    this.enemySystem.spawnInitial(this.player);
    this.tanks = [this.player, ...this.enemySystem.getTanks()];

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
    if (this.state === GAME_STATES.JOGANDO) {
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
      // 4) Câmera.
      this.cameraRig.update(player, dt);
    }
  }

  _handleGlobalInput() {
    if (this.input.consumeKey('Escape') || this.input.consumeKey('KeyP')) {
      this.togglePause();
    }

    if (this.state === GAME_STATES.MENU && this.input.consumeKey('Enter')) {
      this.startGame();
    }

    if (
      (this.state === GAME_STATES.DERROTA || this.state === GAME_STATES.VITORIA) &&
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
      lastHitAt: this._lastHitAt,
    });
  }
}
