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

// Configuração da câmera (CameraRig). O pitch é o ângulo de elevação da câmera
// em relação ao plano do chão, em graus: valores menores = visão mais
// horizontal, valores maiores = visão mais de cima.
export const CAMERA = {
  pitchDefault: 25, // inclinação inicial (mais horizontal que o antigo ~45°)
  pitchMin: 10, // limite inferior (mais horizontal)
  pitchMax: 60, // limite superior (mais vertical)
  pitchStep: 3, // incremento por input (teclado/roda/botões touch)
  pitchSmoothing: 6, // suavização da interpolação até o valor alvo
  storageKey: 'tank3d.camera.pitch.v1', // chave versionada no localStorage
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

// Configuração das ondas (Etapa 3). Cada onda define quantidade de inimigos,
// intervalo de spawn e multiplicadores de dificuldade (vida, velocidade e
// cadência de tiro). Ondas além das listadas escalam automaticamente.
export const WAVES = {
  total: 5, // sobreviver a N ondas = vitória
  countdown: 3, // intervalo entre ondas (s)
  waves: [
    { enemies: 3, spawnInterval: 1.4, healthMul: 1.0, speedMul: 1.0, fireRateMul: 1.0 },
    { enemies: 4, spawnInterval: 1.2, healthMul: 1.15, speedMul: 1.05, fireRateMul: 1.1 },
    { enemies: 5, spawnInterval: 1.0, healthMul: 1.3, speedMul: 1.1, fireRateMul: 1.2 },
    { enemies: 6, spawnInterval: 0.9, healthMul: 1.5, speedMul: 1.15, fireRateMul: 1.3 },
    { enemies: 7, spawnInterval: 0.8, healthMul: 1.75, speedMul: 1.2, fireRateMul: 1.45 },
  ],
};

// Pontuação e progressão de sessão (Etapa 3).
export const SCORE = {
  storageKey: 'tank3d.highscore.v1', // chave versionada no localStorage
  enemyValue: { enemy: 100, default: 100 }, // pontos por tipo de inimigo
  waveBonus: 250, // bônus por onda concluída (x número da onda)
  accuracyBonus: 500, // bônus máximo por precisão (100% de acertos)
};

export const FIXED_STEP = 1 / 60;
