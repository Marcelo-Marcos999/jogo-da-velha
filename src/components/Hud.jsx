import React, { useEffect, useState } from 'react';
import { GAME_STATES } from '../game/config.js';
import Scoreboard from './Scoreboard.jsx';

const STATE_LABEL = {
  [GAME_STATES.MENU]: 'Menu',
  [GAME_STATES.JOGANDO]: 'Em combate',
  [GAME_STATES.PAUSADO]: 'Pausado',
  [GAME_STATES.VITORIA]: 'Vitória',
  [GAME_STATES.DERROTA]: 'Destruído',
};

const Hud = ({ hud, onStart, onResume, onRestart, onPause }) => {
  const {
    state,
    health,
    maxHealth,
    ammo,
    magazine,
    reloading,
    reloadProgress,
    enemiesRemaining = 0,
    wave = 0,
    totalWaves = 0,
    countdown = 0,
    score = 0,
    highScore = 0,
    accuracy = 0,
    aimValid = false,
    isMobile = false,
    lastHitAt = 0,
  } = hud;
  const healthPct = maxHealth > 0 ? Math.max(0, (health / maxHealth) * 100) : 0;
  const healthClass = healthPct > 60 ? 'ok' : healthPct > 30 ? 'warn' : 'danger';
  const reloadPct = Math.round(Math.max(0, Math.min(1, reloadProgress)) * 100);
  const playing = state === GAME_STATES.JOGANDO;

  // Flash/vinheta ao receber dano: dispara quando lastHitAt muda.
  const [hitFlash, setHitFlash] = useState(false);
  useEffect(() => {
    if (!lastHitAt) return undefined;
    setHitFlash(true);
    const id = setTimeout(() => setHitFlash(false), 350);
    return () => clearTimeout(id);
  }, [lastHitAt]);

  return (
    <div className="hud">
      <div className={`damage-vignette${hitFlash ? ' active' : ''}`} />

      <div className="hud-top">
        <div className="hud-panel">
          <span className="hud-label">Vida</span>
          <div className="health-bar">
            <div className={`health-fill ${healthClass}`} style={{ width: `${healthPct}%` }} />
          </div>
          <span className="hud-value">
            {health}/{maxHealth}
          </span>
        </div>

        <div className="hud-panel">
          <span className="hud-label">Munição</span>
          <span className="hud-value big">
            {reloading ? 'RECARREGANDO' : `${ammo}/${magazine}`}
          </span>
          {reloading && (
            <div className="reload-bar">
              <div
                className="reload-fill"
                style={{ width: `${Math.min(100, Math.max(0, reloadProgress * 100))}%` }}
              />
            </div>
          )}
        </div>

        <div className="hud-panel">
          <span className="hud-label">Inimigos</span>
          <span className="hud-value big">{enemies}</span>
        </div>

        <div className="hud-panel">
          <span className="hud-label">Estado</span>
          <span className="hud-value">{STATE_LABEL[state] || state}</span>
        </div>
      </div>

      <div className="hud-hint">
        WASD / setas para mover · mouse para mirar · clique ou espaço para atirar · P/Esc pausa
      </div>

      {state === GAME_STATES.MENU && (
        <div className="overlay">
          <h1>TANQUE DE GUERRA</h1>
          <p>Protótipo do núcleo: arena, movimentação, mira, tiro e destruição.</p>
          <button className="btn" onClick={onStart}>
            Iniciar (Enter)
          </button>
        </div>
      )}

      {state === GAME_STATES.PAUSADO && (
        <div className="overlay">
          <h2>Pausado</h2>
          <button className="btn" onClick={onResume}>
            Continuar (P)
          </button>
        </div>
      )}

      {state === GAME_STATES.DERROTA && (
        <div className="overlay danger">
          <h2>Tanque destruído</h2>
          <button className="btn" onClick={onRestart}>
            Reiniciar (R)
          </button>
        </div>
      )}

      {state === GAME_STATES.VITORIA && (
        <div className="overlay">
          <h2>Vitória</h2>
          <button className="btn" onClick={onRestart}>
            Reiniciar (R)
          </button>
        </div>
      )}
    </div>
  );
};

export default Hud;
