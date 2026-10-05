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

// Configuração dos inimigos (Etapa 2): perfil de tanque + parâmetros de IA.
export const ENEMY = {
  count: 4, // quantidade inicial de inimigos
  spawnMinDistance: 18, // distância mínima do jogador no spawn
  detectRange: 34, // alcance de detecção (com linha de visão)
  attackRange: 22, // alcance de tiro
  retreatHealthRatio: 0.35, // limiar de vida para recuar
  retreatDistance: 26, // distância segura para sair do recuo
  aimTolerance: 0.14, // erro angular tolerado para disparar (rad)
  aimImprecision: 0.1, // imprecisão máxima da mira (rad)
  reactionTime: 0.35, // tempo de reação no estado DETECT (s)
  waypointTolerance: 2.5, // raio para considerar um waypoint alcançado
  deathLinger: 2.5, // tempo que o destroço permanece na arena (s)
  profile: {
    id: 'enemy',
    nome: 'Tanque Inimigo',
    speed: 9,
    acceleration: 30,
    deceleration: 26,
    turnSpeed: 1.9,
    turretSpeed: 2.2,
    maxHealth: 75,
    damage: 15,
    reload: 1.6, // cadência entre tiros (s)
    magazine: 6,
    magazineReload: 3.2,
    radius: 1.5,
    color: 0xb0413a,
    turretColor: 0x7f2b26,
  },
};

export const FIXED_STEP = 1 / 60;
