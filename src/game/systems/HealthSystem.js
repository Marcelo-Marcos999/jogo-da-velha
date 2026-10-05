// Aplica dano, invulnerabilidade curta após levar dano, morte e eventos.

export class HealthSystem {
  constructor(eventBus, invulnerabilityTime = 0.4) {
    this.eventBus = eventBus;
    this.invulnerabilityTime = invulnerabilityTime;
  }

  applyDamage(tank, amount, source = null) {
    if (!tank || !tank.alive || tank.invulnerable > 0) return false;

    tank.health -= amount;
    tank.invulnerable = this.invulnerabilityTime;

    this.eventBus.emit('danoRecebido', { tank, amount, source });

    if (tank.health <= 0) {
      tank.health = 0;
      tank.alive = false;
      this.eventBus.emit('tanqueMorto', { tank, source });
    }
    return true;
  }

  heal(tank, amount) {
    if (!tank || !tank.alive) return;
    tank.health = Math.min(tank.maxHealth, tank.health + amount);
  }

  update(dt, tanks) {
    for (const tank of tanks) {
      if (tank.invulnerable > 0) {
        tank.invulnerable = Math.max(0, tank.invulnerable - dt);
      }
    }
  }
}
