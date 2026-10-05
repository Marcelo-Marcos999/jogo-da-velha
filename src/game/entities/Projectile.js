// Projétil: esfera/cápsula com velocidade, tempo de vida, dono e dano.

import * as THREE from 'three';

export class Projectile {
  constructor({ position, direction, speed, damage, owner, life, radius }) {
    this.position = position.clone();
    this.velocity = direction.clone().normalize().multiplyScalar(speed);
    this.damage = damage;
    this.owner = owner;
    this.team = owner && owner.team ? owner.team : 'player';
    this.life = life;
    this.maxLife = life;
    this.radius = radius;
    this.alive = true;

    const isEnemy = this.team === 'enemy';
    const geo = new THREE.SphereGeometry(radius, 10, 10);
    const mat = new THREE.MeshStandardMaterial({
      color: isEnemy ? 0xff7043 : 0xffd54f,
      emissive: isEnemy ? 0xd84315 : 0xff9800,
      emissiveIntensity: 1.2,
      roughness: 0.4,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.copy(this.position);
    this.mesh.castShadow = true;
  }

  update(dt) {
    this.position.addScaledVector(this.velocity, dt);
    this.life -= dt;
    this.mesh.position.copy(this.position);
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
