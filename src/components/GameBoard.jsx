import React from 'react';
import { gameBoard, makeMove, getGameResult, resetGame } from '../utils/gameLogic.js';

const GameBoard = () => {
  const handleCellClick = (row, col) => {
    const move = makeMove(row, col, 'X');
    const result = getGameResult();
    if (result) {
      // Handle game result
    }
  };

  return (
    <div className="game-board">
      {gameBoard.map((row, rowIndex) => (
        <div key={rowIndex} className="game-row">
          {row.map((cell, cellIndex) => (
            <div
              key={cellIndex}
              className={`game-cell ${cell === 'X' ? 'x' : cell === 'O' ? 'o' : ''}`}
              onClick={() => handleCellClick(rowIndex, cellIndex)}
            >
              {cell === null ? cellIndex + 1 : cell}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default GameBoard;
