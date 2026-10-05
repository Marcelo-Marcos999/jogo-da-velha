// Impactos e feedback visual (Etapa 3).
// Faíscas no ponto de colisão, flash curto no tanque atingido, marcador de
// dano flutuante e explosão simples ao destruir um tanque. Todos os efeitos
// usam pool de objetos reciclados para não vazar memória.

import * as THREE from 'three';

const PARTICLE_GEO = new THREE.SphereGeometry(0.16, 6, 6);
const BLAST_GEO = new THREE.SphereGeometry(1, 12, 12);

export class EffectsSystem {
  constructor(scene, eventBus) {
    this.scene = scene;
    this.eventBus = eventBus;

    this._particles = []; // ativos
    this._particlePool = []; // reciclados
    this._blasts = [];
    this._blastPool = [];
    this._markers = [];
    this._markerPool = [];
    this._flashes = [];

    this._unsubs = [];
    this._unsubs.push(
      this.eventBus.on('impacto', ({ position, target }) => {
        this.spawnImpact(position, { hit: !!target });
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
      }),
    );
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
    for (let i = 0; i < count; i++) {
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
  }
}
