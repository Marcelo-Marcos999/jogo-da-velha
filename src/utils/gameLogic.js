import { v4 as uuidv4 } from 'uuid';

const gameBoard = [
  [null, null, null],
  [null, null, null],
  [null, null, null],
];

const gameHistory = [];

const getAvailableMoves = () => {
  const availableMoves = [];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (gameBoard[i][j] === null) {
        availableMoves.push({ row: i, col: j });
      }
    }
  }
  return availableMoves;
};

const makeMove = (row, col, player) => {
  if (gameBoard[row][col] !== null) {
    throw new Error('Position already occupied');
  }
  gameBoard[row][col] = player;
  const move = { row, col, player, id: uuidv4() };
  gameHistory.push(move);
  return move;
};

const checkWinner = () => {
  for (let i = 0; i < 3; i++) {
    if (
      gameBoard[i][0] !== null &&
      gameBoard[i][0] === gameBoard[i][1] &&
      gameBoard[i][1] === gameBoard[i][2]
    ) {
      return gameBoard[i][0];
    }
    if (
      gameBoard[0][i] !== null &&
      gameBoard[0][i] === gameBoard[1][i] &&
      gameBoard[1][i] === gameBoard[2][i]
    ) {
      return gameBoard[0][i];
    }
  }
  if (
    gameBoard[0][0] !== null &&
    gameBoard[0][0] === gameBoard[1][1] &&
    gameBoard[1][1] === gameBoard[2][2]
  ) {
    return gameBoard[0][0];
  }
  if (
    gameBoard[0][2] !== null &&
    gameBoard[0][2] === gameBoard[1][1] &&
    gameBoard[1][1] === gameBoard[2][0]
  ) {
    return gameBoard[0][2];
  }
  return null;
};

const getGameResult = () => {
  const winner = checkWinner();
  if (winner) {
    return { winner, result: 'win' };
  }
  const availableMoves = getAvailableMoves();
  if (availableMoves.length === 0) {
    return { result: 'draw' };
  }
  return null;
};

const resetGame = () => {
  gameBoard.forEach((row) => {
    row.fill(null);
  });
  gameHistory.length = 0;
};

export {
  gameBoard,
  gameHistory,
  getAvailableMoves,
  makeMove,
  checkWinner,
  getGameResult,
  resetGame,
};
