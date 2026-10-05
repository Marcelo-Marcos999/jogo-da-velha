import React, { useEffect, useState } from 'react';

// Painel de pontuação recolhível: por padrão mostra apenas pontuação e onda em
// uma linha; o botão alterna para a visão detalhada (recorde / precisão).
const STORAGE_KEY = 'tank-battle:scoreboard-expanded';

const readExpanded = () => {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
};

const Scoreboard = ({ score = 0, highScore = 0, wave = 0, totalWaves = 0, accuracy = 0 }) => {
  const accuracyPct = Math.round(Math.max(0, Math.min(1, accuracy)) * 100);
  const [expanded, setExpanded] = useState(readExpanded);

  // Persiste a preferência do jogador entre sessões.
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(expanded));
    } catch {
      /* localStorage indisponível: ignora silenciosamente */
    }
  }, [expanded]);

  return (
    <div className={`scoreboard${expanded ? ' expanded' : ''}`}>
      <div className="scoreboard-header">
        <span className="scoreboard-item" title={`Pontuação: ${score}`}>
          <span className="hud-icon" aria-hidden="true">
            ★
          </span>
          <span className="hud-value big">{score}</span>
        </span>
        <span className="scoreboard-item" title={`Onda ${wave}/${totalWaves}`}>
          <span className="hud-icon" aria-hidden="true">
            ⚑
          </span>
          <span className="hud-value">
            {wave}/{totalWaves}
          </span>
        </span>
        <button
          type="button"
          className="scoreboard-toggle"
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
          aria-label={expanded ? 'Recolher estatísticas' : 'Expandir estatísticas'}
          title={expanded ? 'Recolher' : 'Detalhes'}
        >
          {expanded ? '▾' : '▸'}
        </button>
      </div>

      {expanded && (
        <div className="scoreboard-details">
          <div className="scoreboard-item">
            <span className="hud-label">Recorde</span>
            <span className="hud-value">{highScore}</span>
          </div>
          <div className="scoreboard-item">
            <span className="hud-label">Precisão</span>
            <span className="hud-value">{accuracyPct}%</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Scoreboard;
