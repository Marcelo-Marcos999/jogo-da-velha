// Câmera que segue o tanque do jogador (atrás e acima), com suavização.

import * as THREE from 'three';

export class CameraRig {
  constructor(camera) {
    this.camera = camera;
    this.distance = 20;
    this.height = 22;
    this.lookHeight = 1.5;
    this.smooth = 6;

    this._desired = new THREE.Vector3();
    this._look = new THREE.Vector3();
    this._forward = new THREE.Vector3();
  }

  _compute(tank) {
    this._forward.set(Math.sin(tank.yaw), 0, Math.cos(tank.yaw));
    this._desired.copy(tank.position).addScaledVector(this._forward, -this.distance);
    this._desired.y = this.height;
    this._look.copy(tank.position);
    this._look.y = this.lookHeight;
  }

  snap(tank) {
    if (!tank) return;
    this._compute(tank);
    this.camera.position.copy(this._desired);
    this.camera.lookAt(this._look);
  }

  update(tank, dt) {
    if (!tank) return;
    this._compute(tank);
    const t = 1 - Math.exp(-this.smooth * dt);
    this.camera.position.lerp(this._desired, t);
    this.camera.lookAt(this._look);
  }
}
