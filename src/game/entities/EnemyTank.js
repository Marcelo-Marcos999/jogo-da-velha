// Entidade inimiga: reutiliza Tank (modelo, vida, munição, recarga) e apenas
// marca o time como 'enemy' e reserva um slot para a IA (EnemyAI).
// Vida, velocidade, cadência e alcance vêm do perfil em config.js (ENEMY.profile).

import { Tank } from './Tank.js';

export class EnemyTank extends Tank {
  constructor(profile, options = {}) {
    super(profile, { ...options, team: 'enemy' });
    this.ai = null;
    this.group.name = `EnemyTank:${profile.id}`;
  }
}
