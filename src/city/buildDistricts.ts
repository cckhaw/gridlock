import * as THREE from 'three';
import { mulberry32 } from '../engine/rng';
import type { DistrictId } from '../types/game';

export const TILE = 1.6;

export interface Accent {
  mat: THREE.MeshStandardMaterial | THREE.MeshBasicMaterial;
  base: THREE.Color;
}

export interface DistrictView {
  id: DistrictId;
  group: THREE.Group;
  wall: THREE.MeshStandardMaterial;
  windowColor: THREE.Color;
  accents: Accent[];
  rim: THREE.MeshBasicMaterial;
  light: THREE.PointLight;
  fx: THREE.PointLight;
  topY: number;
  anim: ((t: number, online: boolean) => void)[];
  intensity: number;
}

export function windowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = '#000';
  g.fillRect(0, 0, 128, 128);
  const rng = mulberry32(7);
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const on = rng() > 0.28;
      g.fillStyle = on ? `rgba(255,255,255,${0.55 + rng() * 0.45})` : 'rgba(255,255,255,0.06)';
      g.fillRect(x * 32 + 7, y * 32 + 7, 17, 19);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function litBox(w: number, h: number, d: number, mat: THREE.Material, x: number, z: number, y0 = 0) {
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
  return m;
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

export const PAD = { w: 4.8, d: 3.9 };

export function buildDistrict(id: DistrictId, tex: THREE.Texture): DistrictView {
  const rng = mulberry32(id.length * 977 + id.charCodeAt(0) * 31);
  const group = new THREE.Group();
  group.userData.id = id;
  const windowColor = new THREE.Color(WIN_COLOR[id]);
  const wall = new THREE.MeshStandardMaterial({
    color: 0x1b2438,
    roughness: 0.85,
    metalness: 0.1,
    emissive: windowColor.clone(),
    emissiveMap: tex,
    emissiveIntensity: 1,
  });
  const accents: Accent[] = [];
  const anim: DistrictView['anim'] = [];
  const accent = (hex: number, opts: Partial<THREE.MeshStandardMaterialParameters> = {}) => {
    const mat = new THREE.MeshStandardMaterial({ color: 0x20293c, emissive: new THREE.Color(hex), emissiveIntensity: 1, roughness: 0.5, ...opts });
    accents.push({ mat, base: new THREE.Color(hex) });
    return mat;
  };
  let topY = 2;

  // Pad and glowing rim
  const pad = new THREE.Mesh(new THREE.BoxGeometry(PAD.w, 0.2, PAD.d), new THREE.MeshStandardMaterial({ color: 0x141c2e, roughness: 0.9 }));
  pad.position.y = 0.1;
  group.add(pad);
  const rim = new THREE.MeshBasicMaterial({ color: 0x00f5d4 });
  const rimMesh = new THREE.Mesh(new THREE.BoxGeometry(PAD.w + 0.25, 0.1, PAD.d + 0.25), rim);
  rimMesh.position.y = 0.05;
  group.add(rimMesh);

  const add = (m: THREE.Object3D) => {
    group.add(m);
    return m;
  };

  switch (id) {
    case 'downtown': {
      for (let ix = 0; ix < 4; ix++) {
        for (let iz = 0; iz < 3; iz++) {
          if (rng() < 0.12) continue;
          const h = 1.8 + rng() * 4.6 * (1 - Math.abs(ix - 1.5) * 0.12);
          const w = 0.7 + rng() * 0.35;
          add(litBox(w, h, w, wall, (ix - 1.5) * 1.05, (iz - 1) * 1.05, 0.2));
          topY = Math.max(topY, h + 0.2);
        }
      }
      break;
    }
    case 'industrial': {
      for (let i = 0; i < 4; i++) add(litBox(1.0, 0.9 + rng() * 0.7, 1.5, wall, -1.7 + i * 1.1, 0.7, 0.2));
      add(litBox(3.6, 0.5, 0.7, wall, 0, -1.2, 0.2));
      const stackMat = accent(0xff7a2a, { emissiveIntensity: 0.6 });
      for (let i = 0; i < 3; i++) {
        const s = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.28, 2.6, 10), new THREE.MeshStandardMaterial({ color: 0x2a3144, roughness: 0.8 }));
        s.position.set(-1.2 + i * 1.2, 1.5, -0.6);
        add(s);
        const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.12, 10), stackMat);
        tip.position.set(-1.2 + i * 1.2, 2.84, -0.6);
        add(tip);
      }
      topY = 3;
      break;
    }
    case 'hospital': {
      add(litBox(2.8, 1.6, 1.3, wall, 0, 0, 0.2));
      add(litBox(1.0, 1.2, 1.0, wall, -1.7, 0.9, 0.2));
      add(litBox(1.0, 1.2, 1.0, wall, 1.7, 0.9, 0.2));
      const cross = accent(0xff2a55, { emissiveIntensity: 1.4 });
      const c1 = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, 0.28), cross);
      const c2 = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.12, 0.9), cross);
      c1.position.set(0, 1.86, 0);
      c2.position.copy(c1.position);
      add(c1);
      add(c2);
      const heli = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.06, 24), accent(0x66d9ff, { emissiveIntensity: 0.5 }));
      heli.position.set(1.7, 1.52, 0.9);
      add(heli);
      topY = 2.2;
      break;
    }
    case 'metro': {
      add(litBox(2.2, 0.9, 1.2, wall, -0.9, -0.8, 0.2));
      const track = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.12, 0.35), new THREE.MeshStandardMaterial({ color: 0x2c3650 }));
      track.position.set(0, 1.4, 0.9);
      add(track);
      for (let i = 0; i < 4; i++) {
        const p = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.2, 0.16), new THREE.MeshStandardMaterial({ color: 0x2c3650 }));
        p.position.set(-2 + i * 1.33, 0.8, 0.9);
        add(p);
      }
      const trainMat = accent(0x66b3ff, { emissiveIntensity: 1.1 });
      const train = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.38, 0.3), trainMat);
      train.position.set(0, 1.66, 0.9);
      add(train);
      anim.push((t, online) => {
        train.visible = online;
        train.position.x = Math.sin(t * 0.5) * 1.5;
      });
      topY = 2.1;
      break;
    }
    case 'residential': {
      const roofMat = new THREE.MeshStandardMaterial({ color: 0x3a2f3f, roughness: 0.9 });
      for (let ix = 0; ix < 5; ix++) {
        for (let iz = 0; iz < 3; iz++) {
          if (rng() < 0.15) continue;
          const h = 0.5 + rng() * 0.55;
          const w = 0.62;
          const x = (ix - 2) * 0.88;
          const z = (iz - 1) * 1.12;
          add(litBox(w, h, w, wall, x, z, 0.2));
          const roof = new THREE.Mesh(new THREE.ConeGeometry(w * 0.78, 0.38, 4), roofMat);
          roof.rotation.y = Math.PI / 4;
          roof.position.set(x, 0.2 + h + 0.19, z);
          add(roof);
        }
      }
      topY = 1.5;
      break;
    }
    case 'water': {
      const tankMat = accent(0x33d6ff, { emissiveIntensity: 0.5, color: 0x1c3a4d });
      for (let i = 0; i < 3; i++) {
        const t = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 1.1 + i * 0.25, 20), tankMat);
        t.position.set(-1.5 + i * 1.5, 0.2 + (1.1 + i * 0.25) / 2, -0.5);
        add(t);
      }
      add(litBox(3.8, 0.55, 0.9, wall, 0, 1.1, 0.2));
      const pool = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.05, 1.0), accent(0x1fb6ff, { emissiveIntensity: 0.7 }));
      pool.position.set(0, 0.24, 1.1);
      add(pool);
      topY = 1.8;
      break;
    }
    case 'defense': {
      add(litBox(3.0, 0.8, 1.8, wall, -0.4, 0.5, 0.2));
      add(litBox(0.8, 1.7, 0.8, wall, 1.7, -0.9, 0.2));
      const dishMat = accent(0x66ff99, { emissiveIntensity: 0.6 });
      const dish = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), dishMat);
      dish.rotation.x = -0.9;
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.6, 8), new THREE.MeshStandardMaterial({ color: 0x2c3650 }));
      const radar = new THREE.Group();
      radar.add(dish);
      radar.position.set(-1.2, 1.4, -0.9);
      mast.position.set(-1.2, 1.0, -0.9);
      add(mast);
      add(radar);
      anim.push((t, online) => {
        if (online) radar.rotation.y = t * 1.2;
      });
      topY = 2.2;
      break;
    }
    case 'research': {
      const domeMat = accent(0xb98cff, { emissiveIntensity: 0.55, transparent: true, opacity: 0.85, color: 0x30244d });
      for (let i = 0; i < 2; i++) {
        const dome = new THREE.Mesh(new THREE.SphereGeometry(0.95 - i * 0.2, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), domeMat);
        dome.position.set(-1.0 + i * 2.0, 0.2, 0.3);
        add(dome);
      }
      add(litBox(1.0, 1.3, 0.9, wall, 0.0, -1.0, 0.2));
      const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.4, 6), new THREE.MeshStandardMaterial({ color: 0x3b4660 }));
      ant.position.set(1.6, 1.4, -1.0);
      add(ant);
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), accent(0xff4466, { emissiveIntensity: 1.5 }));
      beacon.position.set(1.6, 2.65, -1.0);
      add(beacon);
      anim.push((t, online) => {
        beacon.visible = online && Math.sin(t * 4) > 0;
      });
      topY = 2.8;
      break;
    }
  }

  const light = new THREE.PointLight(WIN_COLOR[id], 6, 7, 1.6);
  light.position.set(0, 2.2, 0);
  group.add(light);
  const fx = new THREE.PointLight(0xffffff, 0, 8, 1.4);
  fx.position.set(0, 3, 0);
  group.add(fx);

  return { id, group, wall, windowColor, accents, rim, light, fx, topY, anim, intensity: 1 };
}
