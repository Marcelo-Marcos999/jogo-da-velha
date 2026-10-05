// Integra o movimento dos projéteis, detecta colisão com obstáculos e com
// tanques, aplica dano e remove o projétil com um efeito simples de impacto.

import * as THREE from 'three';

export class ProjectileSystem {
  constructor(scene, arena, healthSystem, eventBus) {
    this.scene = scene;
    this.arena = arena;
    this.healthSystem = healthSystem;
    this.eventBus = eventBus;
    this.projectiles = [];
    this.impacts = [];
  }

  spawn(projectile) {
    this.projectiles.push(projectile);
    this.scene.add(projectile.mesh);
    return projectile;
  }

  update(dt, tanks) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.update(dt);

      let dead = false;

      // Colisão com o mundo (paredes/obstáculos).
      if (this.arena.hitsCollider(p.position, p.radius)) {
        this._spawnImpact(p.position);
        dead = true;
      }

      // Colisão com tanques (ignora o dono).
      if (!dead) {
        for (const tank of tanks) {
          if (!tank.alive || tank === p.owner) continue;
          const dx = tank.position.x - p.position.x;
          const dz = tank.position.z - p.position.z;
          const rr = tank.radius + p.radius;
          if (dx * dx + dz * dz <= rr * rr) {
            this.healthSystem.applyDamage(tank, p.damage, p.owner);
            this._spawnImpact(p.position);
            dead = true;
            break;
          }
        }
      }

      if (p.life <= 0) dead = true;

      if (dead) {
        this._removeProjectile(i);
      }
    }

    this._updateImpacts(dt);
  }

  _removeProjectile(index) {
    const p = this.projectiles[index];
    this.scene.remove(p.mesh);
    p.dispose();
    this.projectiles.splice(index, 1);
  }

  _spawnImpact(position) {
    const geo = new THREE.SphereGeometry(0.4, 8, 8);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffcc33,
      transparent: true,
      opacity: 0.9,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(position);
    this.scene.add(mesh);
    this.impacts.push({ mesh, life: 0.35, maxLife: 0.35 });
  }

  _updateImpacts(dt) {
    for (let i = this.impacts.length - 1; i >= 0; i--) {
      const imp = this.impacts[i];
      imp.life -= dt;
      const t = Math.max(0, imp.life / imp.maxLife);
      imp.mesh.scale.setScalar(1 + (1 - t) * 2.5);
      imp.mesh.material.opacity = t * 0.9;
      if (imp.life <= 0) {
        this.scene.remove(imp.mesh);
        imp.mesh.geometry.dispose();
        imp.mesh.material.dispose();
        this.impacts.splice(i, 1);
      }
    }
  }

  clear() {
    for (const p of this.projectiles) {
      this.scene.remove(p.mesh);
      p.dispose();
    }
    this.projectiles.length = 0;

    for (const imp of this.impacts) {
      this.scene.remove(imp.mesh);
      imp.mesh.geometry.dispose();
      imp.mesh.material.dispose();
    }
    this.impacts.length = 0;
  }
}
