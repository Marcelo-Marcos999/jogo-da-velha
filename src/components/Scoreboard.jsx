import React from 'react';
import { gameBoard, gameHistory, getGameResult, resetGame } from '../utils/gameLogic.js';

const Scoreboard = () => {
  const gameResult = getGameResult();

  const handleRestart = () => {
    resetGame();
  };

  return (
    <div className="scoreboard">
      <h2>Scoreboard</h2>
      <p>
        {gameResult?.winner ? (
          `Player ${gameResult.winner} wins!`
        ) : gameResult?.result === 'draw' ? (
          'It\'s a draw!'
        ) : (
          'Game in progress...'
        )}
      </p>
      <p>
        {gameHistory.length} moves made
      </p>
      <button onClick={handleRestart}>Restart</button>
    </div>
  );
};

export default Scoreboard;
