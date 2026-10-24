import * as THREE from 'three';
import { mulberry32 } from '../engine/rng';
import type { DistrictId } from '../types/game';
import { buildCrewmate, lam, shadowed, type Crewmate } from './props';

export const TILE = 1.6;
export const PAD = { w: 4.8, d: 3.9 };

export interface Accent {
  mat: THREE.MeshLambertMaterial;
  base: THREE.Color;
  baseI: number;
}

export interface DistrictView {
  id: DistrictId;
  group: THREE.Group;
  walls: THREE.MeshLambertMaterial[];
  wallBase: THREE.Color[];
  windowColor: THREE.Color;
  accents: Accent[];
  rim: THREE.MeshBasicMaterial;
  lamp: THREE.MeshBasicMaterial;
  light: THREE.PointLight;
  fx: THREE.PointLight;
  topY: number;
  anim: ((t: number, online: boolean) => void)[];
  /** Solid footprints in group-local coordinates, for truck collisions. */
  blockers: { x: number; z: number; hw: number; hd: number }[];
  crew: Crewmate[];
  /** Smoke / steam emitters in group-local coordinates. */
  stacks: THREE.Vector3[];
}

const WIN_COLOR: Record<DistrictId, number> = {
  downtown: 0xfff0c0,
  industrial: 0xffb060,
  hospital: 0xd8f6ff,
  metro: 0xb8c8ff,
  residential: 0xffcf8a,
  water: 0x9ff0ff,
  defense: 0xc8ffc0,
  research: 0xd0b0ff,
};

const TINTS: Record<DistrictId, number[]> = {
  downtown: [0x9cc4f0, 0xb7d3f5, 0x8fb0e0, 0xc9d9f0, 0xd9c8a8],
  industrial: [0xd98a62, 0xc4724e, 0xe0a07a, 0xb86a4a],
  hospital: [0xffffff, 0xf0f6ff, 0xe4f1ff],
  metro: [0xc7b8ff, 0xaab6ff, 0xd8d0ff],
  residential: [0xffd1a8, 0xffb3b3, 0xb8e3ff, 0xd3f2b3, 0xfff0a6],
  water: [0xbfe9ff, 0xe0f4ff],
  defense: [0xa8b596, 0x95a384, 0xb8c3a8],
  research: [0xe5d4ff, 0xcfe8ff, 0xf3e8ff],
};

export function litBox(w: number, h: number, d: number, mat: THREE.Material, x: number, z: number, y0 = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  const ext = [d, d, 0, 0, w, w];
  for (let f = 0; f < 6; f++) {
    for (let v = 0; v < 4; v++) {
      const i = f * 4 + v;
      if (f === 2 || f === 3) uv.setXY(i, 0.01, 0.01);
      else uv.setXY(i, (uv.getX(i) * ext[f]) / TILE, (uv.getY(i) * h) / TILE);
    }
  }
  const m = new THREE.Mesh(g, mat);
  m.position.set(x, y0 + h / 2, z);
  m.castShadow = m.receiveShadow = true;
  return m;
}

function plainBox(w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  return m;
}

