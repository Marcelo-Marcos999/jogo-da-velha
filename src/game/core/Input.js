// Entrada do usuário: teclado + mouse.
// Não contém lógica de jogo: apenas expõe um estado consultável.

const FORWARD_KEYS = ['KeyW', 'ArrowUp'];
const BACK_KEYS = ['KeyS', 'ArrowDown'];
const LEFT_KEYS = ['KeyA', 'ArrowLeft'];
const RIGHT_KEYS = ['KeyD', 'ArrowRight'];
const FIRE_KEYS = ['Space'];
const PREVENT_DEFAULT = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Space',
]);

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export class Input {
  constructor(target) {
    this.target = target;
    this.keys = new Set();
    this.justPressed = new Set();
    this.mouse = { x: 0, y: 0, ndcX: 0, ndcY: 0 };
    this.mouseDown = false;
    this.pointerLocked = false;
    this.enabled = true;
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
    };
    const onKeyUp = (e) => {
      this.keys.delete(e.code);
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
    document.addEventListener('pointerlockchange', onPointerLockChange);

    this._handlers = {
      onKeyDown,
      onKeyUp,
      onMouseMove,
      onMouseDown,
      onMouseUp,
      onBlur,
      onContextMenu,
      onPointerLockChange,
    };
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
    document.removeEventListener('pointerlockchange', h.onPointerLockChange);
    this.keys.clear();
    this.justPressed.clear();
  }
}
