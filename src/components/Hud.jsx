import React, { useEffect, useState } from 'react';
import { GAME_STATES } from '../game/config.js';
import Scoreboard from './Scoreboard.jsx';
import TouchControls from './TouchControls.jsx';

const STATE_LABEL = {
  [GAME_STATES.MENU]: 'Menu',
  [GAME_STATES.JOGANDO]: 'Em combate',
  [GAME_STATES.PAUSADO]: 'Pausado',
  [GAME_STATES.VITORIA]: 'Vitória',
  [GAME_STATES.DERROTA]: 'Destruído',
};

const Hud = ({
  hud,
  onStart,
  onResume,
  onRestart,
  onPause,
  onMove,
  onAim,
  onFire,
  onCameraPitch,
  onResetCamera,
  onToggleMute,
  onVolumeChange,
}) => {
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
    cameraPitch = 0,
    elapsed = 0,
    volume = 0.7,
    muted = false,
  } = hud;
  const healthPct = maxHealth > 0 ? Math.max(0, (health / maxHealth) * 100) : 0;
  const healthClass = healthPct > 60 ? 'ok' : healthPct > 30 ? 'warn' : 'danger';
  const reloadPct = Math.round(Math.max(0, Math.min(1, reloadProgress)) * 100);
  const playing = state === GAME_STATES.JOGANDO;
  const accuracyPct = Math.round(Math.max(0, Math.min(1, accuracy)) * 100);
  const outOfAmmo = !reloading && ammo <= 0;
  const elapsedLabel = `${Math.floor(elapsed / 60)}:${String(Math.floor(elapsed % 60)).padStart(2, '0')}`;

  // Destaque ao ganhar pontos: dispara quando a pontuação aumenta.
  const [scorePop, setScorePop] = useState(false);
  useEffect(() => {
    if (!score) return undefined;
    setScorePop(true);
    const id = setTimeout(() => setScorePop(false), 400);
    return () => clearTimeout(id);
  }, [score]);

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

      {/* Mira central + indicador de alvo válido. */}
      {playing && (
        <div className={`reticle${aimValid ? ' valid' : ''}`} aria-hidden="true">
          <span className="reticle-dot" />
          <span className="reticle-ring" />
        </div>
      )}

      {/* Feedback de arma: recarregando / sem munição. */}
      {playing && (reloading || outOfAmmo) && (
        <div className={`weapon-feedback${outOfAmmo ? ' empty' : ' reloading'}`}>
          {outOfAmmo ? 'SEM MUNIÇÃO' : `RECARREGANDO ${reloadPct}%`}
        </div>
      )}

      {/* Contagem regressiva entre ondas. */}
      {playing && countdown > 0 && (
        <div className="wave-countdown">
          <span className="wave-countdown-label">Próxima onda em</span>
          <span className="wave-countdown-value">{countdown}</span>
        </div>
      )}

      {/* Barra fina única com as estatísticas essenciais. */}
      <div className="hud-bar">
        <div className="hud-chip health" title={`Vida: ${health}/${maxHealth}`}>
          <span className="hud-icon" aria-hidden="true">
            ❤
          </span>
          <div className="health-bar" aria-hidden="true">
            <div className={`health-fill ${healthClass}`} style={{ width: `${healthPct}%` }} />
          </div>
          <span className="hud-value">
            {health}/{maxHealth}
          </span>
        </div>

        <div
          className={`hud-chip ammo${reloading ? ' reloading' : ''}`}
          title={reloading ? `Recarregando ${reloadPct}%` : `Munição: ${ammo}/${magazine}`}
        >
          <span className="hud-icon" aria-hidden="true">
            {reloading ? '⟳' : '▮'}
          </span>
          <span className="hud-value">{reloading ? `${reloadPct}%` : `${ammo}/${magazine}`}</span>
          <div className={`reload-bar${reloading ? ' active' : ''}`} aria-hidden="true">
            <div className="reload-fill" style={{ width: `${reloading ? reloadPct : 0}%` }} />
          </div>
        </div>

        <div className="hud-chip enemies" title={`Inimigos restantes: ${enemiesRemaining}`}>
          <span className="hud-icon" aria-hidden="true">
            ◎
          </span>
          <span className="hud-value">{enemiesRemaining}</span>
        </div>

        <div className={`hud-chip score${scorePop ? ' pop' : ''}`} title={`Pontuação: ${score}`}>
          <span className="hud-icon" aria-hidden="true">
            ★
          </span>
          <span className="hud-value big">{score}</span>
        </div>

        <div className="hud-chip state" title={`Estado: ${STATE_LABEL[state] || state}`}>
          <span className="hud-icon" aria-hidden="true">
            ⚑
          </span>
          <span className="hud-value">{STATE_LABEL[state] || state}</span>
        </div>

        <div className="hud-chip camera">
          <span className="hud-icon" aria-hidden="true">
            ⌖
          </span>
          <span className="hud-value">{cameraPitch}°</span>
          <button
            type="button"
            className="camera-reset"
            onClick={onResetCamera}
            aria-label="Resetar câmera"
          >
            ↺
          </button>
        </div>

        <div className="hud-chip audio" title={muted ? 'Som desligado' : `Volume: ${Math.round(volume * 100)}%`}>
          <button
            type="button"
            className="audio-toggle"
            onClick={onToggleMute}
            aria-label={muted ? 'Ativar som' : 'Silenciar'}
          >
            {muted ? '🔇' : '🔊'}
          </button>
          <input
            type="range"
            className="audio-volume"
            min="0"
            max="1"
            step="0.05"
            value={muted ? 0 : volume}
            onChange={(e) => onVolumeChange(Number(e.target.value))}
            aria-label="Volume"
          />
        </div>
      </div>

      <Scoreboard
        score={score}
        highScore={highScore}
        wave={wave}
        totalWaves={totalWaves}
        accuracy={accuracy}
      />

      {!isMobile && (
        <div className="hud-hint">
          WASD / setas para mover · mouse para mirar · clique ou espaço para atirar · Q/E ou roda
          para inclinar a câmera · P/Esc pausa
        </div>
      )}

      <TouchControls
        visible={isMobile && playing}
        onMove={onMove}
        onAim={onAim}
        onFire={onFire}
        onPause={onPause}
        onCameraPitch={onCameraPitch}
        reloading={reloading}
        reloadProgress={reloadProgress}
      />

      {state === GAME_STATES.MENU && (
        <div className="overlay">
          <h1>TANQUE DE GUERRA</h1>
          <p>
            Sobreviva a {totalWaves || 5} ondas de tanques inimigos. Destrua todos antes que
            acabem com você.
          </p>
          <ul className="overlay-controls">
            <li>
              <b>Mover:</b> WASD / setas
            </li>
            <li>
              <b>Mirar:</b> mouse
            </li>
            <li>
              <b>Atirar:</b> clique ou espaço
            </li>
            <li>
              <b>Câmera:</b> Q/E, PageUp/PageDown ou roda do mouse
            </li>
            <li>
              <b>Pausar:</b> P ou Esc
            </li>
          </ul>
          <button className="btn" onClick={onStart}>
            Jogar (Enter)
          </button>
        </div>
      )}

      {state === GAME_STATES.PAUSADO && (
        <div className="overlay">
          <h2>Pausado</h2>
          <button className="btn" onClick={onResume}>
            Continuar (Esc)
          </button>
          <button className="btn ghost" onClick={onRestart}>
            Reiniciar
          </button>
        </div>
      )}

      {state === GAME_STATES.DERROTA && (
        <div className="overlay danger">
          <h2>Tanque destruído</h2>
          <div className="overlay-stats">
            <div className="overlay-stat">
              <span className="hud-label">Pontuação</span>
              <span className="hud-value big">{score}</span>
            </div>
            <div className="overlay-stat">
              <span className="hud-label">Onda</span>
              <span className="hud-value">{wave}/{totalWaves}</span>
            </div>
            <div className="overlay-stat">
              <span className="hud-label">Tempo</span>
              <span className="hud-value">{elapsedLabel}</span>
            </div>
            <div className="overlay-stat">
              <span className="hud-label">Recorde</span>
              <span className="hud-value">{highScore}</span>
            </div>
            <div className="overlay-stat">
              <span className="hud-label">Precisão</span>
              <span className="hud-value">{accuracyPct}%</span>
            </div>
          </div>
          <button className="btn" onClick={onRestart}>
            Jogar de novo (R)
          </button>
        </div>
      )}

      {state === GAME_STATES.VITORIA && (
        <div className="overlay">
          <h2>Vitória!</h2>
          <p>Você sobreviveu a todas as ondas.</p>
          <div className="overlay-stats">
            <div className="overlay-stat">
              <span className="hud-label">Pontuação</span>
              <span className="hud-value big">{score}</span>
            </div>
            <div className="overlay-stat">
              <span className="hud-label">Onda</span>
              <span className="hud-value">{wave}/{totalWaves}</span>
            </div>
            <div className="overlay-stat">
              <span className="hud-label">Tempo</span>
              <span className="hud-value">{elapsedLabel}</span>
            </div>
            <div className="overlay-stat">
              <span className="hud-label">Recorde</span>
              <span className="hud-value">{highScore}</span>
            </div>
            <div className="overlay-stat">
              <span className="hud-label">Precisão</span>
              <span className="hud-value">{accuracyPct}%</span>
            </div>
          </div>
          <button className="btn" onClick={onRestart}>
            Jogar de novo (R)
          </button>
        </div>
      )}
    </div>
  );
};

export default Hud;
