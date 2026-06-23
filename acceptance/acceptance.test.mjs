import assert from 'node:assert/strict'
import { checkWinner, gameBoard, gameHistory, getAvailableMoves, getGameResult, makeMove, resetGame } from '../src/utils/gameLogic.js'

// Initial game state
assert.deepEqual(gameBoard, [
  '', '', '',
  '', '', '',
  '', '', ''
])
assert.deepEqual(gameHistory, [])

// Make a move
makeMove(0, 'X')
assert.deepEqual(gameBoard, [
  'X', '', '',
  '', '', '',
  '', '', ''
])
assert.deepEqual(gameHistory, [{ move: 0, player: 'X' }])

// Make another move
makeMove(1, 'O')
assert.deepEqual(gameBoard, [
  'X', 'O', '',
  '', '', '',
  '', '', ''
])
assert.deepEqual(gameHistory, [{ move: 0, player: 'X' }, { move: 1, player: 'O' }])

// Check available moves
assert.deepEqual(getAvailableMoves(), [2, 3, 4, 5, 6, 7, 8])

// Check winner
makeMove(2, 'X')
makeMove(3, 'O')
makeMove(4, 'X')
makeMove(5, 'O')
makeMove(6, 'X')
makeMove(7, 'O')
makeMove(8, 'X')
assert.equal(checkWinner(), 'X')

// Get game result
assert.equal(getGameResult(), 'X wins')

// Reset game
resetGame()
assert.deepEqual(gameBoard, [
  '', '', '',
  '', '', '',
  '', '', ''
])
assert.deepEqual(gameHistory, [])

// Error handling
assert.throws(() => makeMove(0, 'A'), Error)
assert.throws(() => makeMove(9, 'X'), Error)

console.log('acceptance OK')
