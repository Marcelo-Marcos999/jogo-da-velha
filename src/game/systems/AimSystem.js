// Converte a posição do mouse em um ponto no plano do chão (raycast) e faz a
// torre do tanque apontar para ele, respeitando um limite de velocidade.

import * as THREE from 'three';

function normalizeAngle(angle) {
  let a = angle;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export class AimSystem {
  constructor(renderer) {
    this.renderer = renderer;
    this.raycaster = new THREE.Raycaster();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.ndc = new THREE.Vector2();
    this.point = new THREE.Vector3();
    this.hasTarget = false;
  }

  update(tank, input, dt) {
    if (!tank.alive) return;

    this.ndc.set(input.mouse.ndcX, input.mouse.ndcY);
    this.raycaster.setFromCamera(this.ndc, this.renderer.camera);

    const hit = this.raycaster.ray.intersectPlane(this.groundPlane, this.point);
    this.hasTarget = !!hit;
    if (!hit) return;

    const dx = this.point.x - tank.position.x;
    const dz = this.point.z - tank.position.z;
    if (dx * dx + dz * dz < 1e-4) return;

    const targetWorldYaw = Math.atan2(dx, dz);
    const diff = normalizeAngle(targetWorldYaw - tank.worldTurretYaw);
    const maxStep = tank.profile.turretSpeed * dt;
    tank.turretYaw += clamp(diff, -maxStep, maxStep);
  }
}
