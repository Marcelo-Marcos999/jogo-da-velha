import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Game } from './game/core/Game.js';
import { GAME_STATES } from './game/config.js';
import Hud from './components/Hud.jsx';
import GameBoard from './components/GameBoard.jsx';

const INITIAL_HUD = {
  state: GAME_STATES.MENU,
  health: 100,
  maxHealth: 100,
  ammo: 0,
  magazine: 0,
  reloading: false,
  reloadProgress: 0,
  enemiesRemaining: 0,
  wave: 0,
  totalWaves: 0,
  countdown: 0,
  score: 0,
  highScore: 0,
  accuracy: 0,
  aimValid: false,
  isMobile: false,
  lastHitAt: 0,
  cameraPitch: 0,
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

  const handlePause = useCallback(() => {
    gameRef.current?.togglePause();
  }, []);

  const handleMove = useCallback((x, y) => {
    gameRef.current?.setMoveAxis(x, y);
  }, []);

  const handleAim = useCallback((x, y) => {
    gameRef.current?.setAimAxis(x, y);
  }, []);

  const handleFire = useCallback((firing) => {
    gameRef.current?.setFiring(firing);
  }, []);

  const handleCameraPitch = useCallback((delta) => {
    gameRef.current?.adjustCameraPitch(delta);
  }, []);

  const handleResetCamera = useCallback(() => {
    gameRef.current?.resetCamera();
  }, []);

  return (
    <div className="app">
      <GameBoard ref={containerRef} />
      <Hud
        hud={hud}
        onStart={handleStart}
        onResume={handleResume}
        onRestart={handleRestart}
        onPause={handlePause}
        onMove={handleMove}
        onAim={handleAim}
        onFire={handleFire}
        onCameraPitch={handleCameraPitch}
        onResetCamera={handleResetCamera}
      />
    </div>
  );
}

export default App;
