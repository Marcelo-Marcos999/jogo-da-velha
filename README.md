# Tanque de Guerra

Protótipo 3D de batalha de tanques em React + Vite + three.js.

Esta é a **Etapa 1** de uma reescrita incremental: o núcleo jogável (arena,
tanque do jogador, movimentação, câmera, mira, tiro, colisão, vida e
destruição). Inimigos com IA, ondas, pontuação, progressão, áudio e partículas
entram nas etapas seguintes — a arquitetura já está preparada para recebê-los.

## Como jogar

- **W/A/S/D** ou **setas**: mover e girar o casco do tanque.
- **Mouse**: mirar a torre (a torre gira com velocidade limitada).
- **Clique** ou **Espaço**: atirar.
- **P** ou **Esc**: pausar/continuar.
- **R** ou **Enter**: reiniciar após ser destruído.

## Uso

```bash
npm install
npm run dev
```

Build de produção:

```bash
npm run build
npm run preview
```

## Arquitetura

O código do jogo fica em `src/game/`, separado por responsabilidade:

| Caminho | Responsabilidade |
| --- | --- |
| `core/Game.js` | Loop (rAF + delta time), máquina de estados (MENU, JOGANDO, PAUSADO, VITORIA, DERROTA) e orquestração dos sistemas. Ponto único de extensão. |
| `core/Input.js` | Teclado e mouse; expõe estado consultável, sem lógica de jogo. |
| `core/Renderer.js` | Cena, câmera, luzes, renderizador, resize responsivo e fog. |
| `core/Time.js` | Relógio/delta e acumulador para passos fixos de simulação. |
| `core/EventBus.js` | Pub/sub de eventos (`tiro`, `danoRecebido`, `tanqueMorto`, recarga). |
| `world/Arena.js` | Mapa da arena por dados (piso, paredes, obstáculos) e lista de colisores. |
| `entities/Tank.js` | Tanque genérico (casco, torre, canhão) dirigido por um "perfil". |
| `entities/Projectile.js` | Projétil com velocidade, tempo de vida, dono e dano. |
| `systems/MovementSystem.js` | Input → movimento, aceleração/desaceleração, rotação e colisão círculo×AABB. |
| `systems/AimSystem.js` | Raycast do mouse no plano do chão → mira da torre com limite de rotação. |
| `systems/WeaponSystem.js` | Cadência, munição, recarga e criação do projétil. |
| `systems/ProjectileSystem.js` | Integração dos projéteis, colisões, dano e efeito de impacto. |
| `systems/HealthSystem.js` | Dano, invulnerabilidade curta, morte e eventos. |
| `systems/CameraRig.js` | Câmera que segue o tanque com suavização. |
| `config.js` | Constantes de balanceamento e perfis de tanque. |

Novas classes de tanque são apenas novos perfis em `config.js`; novas fases/modos
são novos estados/sistemas plugados em `Game.js`.

## Stack

- React 18 + Vite
- three.js (geometrias primitivas, cores chapadas e luzes simples — sem assets externos)
- Estado do jogo em memória; sem backend.