export function buildDistrict(id: DistrictId, tex: { map: THREE.Texture; mask: THREE.Texture }): DistrictView {
  const rng = mulberry32(id.length * 977 + id.charCodeAt(0) * 31);
  const group = new THREE.Group();
  group.userData.id = id;
  const windowColor = new THREE.Color(WIN_COLOR[id]);
  const wallBase = TINTS[id].map((c) => new THREE.Color(c));
  const walls = TINTS[id].map(
    (c) => new THREE.MeshLambertMaterial({ color: c, map: tex.map, emissiveMap: tex.mask, emissive: windowColor.clone(), emissiveIntensity: 0 }),
  );
  const wall = (i = Math.floor(rng() * walls.length)) => walls[i % walls.length];
  const accents: Accent[] = [];
  const anim: DistrictView['anim'] = [];
  const stacks: THREE.Vector3[] = [];
  const accent = (hex: number, emissiveI = 0.6, color = 0x2a3347, extra: THREE.MeshLambertMaterialParameters = {}) => {
    const mat = new THREE.MeshLambertMaterial({ color, emissive: new THREE.Color(hex), emissiveIntensity: emissiveI, ...extra });
    accents.push({ mat, base: new THREE.Color(hex), baseI: emissiveI });
    return mat;
  };
  const add = <T extends THREE.Object3D>(o: T) => {
    group.add(o);
    return o;
  };
  let topY = 2;

  // Pad, plaza and a chunky status curb
  add(plainBox(PAD.w, 0.2, PAD.d, lam(0xd9dee6), 0, 0.1, 0));
  add(plainBox(PAD.w - 0.5, 0.03, PAD.d - 0.5, lam(0xc3cbd8), 0, 0.215, 0));
  const rim = new THREE.MeshBasicMaterial({ color: 0x00f5d4 });
  const t = 0.2;
  for (const [w, d, x, z] of [[PAD.w + t, t, 0, PAD.d / 2], [PAD.w + t, t, 0, -PAD.d / 2], [t, PAD.d, PAD.w / 2, 0], [t, PAD.d, -PAD.w / 2, 0]] as const) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(w, 0.3, d), rim);
    c.position.set(x, 0.15, z);
    c.receiveShadow = true;
    add(c);
  }

  const tree = (x: number, z: number, s = 1) => {
    const g = new THREE.Group();
    g.add(plainBox(0.18 * s, 0.5 * s, 0.18 * s, lam(0x7a5230), 0, 0.45 * s, 0), plainBox(0.7 * s, 0.55 * s, 0.7 * s, lam(0x3f9f3a), 0, 0.95 * s, 0), plainBox(0.45 * s, 0.4 * s, 0.45 * s, lam(0x58bd47), 0, 1.38 * s, 0));
    g.position.set(x, 0.2, z);
    add(g);
  };

  switch (id) {
    case 'downtown': {
      for (let ix = 0; ix < 4; ix++) {
        for (let iz = 0; iz < 3; iz++) {
          if (rng() < 0.1) continue;
          const h = 1.7 + rng() * 3.6;
          const w = 0.72 + rng() * 0.3;
          const x = (ix - 1.5) * 1.05;
          const z = (iz - 1) * 1.05;
          const mat = wall();
          add(litBox(w, h, w, mat, x, z, 0.2));
          const h2 = 0.5 + rng() * 0.9;
          add(litBox(w * 0.65, h2, w * 0.65, mat, x, z, 0.2 + h));
          add(plainBox(0.06, 0.45, 0.06, lam(0x30394c), x, 0.2 + h + h2 + 0.22, z));
          topY = Math.max(topY, h + h2 + 0.3);
        }
      }
      add(litBox(0.95, 6.2, 0.95, wall(0), 0.52, -0.05, 0.2));
      add(plainBox(0.5, 0.5, 0.5, accent(0xffd36b, 1.2, 0xffd36b), 0.52, 6.65, -0.05));
      topY = 6.9;
      break;
    }
    case 'industrial': {
      for (let i = 0; i < 4; i++) {
        add(litBox(1.0, 0.9 + rng() * 0.6, 1.5, wall(), -1.7 + i * 1.1, 0.8, 0.2));
        add(plainBox(1.04, 0.14, 1.54, lam(0x4a5468), -1.7 + i * 1.1, 1.2 + rng() * 0.0 + 0.6, 0.8));
      }
      add(litBox(3.6, 0.5, 0.7, wall(0), 0, -1.35, 0.2));
      add(plainBox(0.8, 0.5, 0.5, lam(0xff8a1f), 1.2, 0.45, -0.5));
      const stackTop = accent(0xff7a2a, 0.7, 0x333b4d);
      for (let i = 0; i < 3; i++) {
        const x = -1.2 + i * 1.2;
        for (let k = 0; k < 4; k++) add(plainBox(0.42 - k * 0.03, 0.55, 0.42 - k * 0.03, lam(k % 2 ? 0xf2f2f2 : 0xd8453a), x, 0.5 + k * 0.55, -0.7));
        add(plainBox(0.34, 0.14, 0.34, stackTop, x, 2.75, -0.7));
        stacks.push(new THREE.Vector3(x, 2.95, -0.7));
      }
      add(plainBox(1.1, 0.9, 1.1, lam(0xb7bfcc), 1.6, 0.65, 1.0));
      topY = 3.1;
      break;
    }
    case 'hospital': {
      const white = wall(0);
      add(litBox(2.8, 1.7, 1.3, white, 0, 0, 0.2));
      add(litBox(1.0, 1.2, 1.0, wall(1), -1.7, 0.9, 0.2));
      add(litBox(1.0, 1.2, 1.0, wall(2), 1.7, 0.9, 0.2));
      const cross = accent(0xff2a55, 1.1, 0xff2a55);
      add(plainBox(0.9, 0.1, 0.28, cross, 0, 1.95, 0));
      add(plainBox(0.28, 0.1, 0.9, cross, 0, 1.95, 0));
      const cf = new THREE.Group();
      cf.add(plainBox(0.8, 0.22, 0.04, cross, 0, 0, 0), plainBox(0.22, 0.8, 0.04, cross, 0, 0, 0));
      cf.position.set(0, 1.2, 0.67);
      add(cf);
      add(plainBox(1.0, 0.05, 1.0, lam(0x4f8fe0), 1.7, 1.52, 1.1));
      add(plainBox(0.5, 0.06, 0.08, lam(0xffffff), 1.7, 1.56, 1.1));
      const amb = new THREE.Group();
      amb.add(plainBox(0.7, 0.3, 0.38, lam(0xffffff), 0, 0.25, 0), plainBox(0.7, 0.08, 0.4, lam(0xe8423a), 0, 0.3, 0));
      amb.position.set(-1.0, 0.2, 1.5);
      add(amb);
      tree(-2.1, -1.5, 0.9);
      topY = 2.2;
      break;
    }
    case 'metro': {
      add(litBox(2.2, 0.95, 1.2, wall(), -0.9, -0.8, 0.2));
      add(plainBox(2.3, 0.1, 1.3, accent(0x66b3ff, 0.3, 0x7fb6f5, { transparent: true, opacity: 0.85 }), -0.9, 1.2, -0.8));
      add(plainBox(4.6, 0.14, 0.4, lam(0x8b94a8), 0, 1.4, 0.95));
      for (let i = 0; i < 4; i++) add(plainBox(0.18, 1.2, 0.18, lam(0x8b94a8), -2 + i * 1.33, 0.8, 0.95));
      add(plainBox(4.6, 0.04, 0.08, lam(0xffd400), 0, 1.5, 0.75));
      const trainMat = accent(0xff5a5a, 0.45, 0xe8423a);
      const train = new THREE.Group();
      train.add(plainBox(1.5, 0.4, 0.34, trainMat, 0, 0, 0), plainBox(1.3, 0.12, 0.3, lam(0xffffff), 0, 0.26, 0), plainBox(1.46, 0.1, 0.36, lam(0xf5f5f5), 0, 0.05, 0));
      train.position.set(0, 1.72, 0.95);
      add(train);
      anim.push((tm, online) => {
        train.visible = online;
        train.position.x = Math.sin(tm * 0.5) * 1.5;
        train.rotation.y = Math.cos(tm * 0.5) > 0 ? 0 : Math.PI;
      });
      tree(1.9, -1.3, 1);
      topY = 2.2;
      break;
    }
    case 'residential': {
      const roofs = [lam(0xc0504d), lam(0x8a5a44), lam(0x4b6ea8), lam(0x6b8e4e)];
      for (let ix = 0; ix < 5; ix++) {
        for (let iz = 0; iz < 3; iz++) {
          if (rng() < 0.15) continue;
          const h = 0.55 + rng() * 0.5;
          const w = 0.66;
          const x = (ix - 2) * 0.9;
          const z = (iz - 1) * 1.15;
          add(litBox(w, h, w, wall(), x, z, 0.2));
          const roof = new THREE.Mesh(new THREE.ConeGeometry(w * 0.78, 0.42, 4), roofs[Math.floor(rng() * roofs.length)]);
          roof.rotation.y = Math.PI / 4;
          roof.position.set(x, 0.2 + h + 0.21, z);
          roof.castShadow = true;
          add(roof);
          if (rng() < 0.35) tree(x + 0.45, z + 0.5, 0.55);
        }
      }
      topY = 1.6;
      break;
    }
    case 'water': {
      const tankMat = accent(0x33d6ff, 0.35, 0x8fd8f0);
      for (let i = 0; i < 3; i++) {
        const h = 1.1 + i * 0.25;
        const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, h, 14), tankMat);
        tank.position.set(-1.5 + i * 1.5, 0.2 + h / 2, -0.5);
        tank.castShadow = true;
        add(tank);
        const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.76, 0.76, 0.1, 14), lam(0xdfe6ee));
        lid.position.set(-1.5 + i * 1.5, 0.25 + h, -0.5);
        add(lid);
      }
      add(litBox(3.8, 0.55, 0.9, wall(), 0, 1.15, 0.2));
      add(plainBox(3.4, 0.05, 1.0, accent(0x1fb6ff, 0.5, 0x2fa8ee), 0, 0.24, 1.15));
      add(plainBox(3.0, 0.14, 0.14, lam(0x9aa5b8), 0, 0.7, 0.5));
      topY = 1.9;
      break;
    }
    case 'defense': {
      add(litBox(3.0, 0.85, 1.8, wall(0), -0.4, 0.5, 0.2));
      add(litBox(0.8, 1.8, 0.8, wall(1), 1.7, -0.9, 0.2));
      add(plainBox(1.0, 0.4, 1.0, lam(0x5b6a4a), 1.7, 2.2, -0.9));
      const dishMat = accent(0x66ff99, 0.5, 0xdfe6ee);
      const radar = new THREE.Group();
      radar.add(new THREE.Mesh(new THREE.SphereGeometry(0.6, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), dishMat));
      radar.children[0].rotation.x = -0.9;
      radar.position.set(-1.2, 1.55, -0.9);
      add(radar);
      add(plainBox(0.1, 0.7, 0.1, lam(0x9aa5b8), -1.2, 1.15, -0.9));
      anim.push((tm, online) => {
        if (online) radar.rotation.y = tm * 1.2;
      });
      add(plainBox(0.07, 1.4, 0.07, lam(0xdddddd), -2.0, 0.9, 1.4));
      add(plainBox(0.5, 0.3, 0.04, lam(0xe8423a), -1.76, 1.45, 1.4));
      const tank = new THREE.Group();
      tank.add(plainBox(0.7, 0.22, 0.5, lam(0x6f7f4f), 0, 0.2, 0), plainBox(0.35, 0.18, 0.3, lam(0x7d8f5a), 0, 0.4, 0), plainBox(0.5, 0.06, 0.06, lam(0x4d5a38), 0.4, 0.4, 0));
      tank.position.set(1.2, 0.2, 1.3);
      tank.rotation.y = -0.5;
      add(tank);
      for (let i = 0; i < 4; i++) add(plainBox(0.3, 0.14, 0.18, lam(0xcdb98a), -0.5 + i * 0.28, 0.27, 1.5));
      topY = 2.6;
      break;
    }
    case 'research': {
      const domeMat = accent(0xb98cff, 0.4, 0xeaf3ff, { transparent: true, opacity: 0.8 });
      for (let i = 0; i < 2; i++) {
        const dome = new THREE.Mesh(new THREE.SphereGeometry(0.95 - i * 0.2, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), domeMat);
        dome.position.set(-1.0 + i * 2.0, 0.2, 0.3);
        dome.castShadow = true;
        add(dome);
      }
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), accent(0xd9b3ff, 1.4, 0xd9b3ff));
      orb.position.set(-1.0, 0.65, 0.3);
      add(orb);
      add(litBox(1.0, 1.3, 0.9, wall(0), 0, -1.0, 0.2));
      add(litBox(0.9, 0.8, 0.8, wall(1), 1.2, -1.1, 0.2));
      add(plainBox(0.06, 2.4, 0.06, lam(0x9aa5b8), 1.8, 1.4, -1.0));
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), accent(0xff4466, 1.6, 0xff4466));
      beacon.position.set(1.8, 2.65, -1.0);
      add(beacon);
      anim.push((tm, online) => {
        beacon.visible = online && Math.sin(tm * 4) > 0;
      });
      tree(2.0, 1.4, 0.9);
      topY = 2.9;
      break;
    }
  }

  // Rooftop status lamp: readable in daylight
  const lamp = new THREE.MeshBasicMaterial({ color: 0x00f5d4 });
  const pole = plainBox(0.08, 0.5, 0.08, lam(0x2b3342), PAD.w / 2 - 0.45, topY + 0.25 - 0.9 + 0.5, PAD.d / 2 - 0.4);
  pole.position.y = 1.1;
  add(pole);
  const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), lamp);
  bulb.position.set(PAD.w / 2 - 0.45, 1.5, PAD.d / 2 - 0.4);
  add(bulb);
  anim.push((tm) => {
    bulb.rotation.y = tm * 2;
    bulb.position.y = 1.5 + Math.sin(tm * 3) * 0.05;
  });
  if (id !== 'hospital') tree(-PAD.w / 2 + 0.4, PAD.d / 2 - 0.4, 0.8);

  // Citizens (crewmates)
  const crew: Crewmate[] = [];
  for (let i = 0; i < 3; i++) {
    const c = buildCrewmate(Math.floor(rng() * 8), 1.05);
    c.home.set(-1.2 + i * 1.2, 0.2, PAD.d / 2 - 0.45);
    c.group.position.copy(c.home);
    add(c.group);
    crew.push(c);
  }

  const light = new THREE.PointLight(WIN_COLOR[id], 0, 7, 1.6);
  light.position.set(0, 2.2, 0);
  group.add(light);
  const fx = new THREE.PointLight(0xffffff, 0, 8, 1.4);
  fx.position.set(0, 3, 0);
  group.add(fx);

  const blockers: DistrictView['blockers'] = [];
  for (const o of group.children) {
    const m = o as THREE.Mesh;
    if (!m.isMesh || o === pole) continue;
    const gp = m.geometry;
    if (gp instanceof THREE.BoxGeometry && gp.parameters.height > 0.45 && m.position.y - gp.parameters.height / 2 < 0.4) {
      blockers.push({ x: m.position.x, z: m.position.z, hw: gp.parameters.width / 2, hd: gp.parameters.depth / 2 });
    } else if (gp instanceof THREE.CylinderGeometry && gp.parameters.height > 0.8 && gp.parameters.radiusTop >= 0.2) {
      blockers.push({ x: m.position.x, z: m.position.z, hw: gp.parameters.radiusTop, hd: gp.parameters.radiusTop });
    }
  }
  shadowed(group, true, true);
  return { id, group, walls, wallBase, windowColor, accents, rim, lamp, light, fx, topY, anim, blockers, crew, stacks };
}
