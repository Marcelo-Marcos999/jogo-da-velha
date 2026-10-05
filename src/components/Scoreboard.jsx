import React from 'react';

// Painel de pontuação: pontuação atual, recorde, onda e precisão.
const Scoreboard = ({ score = 0, highScore = 0, wave = 0, totalWaves = 0, accuracy = 0 }) => {
  const accuracyPct = Math.round(Math.max(0, Math.min(1, accuracy)) * 100);

  return (
    <div className="scoreboard">
      <div className="scoreboard-item">
        <span className="hud-label">Pontos</span>
        <span className="hud-value big">{score}</span>
      </div>
      <div className="scoreboard-item">
        <span className="hud-label">Recorde</span>
        <span className="hud-value">{highScore}</span>
      </div>
      <div className="scoreboard-item">
        <span className="hud-label">Onda</span>
        <span className="hud-value">
          {wave}/{totalWaves}
        </span>
      </div>
      <div className="scoreboard-item">
        <span className="hud-label">Precisão</span>
        <span className="hud-value">{accuracyPct}%</span>
      </div>
    </div>
  );
};

export default Scoreboard;
