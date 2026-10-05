// Centraliza a aplicação de dano entre projéteis, jogador e inimigos.
// Regra de time: um projétil só fere alvos do time oposto (sem fogo amigo).
// Delega a vida/morte ao HealthSystem e emite eventos no EventBus.

export class DamageSystem {
  constructor(healthSystem, eventBus) {
    this.healthSystem = healthSystem;
    this.eventBus = eventBus;
  }

  applyDamage(target, amount, source = null) {
    if (!target || !target.alive) return false;

    // Fogo amigo: mesma equipe não se fere.
    if (source && source.team && target.team && source.team === target.team) {
      return false;
    }

    const applied = this.healthSystem.applyDamage(target, amount, source);
    if (applied) {
      this.eventBus.emit('danoAplicado', { target, amount, source });
    }
    return applied;
  }

  update(dt, tanks) {
    this.healthSystem.update(dt, tanks);
  }
}
