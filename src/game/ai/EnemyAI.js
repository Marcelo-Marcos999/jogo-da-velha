// Máquina de estados da IA inimiga.
// Estados: PATROL, DETECT, CHASE, ATTACK, RETREAT e DEAD.
// A IA dirige o casco/torre diretamente (movimento + mira) e usa o
// WeaponSystem para disparar respeitando a recarga.

import { resolveCircleAABB } from '../systems/MovementSystem.js';
import { ENEMY } from '../config.js';

export const AI_STATES = {
  PATROL: 'PATROL',
  DETECT: 'DETECT',
  CHASE: 'CHASE',
  ATTACK: 'ATTACK',
  RETREAT: 'RETREAT',
  DEAD: 'DEAD',
};

function normalizeAngle(angle) {
  let a = angle;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export class EnemyAI {
  constructor(enemy, { arena, weaponSystem, eventBus, config = ENEMY }) {
    this.enemy = enemy;
    this.arena = arena;
    this.weaponSystem = weaponSystem;
    this.eventBus = eventBus;
    this.config = config;

    this.state = AI_STATES.PATROL;
    this.waypoints = arena.getWaypoints();
    this.waypointIndex = Math.floor(Math.random() * this.waypoints.length);
    this.reactionTimer = 0;
    this.aimError = 0;
    this.aimErrorTimer = 0;
  }

  update(dt, player) {
    const enemy = this.enemy;
    if (!enemy.alive) {
      this._enterDead();
      return;
    }

    if (!player || !player.alive) {
      this._patrol(dt);
      return;
    }

    const dist = this._distanceTo(player);
    const canSee = this._canSee(player, dist);
    const lowHealth = enemy.health / enemy.maxHealth <= this.config.retreatHealthRatio;

    // Recuo: vida baixa e jogador por perto.
    if (
      lowHealth &&
      dist < this.config.retreatDistance &&
      this.state !== AI_STATES.RETREAT &&
      this.state !== AI_STATES.DEAD
    ) {
      this._setState(AI_STATES.RETREAT);
    }

    switch (this.state) {
      case AI_STATES.PATROL:
        if (canSee) this._setState(AI_STATES.DETECT);
        else this._patrol(dt);
        break;
      case AI_STATES.DETECT:
        this._detect(dt, player, canSee);
        break;
      case AI_STATES.CHASE:
        this._chase(dt, player, dist);
        break;
      case AI_STATES.ATTACK:
        this._attack(dt, player, dist, canSee);
        break;
      case AI_STATES.RETREAT:
        this._retreat(dt, player, dist);
        break;
      default:
        break;
    }
  }

  // ---- Estados -------------------------------------------------------------

  _patrol(dt) {
    this.weaponSystem.tick(this.enemy, dt);
    const wp = this.waypoints[this.waypointIndex];
    if (!wp) return;

    const dx = wp.x - this.enemy.position.x;
    const dz = wp.z - this.enemy.position.z;
    if (dx * dx + dz * dz <= this.config.waypointTolerance ** 2) {
      this.waypointIndex = (this.waypointIndex + 1) % this.waypoints.length;
    }
    this._steerTo(wp.x, wp.z, dt, 0.7);
    this._aimForward(dt);
  }

  _detect(dt, player, canSee) {
    this.weaponSystem.tick(this.enemy, dt);
    this._aimAt(player.position.x, player.position.z, dt);
    if (!canSee) {
      this._setState(AI_STATES.PATROL);
      return;
    }
    this.reactionTimer -= dt;
    if (this.reactionTimer <= 0) this._setState(AI_STATES.CHASE);
  }

  _chase(dt, player, dist) {
    this.weaponSystem.tick(this.enemy, dt);
    this._aimAt(player.position.x, player.position.z, dt);
    if (dist <= this.config.attackRange) {
      this._setState(AI_STATES.ATTACK);
      return;
    }
    this._steerTo(player.position.x, player.position.z, dt, 1);
  }

  _attack(dt, player, dist, canSee) {
    const enemy = this.enemy;
    this.weaponSystem.tick(enemy, dt);
    this._aimAt(player.position.x, player.position.z, dt);

    const aligned = Math.abs(this._aimDiff) <= this.config.aimTolerance;
    if (aligned && !enemy.reloading && enemy.reloadTimer <= 0) {
      this.weaponSystem.fire(enemy);
    }

    if (!canSee || dist > this.config.attackRange * 1.2) {
      this._setState(AI_STATES.CHASE);
    }
  }

  _retreat(dt, player, dist) {
    this.weaponSystem.tick(this.enemy, dt);
    // Busca cobertura: vai para o waypoint mais distante do jogador.
    const wp = this._farthestWaypointFrom(player.position);
    if (wp) this._steerTo(wp.x, wp.z, dt, 1);
    this._aimAt(player.position.x, player.position.z, dt);

    if (dist > this.config.retreatDistance) {
      this._setState(AI_STATES.CHASE);
    }
  }

  _enterDead() {
    if (this.state === AI_STATES.DEAD) return;
    this.state = AI_STATES.DEAD;
    this.enemy.speed = 0;
    this.eventBus.emit('inimigoDestruido', { tank: this.enemy });
  }

  // ---- Auxiliares ----------------------------------------------------------

  _setState(next) {
    if (this.state === next) return;
    this.state = next;
    if (next === AI_STATES.DETECT) this.reactionTimer = this.config.reactionTime;
    if (next === AI_STATES.ATTACK || next === AI_STATES.CHASE) this._refreshAimError();
  }

  _distanceTo(target) {
    const dx = target.position.x - this.enemy.position.x;
    const dz = target.position.z - this.enemy.position.z;
    return Math.hypot(dx, dz);
  }

  _canSee(player, dist) {
    if (dist > this.config.detectRange) return false;
    return this.arena.hasLineOfSight(this.enemy.position, player.position);
  }

  _farthestWaypointFrom(point) {
    let best = null;
    let bestDist = -1;
    for (const wp of this.waypoints) {
      const d = (wp.x - point.x) ** 2 + (wp.z - point.z) ** 2;
      if (d > bestDist) {
        bestDist = d;
        best = wp;
      }
    }
    return best;
  }

  _refreshAimError() {
    const imp = this.config.aimImprecision;
    this.aimError = (Math.random() * 2 - 1) * imp;
    this.aimErrorTimer = 0.6 + Math.random() * 0.8;
  }

  // Gira o casco em direção a um ponto e avança.
  _steerTo(targetX, targetZ, dt, throttle = 1) {
    const enemy = this.enemy;
    const dx = targetX - enemy.position.x;
    const dz = targetZ - enemy.position.z;
    const desiredYaw = Math.atan2(dx, dz);
    const diff = normalizeAngle(desiredYaw - enemy.yaw);
    const maxStep = enemy.profile.turnSpeed * dt;
    enemy.yaw += clamp(diff, -maxStep, maxStep);

    // Reduz a velocidade quando ainda está virando.
    const align = Math.abs(diff) < Math.PI / 2 ? 1 : 0.25;
    const speed = enemy.profile.speed * throttle * align;
    enemy.speed = speed;

    const fx = Math.sin(enemy.yaw);
    const fz = Math.cos(enemy.yaw);
    enemy.position.x += fx * speed * dt;
    enemy.position.z += fz * speed * dt;

    this._resolveCollisions();
    enemy.syncTransform();
  }

  // Mantém a torre alinhada com o casco (patrulha).
  _aimForward(dt) {
    const enemy = this.enemy;
    const diff = normalizeAngle(-enemy.turretYaw);
    const maxStep = enemy.profile.turretSpeed * dt;
    enemy.turretYaw += clamp(diff, -maxStep, maxStep);
  }

  // Mira no alvo com leve imprecisão; guarda o erro em this._aimDiff.
  _aimAt(targetX, targetZ, dt) {
    const enemy = this.enemy;
    this.aimErrorTimer -= dt;
    if (this.aimErrorTimer <= 0) this._refreshAimError();

    const dx = targetX - enemy.position.x;
    const dz = targetZ - enemy.position.z;
    const targetYaw = Math.atan2(dx, dz) + this.aimError;
    const diff = normalizeAngle(targetYaw - enemy.worldTurretYaw);
    this._aimDiff = diff;

    const maxStep = enemy.profile.turretSpeed * dt;
    enemy.turretYaw += clamp(diff, -maxStep, maxStep);
  }

  _resolveCollisions() {
    const enemy = this.enemy;
    const radius = enemy.radius;
    for (const collider of this.arena.colliders) {
      resolveCircleAABB(enemy.position, radius, collider);
    }
    const limit = this.arena.halfSize - radius;
    enemy.position.x = clamp(enemy.position.x, -limit, limit);
    enemy.position.z = clamp(enemy.position.z, -limit, limit);
  }
}
