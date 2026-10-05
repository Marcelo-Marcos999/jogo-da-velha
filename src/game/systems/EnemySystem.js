// Cria, atualiza e remove inimigos. Faz o spawn em pontos válidos da arena
// (fora de obstáculos e a uma distância mínima do jogador).

import { EnemyTank } from '../entities/EnemyTank.js';
import { EnemyAI } from '../ai/EnemyAI.js';
import { ENEMY } from '../config.js';

export class EnemySystem {
  constructor(scene, arena, weaponSystem, eventBus, config = ENEMY) {
    this.scene = scene;
    this.arena = arena;
    this.weaponSystem = weaponSystem;
    this.eventBus = eventBus;
    this.config = config;
    this.enemies = [];
    this._deathTimers = new Map();
  }

  // Cria a leva inicial de inimigos, longe do jogador.
  spawnInitial(player) {
    this.clear();
    const points = this._validSpawnPoints(player);
    const count = Math.min(this.config.count, points.length);
    for (let i = 0; i < count; i++) {
      this.spawnAt(points[i]);
    }
  }

  // Cria um inimigo em um ponto. Aceita um perfil alternativo (usado pelo
  // WaveSystem para aplicar os multiplicadores de dificuldade da onda).
  spawnAt(point, profileOverride = null) {
    const enemy = new EnemyTank(profileOverride || this.config.profile, {
      x: point.x,
      z: point.z,
      yaw: Math.random() * Math.PI * 2,
    });
    enemy.ai = new EnemyAI(enemy, {
      arena: this.arena,
      weaponSystem: this.weaponSystem,
      eventBus: this.eventBus,
      config: this.config,
    });
    this.scene.add(enemy.group);
    this.enemies.push(enemy);
    this.eventBus.emit('inimigoSpawnado', { tank: enemy });
    return enemy;
  }

  update(dt, player) {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      if (enemy.alive) {
        enemy.ai.update(dt, player);
      } else {
        // Mantém o destroço por um tempo e depois remove.
        const t = (this._deathTimers.get(enemy) || 0) + dt;
        this._deathTimers.set(enemy, t);
        if (t >= this.config.deathLinger) this._remove(i);
      }
    }
  }

  _validSpawnPoints(player) {
    const minDist = this.config.spawnMinDistance;
    const valid = this.arena.getSpawnPoints().filter((p) => {
      if (!player) return true;
      const dx = p.x - player.position.x;
      const dz = p.z - player.position.z;
      return dx * dx + dz * dz >= minDist * minDist;
    });

    // Embaralha para variar as posições a cada partida.
    for (let i = valid.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [valid[i], valid[j]] = [valid[j], valid[i]];
    }
    return valid;
  }

  _remove(index) {
    const enemy = this.enemies[index];
    this.scene.remove(enemy.group);
    enemy.dispose();
    this._deathTimers.delete(enemy);
    this.enemies.splice(index, 1);
  }

  aliveCount() {
    let n = 0;
    for (const e of this.enemies) if (e.alive) n++;
    return n;
  }

  getTanks() {
    return this.enemies;
  }

  clear() {
    for (const enemy of this.enemies) {
      this.scene.remove(enemy.group);
      enemy.dispose();
    }
    this.enemies.length = 0;
    this._deathTimers.clear();
  }
}
