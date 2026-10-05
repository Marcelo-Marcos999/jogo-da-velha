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

export class Input {
  constructor(target) {
    this.target = target;
    this.keys = new Set();
    this.justPressed = new Set();
    this.mouse = { x: 0, y: 0, ndcX: 0, ndcY: 0 };
    this.mouseDown = false;
    this.pointerLocked = false;
    this.enabled = true;
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
    return value;
  }

  // -1 (esquerda) .. 1 (direita)
  getSteer() {
    let value = 0;
    if (this.isAnyDown(RIGHT_KEYS)) value += 1;
    if (this.isAnyDown(LEFT_KEYS)) value -= 1;
    return value;
  }

  isFiring() {
    return this.mouseDown || this.isAnyDown(FIRE_KEYS);
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
