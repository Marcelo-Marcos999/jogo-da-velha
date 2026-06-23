import React from 'react';
import GameBoard from './components/GameBoard.jsx';
import Scoreboard from './components/Scoreboard.jsx';

function App() {
  return (
    <div className="app">
      <GameBoard />
      <Scoreboard />
    </div>
  );
}

export default App;
