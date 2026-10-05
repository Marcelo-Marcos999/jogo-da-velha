// Arena: piso, paredes de contorno e obstáculos posicionados por DADOS.
// Cada obstáculo é um descritor { x, z, w, d, h, tipo, destrutivel }.
// Nesta etapa os destrutíveis apenas colidem; a destruição entra na fase 3.

import * as THREE from 'three';
import { ARENA } from '../config.js';

// Mapa da arena (dados puros, fácil de editar/expandir nas próximas fases).
export const OBSTACLE_DESCRIPTORS = [
  { x: -14, z: -10, w: 8, d: 8, h: 3.5, tipo: 'bloco', destrutivel: false },
  { x: 14, z: -10, w: 8, d: 8, h: 3.5, tipo: 'bloco', destrutivel: false },
  { x: -14, z: 12, w: 8, d: 8, h: 3.5, tipo: 'bloco', destrutivel: false },
  { x: 14, z: 12, w: 8, d: 8, h: 3.5, tipo: 'bloco', destrutivel: false },
  { x: 0, z: -18, w: 12, d: 3, h: 2.5, tipo: 'muro', destrutivel: true },
  { x: 0, z: 18, w: 12, d: 3, h: 2.5, tipo: 'muro', destrutivel: true },
  { x: -20, z: 0, w: 3, d: 12, h: 2.5, tipo: 'muro', destrutivel: true },
  { x: 20, z: 0, w: 3, d: 12, h: 2.5, tipo: 'muro', destrutivel: true },
  { x: 0, z: 0, w: 5, d: 5, h: 4, tipo: 'torre', destrutivel: false },
];

const COLORS = {
  piso: 0x3c4a3a,
  grade: 0x556b52,
  parede: 0x4a5568,
  bloco: 0x6b7280,
  muro: 0x8a6d3b,
  torre: 0x5b6472,
};

export class Arena {
  constructor() {
    this.halfSize = ARENA.size / 2;
    this.group = new THREE.Group();
    this.group.name = 'Arena';
    this.colliders = [];

    this._buildFloor();
    this._buildWalls();
    this._buildObstacles();
  }

  _buildFloor() {
    const floorGeo = new THREE.PlaneGeometry(ARENA.size, ARENA.size);
    const floorMat = new THREE.MeshStandardMaterial({
      color: COLORS.piso,
      roughness: 0.95,
      metalness: 0,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.group.add(floor);

    const grid = new THREE.GridHelper(ARENA.size, ARENA.size / 2, COLORS.grade, COLORS.grade);
    grid.position.y = 0.02;
    grid.material.opacity = 0.25;
    grid.material.transparent = true;
    this.group.add(grid);
  }

  _buildWalls() {
    const { wallHeight, wallThickness } = ARENA;
    const h = this.halfSize;
    const len = ARENA.size + wallThickness;

    // Norte / Sul (ao longo de X)
    this._addBox(0, -h, len, wallThickness, wallHeight, COLORS.parede, false, 'parede');
    this._addBox(0, h, len, wallThickness, wallHeight, COLORS.parede, false, 'parede');
    // Leste / Oeste (ao longo de Z)
    this._addBox(-h, 0, wallThickness, len, wallHeight, COLORS.parede, false, 'parede');
    this._addBox(h, 0, wallThickness, len, wallHeight, COLORS.parede, false, 'parede');
  }

  _buildObstacles() {
    for (const desc of OBSTACLE_DESCRIPTORS) {
      const color = COLORS[desc.tipo] || COLORS.bloco;
      this._addBox(
        desc.x,
        desc.z,
        desc.w,
        desc.d,
        desc.h,
        color,
        desc.destrutivel,
        desc.tipo,
      );
    }
  }

  _addBox(x, z, w, d, h, color, destrutivel, tipo) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.85,
      metalness: 0.05,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, h / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.group.add(mesh);

    const collider = {
      minX: x - w / 2,
      maxX: x + w / 2,
      minZ: z - d / 2,
      maxZ: z + d / 2,
      height: h,
      destrutivel: !!destrutivel,
      tipo,
      mesh,
    };
    this.colliders.push(collider);
    return collider;
  }

  // Retorna o primeiro colisor atingido por um ponto (com raio opcional).
  hitsCollider(point, radius = 0) {
    for (const c of this.colliders) {
      if (point.y > c.height) continue;
      if (
        point.x >= c.minX - radius &&
        point.x <= c.maxX + radius &&
        point.z >= c.minZ - radius &&
        point.z <= c.maxZ + radius
      ) {
        return c;
      }
    }
    return null;
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
