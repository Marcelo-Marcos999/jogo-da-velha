import React, { forwardRef } from 'react';

// Container do canvas 3D. Ocupa todo o espaço disponível e serve de referência
// para o Renderer dimensionar o canvas (resize responsivo).
const GameBoard = forwardRef(({ className = '' }, ref) => (
  <div className={`game-container ${className}`.trim()} ref={ref} />
));

GameBoard.displayName = 'GameBoard';

export default GameBoard;
