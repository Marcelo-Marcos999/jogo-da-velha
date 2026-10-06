// Entidade tanque genérica: casco, torre e canhão.
// Recebe um "perfil" (velocidade, vida, dano, recarga...) para que novas
// classes de tanque sejam apenas novos perfis nas próximas fases.

import * as THREE from 'three';

export class Tank {
  constructor(profile, options = {}) {
    this.profile = profile;

    this.position = new THREE.Vector3(options.x || 0, 0, options.z || 0);
    this.team = options.team || 'player'; // time: 'player' | 'enemy'
    this.yaw = options.yaw || 0; // orientação do casco (rad)
    this.turretYaw = 0; // rotação da torre relativa ao casco (rad)
    this.speed = 0; // velocidade escalar para frente/trás
    this.velocity = new THREE.Vector3();

    this.maxHealth = profile.maxHealth;
    this.health = profile.maxHealth;
    this.alive = true;
    this.invulnerable = 0; // tempo restante de invulnerabilidade (s)

    this.ammo = profile.magazine;
    this.reloadTimer = 0; // cooldown entre tiros / tempo de recarga do pente
    this.reloading = false;
    this.reloadProgress = 0;

    this.radius = profile.radius;

    // Animação (Etapa 4): recuo do cano e inclinação do casco.
    this._recoil = 0; // 0..1, decai com o tempo
    this._tiltX = 0; // inclinação ao acelerar/frear
    this._tiltZ = 0; // inclinação ao virar
    this._lastYaw = this.yaw;

    this.group = this._buildModel();
    this.group.name = `Tank:${profile.id}`;
    this.syncTransform();
  }

  // Dispara a animação de recuo do cano (chamado ao atirar).
  triggerRecoil() {
    this._recoil = 1;
  }

  _buildModel() {
    const group = new THREE.Group();
    const profile = this.profile;

    const hullMat = new THREE.MeshStandardMaterial({
      color: profile.color,
      roughness: 0.7,
      metalness: 0.15,
    });
    const trackMat = new THREE.MeshStandardMaterial({
      color: 0x22262b,
      roughness: 0.95,
      metalness: 0.1,
    });
    const turretMat = new THREE.MeshStandardMaterial({
      color: profile.turretColor,
      roughness: 0.6,
      metalness: 0.2,
    });
    const barrelMat = new THREE.MeshStandardMaterial({
      color: 0x2f3439,
      roughness: 0.5,
      metalness: 0.4,
    });

    const hull = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1, 3.4), hullMat);
    hull.position.y = 0.7;
    hull.castShadow = true;
    hull.receiveShadow = true;
    group.add(hull);

    const trackGeo = new THREE.BoxGeometry(0.6, 0.9, 3.6);
    const leftTrack = new THREE.Mesh(trackGeo, trackMat);
    leftTrack.position.set(-1.4, 0.55, 0);
    leftTrack.castShadow = true;
    group.add(leftTrack);

    const rightTrack = new THREE.Mesh(trackGeo, trackMat);
    rightTrack.position.set(1.4, 0.55, 0);
    rightTrack.castShadow = true;
    group.add(rightTrack);

    const turretGroup = new THREE.Group();
    turretGroup.position.y = 1.35;

    const turret = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.9, 2), turretMat);
    turret.castShadow = true;
    turretGroup.add(turret);

    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.18, 2.6, 12),
      barrelMat,
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.05, 2.1);
    barrel.castShadow = true;
    turretGroup.add(barrel);

    group.add(turretGroup);
    this.turretGroup = turretGroup;
    this.barrel = barrel;
    this._barrelBaseZ = barrel.position.z;

    return group;
  }

  // Ângulo da torre no espaço do mundo.
  get worldTurretYaw() {
    return this.yaw + this.turretYaw;
  }

  syncTransform(dt = 1 / 60) {
    this.group.position.copy(this.position);
    this.group.rotation.y = this.yaw;

    // Inclinação do casco: acelera/freia (pitch) e vira (roll).
    const speedRatio = this.profile.speed ? this.speed / this.profile.speed : 0;
    const targetTiltX = -speedRatio * 0.06;
    const yawDelta = this.yaw - this._lastYaw;
    this._lastYaw = this.yaw;
    const turnRate = dt > 0 ? yawDelta / dt : 0;
    const targetTiltZ = Math.max(-0.12, Math.min(0.12, turnRate * 0.05));
    const k = Math.min(1, dt * 8);
    this._tiltX += (targetTiltX - this._tiltX) * k;
    this._tiltZ += (targetTiltZ - this._tiltZ) * k;
    this.group.rotation.x = this._tiltX;
    this.group.rotation.z = this._tiltZ;

    // Recuo do cano: desliza para trás e volta suavemente.
    if (this._recoil > 0) {
      this._recoil = Math.max(0, this._recoil - dt * 6);
    }
    if (this.barrel) {
      this.barrel.position.z = this._barrelBaseZ - this._recoil * 0.5;
    }

    if (this.turretGroup) {
      this.turretGroup.rotation.y = this.turretYaw;
    }
  }

  dispose() {
    this.group.traverse((obj) => {
      if (obj.isMesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
  }
}
