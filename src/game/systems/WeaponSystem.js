// Disparo por clique/tecla com cadência e recarga, criação do projétil,
// munição e feedback de recarga.

import * as THREE from 'three';
import { Projectile } from '../entities/Projectile.js';
import { PROJECTILE } from '../config.js';

export class WeaponSystem {
  constructor(projectileSystem, eventBus) {
    this.projectileSystem = projectileSystem;
    this.eventBus = eventBus;
  }

  // Avança apenas os temporizadores (recarga do pente e cadência).
  // Reutilizado pela IA dos inimigos, que decide quando disparar.
  tick(tank, dt) {
    if (!tank || !tank.alive) return;

    // Recarga do pente em andamento.
    if (tank.reloading) {
      tank.reloadTimer -= dt;
      const total = tank.profile.magazineReload || 1;
      tank.reloadProgress = 1 - Math.max(0, tank.reloadTimer) / total;
      if (tank.reloadTimer <= 0) {
        tank.reloading = false;
        tank.reloadProgress = 0;
        tank.ammo = tank.profile.magazine;
        this.eventBus.emit('recargaCompleta', { tank });
      }
      return;
    }

    // Cadência entre tiros.
    if (tank.reloadTimer > 0) {
      tank.reloadTimer -= dt;
    }
  }

  update(tank, input, dt) {
    if (!tank || !tank.alive) return;

    this.tick(tank, dt);
    if (tank.reloading) return;

    if (input.isFiring() && tank.reloadTimer <= 0) {
      this.fire(tank);
    }
  }

  fire(tank) {
    if (tank.ammo <= 0) {
      this._startReload(tank);
      return null;
    }

    tank.ammo -= 1;
    tank.reloadTimer = tank.profile.reload;

    const yaw = tank.worldTurretYaw;
    const direction = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    const muzzle = tank.position.clone().addScaledVector(direction, 2.6);
    muzzle.y = 1.4;

    const projectile = new Projectile({
      position: muzzle,
      direction,
      speed: PROJECTILE.speed,
      damage: tank.profile.damage,
      owner: tank,
      life: PROJECTILE.life,
      radius: PROJECTILE.radius,
    });

    this.projectileSystem.spawn(projectile);
    this.eventBus.emit('tiro', { tank, projectile });

    if (tank.ammo <= 0) {
      this._startReload(tank);
    }
    return projectile;
  }

  _startReload(tank) {
    if (tank.reloading) return;
    tank.reloading = true;
    tank.reloadTimer = tank.profile.magazineReload;
    tank.reloadProgress = 0;
    this.eventBus.emit('recargaIniciada', { tank });
  }
}
