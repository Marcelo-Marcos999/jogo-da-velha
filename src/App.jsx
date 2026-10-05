import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Game } from './game/core/Game.js';
import { GAME_STATES } from './game/config.js';
import Hud from './components/Hud.jsx';

const INITIAL_HUD = {
  state: GAME_STATES.MENU,
  health: 100,
  maxHealth: 100,
  ammo: 0,
  magazine: 0,
  reloading: false,
  reloadProgress: 0,
};

function App() {
  const containerRef = useRef(null);
  const gameRef = useRef(null);
  const [hud, setHud] = useState(INITIAL_HUD);

  useEffect(() => {
    const game = new Game(containerRef.current, {
      onHud: setHud,
      onStateChange: (state) => setHud((prev) => ({ ...prev, state })),
    });
    gameRef.current = game;
    game.start();

    return () => {
      game.dispose();
      gameRef.current = null;
    };
  }, []);

  const handleStart = useCallback(() => {
    gameRef.current?.startGame();
  }, []);

  const handleResume = useCallback(() => {
    gameRef.current?.resume();
  }, []);

  const handleRestart = useCallback(() => {
    gameRef.current?.startGame();
  }, []);

  return (
    <div className="app">
      <div className="game-container" ref={containerRef} />
      <Hud hud={hud} onStart={handleStart} onResume={handleResume} onRestart={handleRestart} />
    </div>
  );
}

export default App;
