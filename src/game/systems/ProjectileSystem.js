// Integra o movimento dos projéteis, detecta colisão com obstáculos e com
// tanques, aplica dano e remove o projétil. O feedback visual é delegado ao
// EffectsSystem via evento 'impacto'.

export class ProjectileSystem {
  constructor(scene, arena, damageSystem, eventBus) {
    this.scene = scene;
    this.arena = arena;
    this.damageSystem = damageSystem;
    this.eventBus = eventBus;
    this.projectiles = [];
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
        this._emitImpact(p, null);
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
            this.damageSystem.applyDamage(tank, p.damage, p.owner);
            this._emitImpact(p, tank);
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
  }

  _emitImpact(projectile, target) {
    this.eventBus.emit('impacto', {
      position: projectile.position.clone(),
      damage: target ? projectile.damage : 0,
      target,
      source: projectile.owner,
    });
  }

  _removeProjectile(index) {
    const p = this.projectiles[index];
    this.scene.remove(p.mesh);
    p.dispose();
    this.projectiles.splice(index, 1);
  }

  clear() {
    for (const p of this.projectiles) {
      this.scene.remove(p.mesh);
      p.dispose();
    }
    this.projectiles.length = 0;
  }
}
