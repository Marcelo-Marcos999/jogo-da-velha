// Entrada do usuário: teclado + mouse.
// Não contém lógica de jogo: apenas expõe um estado consultável.

import { CAMERA } from '../config.js';

const FORWARD_KEYS = ['KeyW', 'ArrowUp'];
const BACK_KEYS = ['KeyS', 'ArrowDown'];
const LEFT_KEYS = ['KeyA', 'ArrowLeft'];
const RIGHT_KEYS = ['KeyD', 'ArrowRight'];
const FIRE_KEYS = ['Space'];
// Ajuste da inclinação da câmera: Q/PageUp sobe (mais vertical),
// E/PageDown desce (mais horizontal).
const PITCH_UP_KEYS = ['KeyQ', 'PageUp'];
const PITCH_DOWN_KEYS = ['KeyE', 'PageDown'];
const PREVENT_DEFAULT = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Space',
  'PageUp',
  'PageDown',
]);

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export class Input {
  constructor(target, cameraRig = null) {
    this.target = target;
    // Referência opcional ao CameraRig para o ajuste de inclinação.
    this.cameraRig = cameraRig;
    this.keys = new Set();
    this.justPressed = new Set();
    this.mouse = { x: 0, y: 0, ndcX: 0, ndcY: 0 };
    this.mouseDown = false;
    this.pointerLocked = false;
    this.enabled = true;
    // Estado do ajuste de câmera (consumível pelo HUD/touch).
    this.pitchAdjust = { up: false, down: false, delta: 0 };
    // Estado sintético dos controles touch (joysticks/botões). Preenchido pelo
    // componente TouchControls; não duplica a lógica de movimento/mira.
    this.touch = {
      move: { x: 0, y: 0 }, // x: direita(+), y: frente(+)
      aim: { x: 0, y: 0, active: false }, // direção de mira (frente = +y)
      firing: false,
    };
    this._handlers = {};
    this._bind();
  }

  _bind() {
    const onKeyDown = (e) => {
      if (!this.enabled) return;
      if (PREVENT_DEFAULT.has(e.code)) e.preventDefault();
      if (!e.repeat) this.justPressed.add(e.code);
      this.keys.add(e.code);
      // Ajuste contínuo da câmera enquanto a tecla estiver pressionada.
      if (PITCH_UP_KEYS.includes(e.code)) {
        this.pitchAdjust.up = true;
        this._adjustPitch(CAMERA.pitchStep);
      } else if (PITCH_DOWN_KEYS.includes(e.code)) {
        this.pitchAdjust.down = true;
        this._adjustPitch(-CAMERA.pitchStep);
      }
    };
    const onKeyUp = (e) => {
      this.keys.delete(e.code);
      if (PITCH_UP_KEYS.includes(e.code)) this.pitchAdjust.up = false;
      if (PITCH_DOWN_KEYS.includes(e.code)) this.pitchAdjust.down = false;
    };
    const onWheel = (e) => {
      if (!this.enabled) return;
      e.preventDefault();
      // Roda para cima (deltaY < 0) sobe a câmera; para baixo desce.
      const dir = e.deltaY > 0 ? -1 : 1;
      this._adjustPitch(dir * CAMERA.pitchStep);
    };
    const onMouseMove = (e) => {
      const rect = this.target.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      this.mouse.x = e.clientX - rect.left;
      this.mouse.y = e.clientY - rect.top;
      this.mouse.ndcX = (this.mouse.x / rect.width) * 2 - 1;
      this.mouse.ndcY = -(this.mouse.y / rect.height) * 2 + 1;
    };
    const onMouseDown = (e) => {
      if (e.button === 0) this.mouseDown = true;
    };
    const onMouseUp = (e) => {
      if (e.button === 0) this.mouseDown = false;
    };
    const onBlur = () => {
      this.keys.clear();
      this.mouseDown = false;
      this.pitchAdjust.up = false;
      this.pitchAdjust.down = false;
    };
    const onContextMenu = (e) => e.preventDefault();
    const onPointerLockChange = () => {
      this.pointerLocked = document.pointerLockElement === this.target;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    window.addEventListener('mouseup', onMouseUp);
    this.target.addEventListener('mousemove', onMouseMove);
    this.target.addEventListener('mousedown', onMouseDown);
    this.target.addEventListener('contextmenu', onContextMenu);
    this.target.addEventListener('wheel', onWheel, { passive: false });
    document.addEventListener('pointerlockchange', onPointerLockChange);

    this._handlers = {
      onKeyDown,
      onKeyUp,
      onMouseMove,
      onMouseDown,
      onMouseUp,
      onBlur,
      onContextMenu,
      onWheel,
      onPointerLockChange,
    };
  }

  // Aplica um delta de pitch (graus) ao CameraRig, se disponível.
  _adjustPitch(delta) {
    this.pitchAdjust.delta += delta;
    if (this.cameraRig) this.cameraRig.adjustPitch(delta);
  }

  // Estado do ajuste de câmera (para HUD/touch).
  getPitchAdjust() {
    return this.pitchAdjust;
  }

  isDown(code) {
    return this.keys.has(code);
  }

  isAnyDown(codes) {
    return codes.some((code) => this.keys.has(code));
  }

  // -1 (ré) .. 1 (frente)
  getThrottle() {
    let value = 0;
    if (this.isAnyDown(FORWARD_KEYS)) value += 1;
    if (this.isAnyDown(BACK_KEYS)) value -= 1;
    if (value === 0) value = this.touch.move.y;
    return clamp(value, -1, 1);
  }

  // -1 (esquerda) .. 1 (direita)
  getSteer() {
    let value = 0;
    if (this.isAnyDown(RIGHT_KEYS)) value += 1;
    if (this.isAnyDown(LEFT_KEYS)) value -= 1;
    if (value === 0) value = this.touch.move.x;
    return clamp(value, -1, 1);
  }

  isFiring() {
    return this.mouseDown || this.isAnyDown(FIRE_KEYS) || this.touch.firing;
  }

  // ---- Controles touch (chamados pelo TouchControls) -----------------------

  setMoveAxis(x, y) {
    this.touch.move.x = clamp(x, -1, 1);
    this.touch.move.y = clamp(y, -1, 1);
  }

  setAimAxis(x, y, active = true) {
    this.touch.aim.x = clamp(x, -1, 1);
    this.touch.aim.y = clamp(y, -1, 1);
    this.touch.aim.active = active;
  }

  setFiring(firing) {
    this.touch.firing = !!firing;
  }

  clearTouch() {
    this.touch.move.x = 0;
    this.touch.move.y = 0;
    this.touch.aim.x = 0;
    this.touch.aim.y = 0;
    this.touch.aim.active = false;
    this.touch.firing = false;
  }

  // Consome uma tecla pressionada (edge), retornando true apenas uma vez.
  consumeKey(code) {
    if (this.justPressed.has(code)) {
      this.justPressed.delete(code);
      return true;
    }
    return false;
  }

  requestPointerLock() {
    if (this.target.requestPointerLock) {
      this.target.requestPointerLock();
    }
  }

  exitPointerLock() {
    if (document.exitPointerLock) {
      document.exitPointerLock();
    }
  }

  // Limpa os eventos de "edge" no fim de cada frame.
  endFrame() {
    this.justPressed.clear();
  }

  dispose() {
    const h = this._handlers;
    window.removeEventListener('keydown', h.onKeyDown);
    window.removeEventListener('keyup', h.onKeyUp);
    window.removeEventListener('blur', h.onBlur);
    window.removeEventListener('mouseup', h.onMouseUp);
    this.target.removeEventListener('mousemove', h.onMouseMove);
    this.target.removeEventListener('mousedown', h.onMouseDown);
    this.target.removeEventListener('contextmenu', h.onContextMenu);
    this.target.removeEventListener('wheel', h.onWheel);
    document.removeEventListener('pointerlockchange', h.onPointerLockChange);
    this.keys.clear();
    this.justPressed.clear();
  }
}
