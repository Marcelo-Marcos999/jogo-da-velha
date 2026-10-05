// Aplica o input ao tanque do jogador: movimento relativo à orientação,
// aceleração/desaceleração, rotação do casco e resolução de colisão
// (círculo contra AABB) com o mundo.

import * as THREE from 'three';

const _forward = new THREE.Vector3();

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function approach(current, target, maxDelta) {
  if (current < target) return Math.min(current + maxDelta, target);
  if (current > target) return Math.max(current - maxDelta, target);
  return current;
}

// Empurra um círculo (pos, radius) para fora de uma AABB. Retorna true se colidiu.
export function resolveCircleAABB(pos, radius, box) {
  const closestX = clamp(pos.x, box.minX, box.maxX);
  const closestZ = clamp(pos.z, box.minZ, box.maxZ);
  const dx = pos.x - closestX;
  const dz = pos.z - closestZ;
  const distSq = dx * dx + dz * dz;

  if (distSq > radius * radius) return false;

  const dist = Math.sqrt(distSq);
  if (dist < 1e-6) {
    // Centro dentro da caixa: empurra pelo eixo de menor penetração.
    const toLeft = pos.x - box.minX;
    const toRight = box.maxX - pos.x;
    const toBack = pos.z - box.minZ;
    const toFront = box.maxZ - pos.z;
    const min = Math.min(toLeft, toRight, toBack, toFront);
    if (min === toLeft) pos.x = box.minX - radius;
    else if (min === toRight) pos.x = box.maxX + radius;
    else if (min === toBack) pos.z = box.minZ - radius;
    else pos.z = box.maxZ + radius;
    return true;
  }

  const push = (radius - dist) / dist;
  pos.x += dx * push;
  pos.z += dz * push;
  return true;
}

export class MovementSystem {
  constructor(arena) {
    this.arena = arena;
  }

  update(tank, input, dt) {
    if (!tank.alive) return;
    const profile = tank.profile;

    // Rotação do casco (A/D ou setas).
    const steer = input.getSteer();
    tank.yaw += steer * profile.turnSpeed * dt;

    // Aceleração / desaceleração.
    const throttle = input.getThrottle();
    const targetSpeed = throttle * profile.speed;
    const rate = throttle !== 0 ? profile.acceleration : profile.deceleration;
    tank.speed = approach(tank.speed, targetSpeed, rate * dt);

    // Movimento relativo à orientação do casco.
    _forward.set(Math.sin(tank.yaw), 0, Math.cos(tank.yaw));
    tank.velocity.copy(_forward).multiplyScalar(tank.speed);
    tank.position.addScaledVector(_forward, tank.speed * dt);

    this._resolveCollisions(tank);
    tank.syncTransform();
  }

  _resolveCollisions(tank) {
    const radius = tank.radius;
    for (const collider of this.arena.colliders) {
      resolveCircleAABB(tank.position, radius, collider);
    }
    // Trava de segurança nos limites da arena.
    const limit = this.arena.halfSize - radius;
    tank.position.x = clamp(tank.position.x, -limit, limit);
    tank.position.z = clamp(tank.position.z, -limit, limit);
  }
}
