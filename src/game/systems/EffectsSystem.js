// Impactos e feedback visual (Etapa 3).
// Faíscas no ponto de colisão, flash curto no tanque atingido, marcador de
// dano flutuante e explosão simples ao destruir um tanque. Todos os efeitos
// usam pool de objetos reciclados para não vazar memória.

import * as THREE from 'three';
import { FX, QUALITY } from '../config.js';

const PARTICLE_GEO = new THREE.SphereGeometry(0.16, 6, 6);
const BLAST_GEO = new THREE.SphereGeometry(1, 12, 12);
const DECAL_GEO = new THREE.CircleGeometry(0.55, 10);
const FLASH_GEO = new THREE.SphereGeometry(0.4, 8, 8);

export class EffectsSystem {
  // `camera` é opcional e usado apenas para o screen shake.
  constructor(scene, eventBus, { camera = null, quality = QUALITY.levels.alta } = {}) {
    this.scene = scene;
    this.eventBus = eventBus;
    this.camera = camera;
    this.config = FX;
    this.quality = quality;

    this._particles = []; // ativos
    this._particlePool = []; // reciclados
    this._blasts = [];
    this._blastPool = [];
    this._markers = [];
    this._markerPool = [];
    this._flashes = [];

    // Etapa 4: decals, muzzle flash, rastro de fumaça e screen shake.
    this._decals = [];
    this._decalPool = [];
    this._muzzleFlashes = [];
    this._trails = []; // projéteis com rastro ativo
    this._shake = 0; // amplitude atual do tremor

    this._unsubs = [];
    this._unsubs.push(
      this.eventBus.on('impacto', ({ position, target }) => {
        this.spawnImpact(position, { hit: !!target });
        if (!target) this.spawnDecal(position);
      }),
    );
    this._unsubs.push(
      this.eventBus.on('tanqueMorto', ({ tank }) => {
        if (tank) this.spawnExplosion(tank.position, { color: tank.profile.color });
      }),
    );
    this._unsubs.push(
      this.eventBus.on('danoRecebido', ({ tank, amount }) => {
        if (!tank) return;
        this.flashTank(tank);
        this.spawnDamageMarker(tank.position, amount);
        // Tremor proporcional ao dano, apenas quando o jogador é atingido.
        if (tank.team === 'player') this.addShake(amount / 100);
      }),
    );
    this._unsubs.push(
      this.eventBus.on('tiro', ({ tank, projectile }) => {
        if (!tank) return;
        this.spawnMuzzleFlash(tank);
        if (projectile) this.attachTrail(projectile);
        if (tank.team === 'player') this.addShake(0.06);
      }),
    );
  }

  // ---- Screen shake ---------------------------------------------------------

  addShake(amount) {
    if (!this.config.screenShake || !this.camera) return;
    this._shake = Math.min(0.6, this._shake + amount * this.config.screenShakeScale);
  }

  _applyShake(dt) {
    if (!this.camera) return;
    if (this._shake > 0.001) {
      const s = this._shake;
      this.camera.position.x += (Math.random() * 2 - 1) * s;
      this.camera.position.y += (Math.random() * 2 - 1) * s * 0.5;
      this.camera.position.z += (Math.random() * 2 - 1) * s;
      this._shake = Math.max(0, this._shake - dt * 1.6);
    }
  }

  // ---- Muzzle flash + recuo do cano -----------------------------------------

  spawnMuzzleFlash(tank) {
    const yaw = tank.worldTurretYaw;
    const dir = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    const pos = tank.position.clone().addScaledVector(dir, 2.9);
    pos.y = 1.45;

    const flash = this._particlePool.pop() || this._createParticle();
    flash.mesh.position.copy(pos);
    flash.mesh.material.color.setHex(0xfff176);
    flash.mesh.material.opacity = 0.95;
    flash.mesh.scale.setScalar(1.6);
    flash.mesh.visible = true;
    flash.velocity.set(0, 0, 0);
    flash.gravity = 0;
    flash.life = this.config.muzzleFlashTime;
    flash.maxLife = this.config.muzzleFlashTime;
    this.scene.add(flash.mesh);
    this._particles.push(flash);

    // Fumaça curta saindo do cano.
    this._emitParticles(pos, 3, {
      color: 0x9e9e9e,
      speed: 2.2,
      spread: 0.35,
      life: 0.5,
      gravity: -1.5, // sobe
    });

    // Recuo do cano (animação na entidade).
    if (typeof tank.triggerRecoil === 'function') tank.triggerRecoil();
  }

