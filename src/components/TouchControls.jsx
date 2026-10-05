import React, { useCallback, useRef, useState } from 'react';
import { CAMERA } from '../game/config.js';

// Joystick virtual reutilizável (base + knob). Reporta um vetor normalizado
// (-1..1) com y positivo para cima. Usa Pointer Events para funcionar em
// toque e mouse.
const Joystick = ({ label, onChange }) => {
  const baseRef = useRef(null);
  const pointerId = useRef(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });

  const update = useCallback(
    (clientX, clientY) => {
      const base = baseRef.current;
      if (!base) return;
      const rect = base.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const radius = rect.width / 2;
      let dx = clientX - cx;
      let dy = clientY - cy;
      const dist = Math.hypot(dx, dy);
      if (dist > radius) {
        dx = (dx / dist) * radius;
        dy = (dy / dist) * radius;
      }
      setKnob({ x: dx, y: dy });
      onChange(dx / radius, -dy / radius);
    },
    [onChange],
  );

  const handleDown = (e) => {
    e.preventDefault();
    pointerId.current = e.pointerId;
    baseRef.current?.setPointerCapture(e.pointerId);
    update(e.clientX, e.clientY);
  };

  const handleMove = (e) => {
    if (pointerId.current !== e.pointerId) return;
    update(e.clientX, e.clientY);
  };

  const handleUp = (e) => {
    if (pointerId.current !== e.pointerId) return;
    pointerId.current = null;
    setKnob({ x: 0, y: 0 });
    onChange(0, 0);
  };

  return (
    <div
      className="joystick"
      ref={baseRef}
      onPointerDown={handleDown}
      onPointerMove={handleMove}
      onPointerUp={handleUp}
      onPointerCancel={handleUp}
    >
      <span className="joystick-label">{label}</span>
      <div className="joystick-knob" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
    </div>
  );
};

// Controles touch sobre o canvas (mobile). Não contém lógica de jogo: apenas
// traduz gestos em chamadas ao Input.
const TouchControls = ({
  visible,
  onMove,
  onAim,
  onFire,
  onPause,
  onCameraPitch,
  reloading = false,
  reloadProgress = 0,
}) => {
  const handleMove = useCallback((x, y) => onMove(x, y), [onMove]);
  const handleAim = useCallback((x, y) => onAim(x, y), [onAim]);

  if (!visible) return null;

  const reloadPct = Math.round(Math.max(0, Math.min(1, reloadProgress)) * 100);

  return (
    <div className="touch-controls">
      <Joystick label="Mover" onChange={handleMove} />

      {/* Ajuste da inclinação da câmera (coluna vertical, à direita). */}
      <div className="touch-camera">
        <button
          type="button"
          className="touch-btn camera"
          onPointerDown={(e) => {
            e.preventDefault();
            onCameraPitch(CAMERA.pitchStep);
          }}
          aria-label="Inclinar câmera para cima"
        >
          ▲
        </button>
        <button
          type="button"
          className="touch-btn camera"
          onPointerDown={(e) => {
            e.preventDefault();
            onCameraPitch(-CAMERA.pitchStep);
          }}
          aria-label="Inclinar câmera para baixo"
        >
          ▼
        </button>
      </div>

      <div className="touch-right">
        <Joystick label="Mirar" onChange={handleAim} />
        <div className="touch-buttons">
          <button
            type="button"
            className="touch-btn pause"
            onClick={onPause}
            aria-label="Pausar"
          >
            II
          </button>
          <button
            type="button"
            className={`touch-btn fire${reloading ? ' reloading' : ''}`}
            onPointerDown={(e) => {
              e.preventDefault();
              onFire(true);
            }}
            onPointerUp={() => onFire(false)}
            onPointerLeave={() => onFire(false)}
            onPointerCancel={() => onFire(false)}
            aria-label="Atirar"
          >
            {reloading ? (
              <span className="fire-reload" style={{ '--reload': `${reloadPct}%` }}>
                {reloadPct}%
              </span>
            ) : (
              'FOGO'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TouchControls;
