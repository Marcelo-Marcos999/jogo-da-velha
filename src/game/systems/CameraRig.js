// Câmera que segue o tanque do jogador (atrás e acima), com suavização.
//
// O ângulo de visão é controlado por um "pitch" (elevação em graus). O jogador
// pode ajustá-lo (teclado, roda do mouse ou botões touch); uma vez ajustado, o
// valor fica travado (userAdjusted = true) e nenhum outro sistema o sobrescreve.
// A câmera continua seguindo a posição/yaw do jogador normalmente.

import * as THREE from 'three';
import { CAMERA } from '../config.js';

const DEG = Math.PI / 180;

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export class CameraRig {
  constructor(camera) {
    this.camera = camera;
    // Raio fixo da câmera em relação ao ponto observado: o pitch define como
    // esse raio se distribui entre distância horizontal e altura.
    this.radius = 28;
    this.lookHeight = 1.5;
    this.smooth = CAMERA.pitchSmoothing;

    // Pitch atual (graus) e alvo da interpolação.
    this.pitch = CAMERA.pitchDefault;
    this.targetPitch = CAMERA.pitchDefault;
    // Marca se o jogador já ajustou manualmente (trava o ângulo).
    this.userAdjusted = false;

    // Aplica o pitch persistido, se houver.
    const stored = this._readStoredPitch();
    if (stored !== null) {
      this.pitch = stored;
      this.targetPitch = stored;
      this.userAdjusted = true;
    }

    this._desired = new THREE.Vector3();
    this._look = new THREE.Vector3();
    this._forward = new THREE.Vector3();
  }

  // ---- Persistência --------------------------------------------------------

  _readStoredPitch() {
    try {
      const raw = window.localStorage.getItem(CAMERA.storageKey);
      if (raw === null) return null;
      const value = Number(raw);
      if (!Number.isFinite(value)) return null;
      return clamp(value, CAMERA.pitchMin, CAMERA.pitchMax);
    } catch (err) {
      return null;
    }
  }

  _persistPitch() {
    try {
      window.localStorage.setItem(CAMERA.storageKey, String(this.targetPitch));
    } catch (err) {
      /* localStorage indisponível: segue sem persistir */
    }
  }

  // ---- API de ajuste -------------------------------------------------------

  // Define o pitch (graus), com clamp, marca como ajustado pelo usuário e
  // persiste o valor. Retorna o valor efetivamente aplicado.
  setPitch(angle) {
    const clamped = clamp(angle, CAMERA.pitchMin, CAMERA.pitchMax);
    this.targetPitch = clamped;
    this.userAdjusted = true;
    this._persistPitch();
    return clamped;
  }

  // Soma um delta (graus) ao pitch atual.
  adjustPitch(delta) {
    return this.setPitch(this.targetPitch + delta);
  }

  // Volta ao padrão e limpa a persistência.
  resetPitch() {
    this.targetPitch = CAMERA.pitchDefault;
    this.userAdjusted = false;
    try {
      window.localStorage.removeItem(CAMERA.storageKey);
    } catch (err) {
      /* ignora */
    }
    return this.targetPitch;
  }

  // Pitch atual em graus (valor já suavizado).
  getPitch() {
    return this.pitch;
  }

  // ---- Posicionamento ------------------------------------------------------

  _compute(tank) {
    const pitchRad = this.pitch * DEG;
    const horizontal = this.radius * Math.cos(pitchRad);
    const height = this.lookHeight + this.radius * Math.sin(pitchRad);

    this._forward.set(Math.sin(tank.yaw), 0, Math.cos(tank.yaw));
    this._desired.copy(tank.position).addScaledVector(this._forward, -horizontal);
    this._desired.y = height;
    this._look.copy(tank.position);
    this._look.y = this.lookHeight;
  }

  snap(tank) {
    if (!tank) return;
    // Aplica o alvo imediatamente (primeiro frame / reset de mundo).
    this.pitch = this.targetPitch;
    this._compute(tank);
    this.camera.position.copy(this._desired);
    this.camera.lookAt(this._look);
  }

  update(tank, dt) {
    if (!tank) return;

    // Suaviza apenas a transição até o alvo; depois de estabilizado o pitch
    // não muda sozinho (fica travado no valor escolhido pelo jogador).
    if (Math.abs(this.targetPitch - this.pitch) > 1e-3) {
      const tp = 1 - Math.exp(-this.smooth * dt);
      this.pitch += (this.targetPitch - this.pitch) * tp;
      if (Math.abs(this.targetPitch - this.pitch) < 1e-3) {
        this.pitch = this.targetPitch;
      }
    }

    this._compute(tank);
    const t = 1 - Math.exp(-this.smooth * dt);
    this.camera.position.lerp(this._desired, t);
    this.camera.lookAt(this._look);
  }
}