  // ---- Rastro de fumaça do projétil -----------------------------------------

  attachTrail(projectile) {
    this._trails.push({ projectile, timer: 0 });
  }

  _updateTrails(dt) {
    for (let i = this._trails.length - 1; i >= 0; i--) {
      const trail = this._trails[i];
      const p = trail.projectile;
      if (!p.alive || p.life <= 0) {
        this._trails.splice(i, 1);
        continue;
      }
      trail.timer -= dt;
      if (trail.timer <= 0) {
        trail.timer = this.config.smokeTrailInterval;
        this._emitParticles(p.position, 1, {
          color: 0xbdbdbd,
          speed: 0.6,
          spread: 0.25,
          life: 0.45,
          gravity: -0.8, // fumaça sobe levemente
        });
      }
    }
  }

  // ---- Decals (marcas de impacto) -------------------------------------------

  spawnDecal(position) {
    const max = this.quality.maxDecals ?? this.config.maxDecals;
    let decal = this._decalPool.pop();
    if (!decal && this._decals.length >= max) {
      // Recicla o mais antigo.
      decal = this._decals.shift();
    }
    if (!decal) decal = this._createDecal();

    decal.mesh.position.set(position.x, 0.03, position.z);
    decal.mesh.rotation.set(-Math.PI / 2, 0, Math.random() * Math.PI * 2);
    decal.mesh.material.opacity = 0.75;
    decal.mesh.scale.setScalar(0.7 + Math.random() * 0.6);
    decal.mesh.visible = true;
    decal.life = 6;
    this.scene.add(decal.mesh);
    this._decals.push(decal);
  }

  _updateDecals(dt) {
    for (let i = this._decals.length - 1; i >= 0; i--) {
      const d = this._decals[i];
      d.life -= dt;
      if (d.life < 1.5) d.mesh.material.opacity = Math.max(0, d.life / 1.5) * 0.75;
      if (d.life <= 0) {
        this.scene.remove(d.mesh);
        d.mesh.visible = false;
        this._decalPool.push(d);
        this._decals.splice(i, 1);
      }
    }
  }

