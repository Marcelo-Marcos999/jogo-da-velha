// Configuração central do jogo.
// Aqui ficam os números "de balanceamento" e os perfis de tanque.
// As etapas seguintes (inimigos, ondas, progressão) só precisam adicionar
// novos perfis/constantes aqui, sem tocar no núcleo.

export const GAME_STATES = {
  MENU: 'MENU',
  JOGANDO: 'JOGANDO',
  PAUSADO: 'PAUSADO',
  VITORIA: 'VITORIA',
  DERROTA: 'DERROTA',
};

export const ARENA = {
  size: 60, // lado do quadrado da arena
  wallHeight: 4,
  wallThickness: 1,
};

export const PROJECTILE = {
  speed: 55,
  life: 3,
  radius: 0.35,
};

// Perfis de tanque. Novas classes de tanque (etapas 2-5) = novos objetos aqui.
export const TANK_PROFILES = {
  player: {
    id: 'player',
    nome: 'Tanque do Jogador',
    speed: 14,
    acceleration: 45,
    deceleration: 35,
    turnSpeed: 2.6,
    turretSpeed: 3.4,
    maxHealth: 100,
    damage: 25,
    reload: 0.85, // cadência entre tiros (s)
    magazine: 8, // tiros por pente
    magazineReload: 2.4, // recarga do pente (s)
    radius: 1.5,
    color: 0x4caf50,
    turretColor: 0x2e7d32,
  },
};

export const FIXED_STEP = 1 / 60;