  _createDecal() {
    const material = new THREE.MeshBasicMaterial({
      color: 0x1a1a1a,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(DECAL_GEO, material);
    return { mesh, life: 6 };
  }

  // ---- Faíscas / impacto ---------------------------------------------------

  spawnImpact(position, { hit = false } = {}) {
    const color = hit ? 0xff7043 : 0xffd54f;
    this._emitParticles(position, hit ? 8 : 6, {
      color,
      speed: 6,
      spread: 0.6,
      life: 0.35,
      gravity: 14,
    });
    if (!hit) {
      // Fumaça e detritos ao acertar obstáculos/paredes.
      this._emitParticles(position, 3, {
        color: 0x8d8d8d,
        speed: 1.8,
        spread: 0.4,
        life: 0.6,
        gravity: -1.2,
      });
      this._emitParticles(position, 4, {
        color: 0x6d4c41,
        speed: 5,
        spread: 0.7,
        life: 0.5,
        gravity: 16,
      });
    }
  }

  // ---- Explosão ------------------------------------------------------------

  spawnExplosion(position, { color = 0xff9800 } = {}) {
    this._emitParticles(position, 20, {
      color,
      speed: 11,
      spread: 1.1,
      life: 0.7,
      gravity: 10,
    });
    this._emitParticles(position, 10, {
      color: 0xffe082,
      speed: 7,
      spread: 0.8,
      life: 0.5,
      gravity: 6,
    });

    // Fumaça e detritos da explosão.
    this._emitParticles(position, 8, {
      color: 0x616161,
      speed: 3,
      spread: 0.9,
      life: 1.1,
      gravity: -1.6,
    });
    this._emitParticles(position, 6, {
      color: 0x4e342e,
      speed: 8,
      spread: 1,
      life: 0.8,
      gravity: 14,
    });

    const blast = this._blastPool.pop() || this._createBlast();
    blast.mesh.position.copy(position);
    blast.mesh.position.y += 1;
    blast.mesh.material.color.setHex(color);
    blast.mesh.material.opacity = 0.7;
    blast.mesh.scale.setScalar(0.6);
    blast.mesh.visible = true;
    blast.life = 0.45;
    blast.maxLife = 0.45;
    this.scene.add(blast.mesh);
    this._blasts.push(blast);
  }

  // ---- Marcador de dano flutuante ------------------------------------------

  spawnDamageMarker(position, amount) {
    if (!amount || amount <= 0) return;
    const marker = this._markerPool.pop() || this._createMarker();
    const ctx = marker.ctx;
    ctx.clearRect(0, 0, marker.canvas.width, marker.canvas.height);
    ctx.font = 'bold 44px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(0,0,0,0.75)';
    ctx.fillStyle = '#ffd54f';
    const text = `-${Math.round(amount)}`;
    ctx.strokeText(text, marker.canvas.width / 2, marker.canvas.height / 2);
    ctx.fillText(text, marker.canvas.width / 2, marker.canvas.height / 2);
    marker.texture.needsUpdate = true;

    marker.sprite.position.copy(position);
    marker.sprite.position.y += 2.6;
    marker.material.opacity = 1;
    marker.sprite.visible = true;
    marker.life = 0.9;
    marker.maxLife = 0.9;
    this.scene.add(marker.sprite);
    this._markers.push(marker);
  }

  // ---- Flash no tanque atingido --------------------------------------------

  flashTank(tank) {
    if (this._flashes.some((f) => f.tank === tank)) return;
    const materials = [];
    tank.group.traverse((obj) => {
      if (obj.isMesh && obj.material && obj.material.emissive) {
        materials.push(obj.material);
      }
    });
    for (const mat of materials) {
      mat.emissive.setHex(0xff2222);
      mat.emissiveIntensity = 1;
    }
    this._flashes.push({ tank, materials, time: 0.18, maxTime: 0.18 });
  }

  // ---- Loop ----------------------------------------------------------------

  update(dt) {
    this._updateParticles(dt);
    this._updateBlasts(dt);
    this._updateMarkers(dt);
    this._updateFlashes(dt);
    this._updateTrails(dt);
    this._updateDecals(dt);
    this._applyShake(dt);
  }

  _updateParticles(dt) {
    for (let i = this._particles.length - 1; i >= 0; i--) {
      const p = this._particles[i];
      p.life -= dt;
      p.velocity.y -= p.gravity * dt;
      p.mesh.position.addScaledVector(p.velocity, dt);
      const t = Math.max(0, p.life / p.maxLife);
      p.mesh.material.opacity = t;
      p.mesh.scale.setScalar(0.4 + t * 0.8);
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.visible = false;
        this._particlePool.push(p);
        this._particles.splice(i, 1);
      }
    }
  }

  _updateBlasts(dt) {
    for (let i = this._blasts.length - 1; i >= 0; i--) {
      const b = this._blasts[i];
      b.life -= dt;
      const t = Math.max(0, b.life / b.maxLife);
      b.mesh.scale.setScalar(0.6 + (1 - t) * 3.2);
      b.mesh.material.opacity = t * 0.7;
      if (b.life <= 0) {
        this.scene.remove(b.mesh);
        b.mesh.visible = false;
        this._blastPool.push(b);
        this._blasts.splice(i, 1);
      }
    }
  }

  _updateMarkers(dt) {
    for (let i = this._markers.length - 1; i >= 0; i--) {
      const m = this._markers[i];
      m.life -= dt;
      m.sprite.position.y += dt * 2.2;
      m.material.opacity = Math.max(0, m.life / m.maxLife);
      if (m.life <= 0) {
        this.scene.remove(m.sprite);
        m.sprite.visible = false;
        this._markerPool.push(m);
        this._markers.splice(i, 1);
      }
    }
  }

  _updateFlashes(dt) {
    for (let i = this._flashes.length - 1; i >= 0; i--) {
      const f = this._flashes[i];
      f.time -= dt;
      const t = Math.max(0, f.time / f.maxTime);
      for (const mat of f.materials) mat.emissiveIntensity = t;
      if (f.time <= 0) {
        for (const mat of f.materials) {
          mat.emissive.setHex(0x000000);
          mat.emissiveIntensity = 0;
        }
        this._flashes.splice(i, 1);
      }
    }
  }

  // ---- Pool ----------------------------------------------------------------

  _emitParticles(position, count, { color, speed, spread, life, gravity }) {
    // Limita a quantidade conforme qualidade gráfica e teto global.
    const mul = this.quality.particleMul ?? 1;
    const max = this.config.maxParticles;
    let n = Math.max(1, Math.round(count * mul * this.config.particleIntensity));
    if (this._particles.length + n > max) n = Math.max(0, max - this._particles.length);
    for (let i = 0; i < n; i++) {
      const p = this._particlePool.pop() || this._createParticle();
      p.mesh.position.copy(position);
      p.mesh.material.color.setHex(color);
      p.mesh.material.opacity = 1;
      p.mesh.scale.setScalar(1);
      p.mesh.visible = true;
      p.velocity.set(
        (Math.random() * 2 - 1) * speed * spread,
        Math.random() * speed * spread + speed * 0.3,
        (Math.random() * 2 - 1) * speed * spread,
      );
      p.gravity = gravity;
      p.life = life * (0.7 + Math.random() * 0.6);
      p.maxLife = p.life;
      this.scene.add(p.mesh);
      this._particles.push(p);
    }
  }

  _createParticle() {
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(PARTICLE_GEO, material);
    return { mesh, velocity: new THREE.Vector3(), gravity: 10, life: 0, maxLife: 1 };
  }

  _createBlast() {
    const material = new THREE.MeshBasicMaterial({
      color: 0xff9800,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(BLAST_GEO, material);
    return { mesh, life: 0, maxLife: 1 };
  }

  _createMarker() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(2.6, 1.3, 1);
    return { sprite, canvas, ctx, texture, material, life: 0, maxLife: 1 };
  }

  clear() {
    for (const p of this._particles) {
      this.scene.remove(p.mesh);
      p.mesh.visible = false;
      this._particlePool.push(p);
    }
    this._particles.length = 0;

    for (const b of this._blasts) {
      this.scene.remove(b.mesh);
      b.mesh.visible = false;
      this._blastPool.push(b);
    }
    this._blasts.length = 0;

    for (const m of this._markers) {
      this.scene.remove(m.sprite);
      m.sprite.visible = false;
      this._markerPool.push(m);
    }
    this._markers.length = 0;

    for (const f of this._flashes) {
      for (const mat of f.materials) {
        mat.emissive.setHex(0x000000);
        mat.emissiveIntensity = 0;
      }
    }
    this._flashes.length = 0;

    for (const d of this._decals) {
      this.scene.remove(d.mesh);
      d.mesh.visible = false;
      this._decalPool.push(d);
    }
    this._decals.length = 0;
    this._trails.length = 0;
    this._shake = 0;
  }

  dispose() {
    this.clear();
    for (const unsub of this._unsubs) unsub();
    this._unsubs.length = 0;

    for (const p of this._particlePool) p.mesh.material.dispose();
    this._particlePool.length = 0;
    for (const b of this._blastPool) b.mesh.material.dispose();
    this._blastPool.length = 0;
    for (const m of this._markerPool) {
      m.texture.dispose();
      m.material.dispose();
    }
    this._markerPool.length = 0;
    for (const d of this._decalPool) d.mesh.material.dispose();
    this._decalPool.length = 0;
  }
}
