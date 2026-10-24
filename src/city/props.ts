import * as THREE from 'three';
import { mulberry32 } from '../engine/rng';
import { makeAsphaltTexture, makeGrassTexture } from './textures';

export const lam = (color: number, extra: THREE.MeshLambertMaterialParameters = {}) => new THREE.MeshLambertMaterial({ color, ...extra });

export function shadowed<T extends THREE.Object3D>(o: T, cast = true, receive = true): T {
  o.traverse((m) => {
    if ((m as THREE.Mesh).isMesh) {
      m.castShadow = cast;
      m.receiveShadow = receive;
    }
  });
  return o;
}

// ---------------------------------------------------------------------------
// Crewmate (Among Us-style) citizens
// ---------------------------------------------------------------------------

export interface Crewmate {
  group: THREE.Group;
  body: THREE.Group;
  phase: number;
  home: THREE.Vector3;
}

const CREW_COLORS = [0xe8423a, 0x3a6fe8, 0x37b24d, 0xf2c230, 0xe36ad0, 0xff8a1f, 0x39c9d6, 0xf5f5f5];

export function buildCrewmate(colorIdx: number, scale = 1): Crewmate {
  const group = new THREE.Group();
  const body = new THREE.Group();
  const color = CREW_COLORS[colorIdx % CREW_COLORS.length];
  const suit = lam(color);
  const dark = lam(new THREE.Color(color).multiplyScalar(0.7).getHex());
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.26, 4, 10), suit);
  torso.position.y = 0.42;
  const visor = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 8), new THREE.MeshLambertMaterial({ color: 0xbfeaff, emissive: 0x3b7fa8, emissiveIntensity: 0.6 }));
  visor.scale.set(1.1, 0.7, 0.55);
  visor.position.set(0, 0.52, 0.17);
  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.32, 0.12), dark);
  pack.position.set(0, 0.4, -0.2);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.16), dark);
  const legR = legL.clone();
  legL.position.set(-0.1, 0.07, 0);
  legR.position.set(0.1, 0.07, 0);
  body.add(torso, visor, pack, legL, legR);
  group.add(body);
  group.scale.setScalar(scale);
  shadowed(group, true, false);
  return { group, body, phase: Math.random() * 6, home: new THREE.Vector3() };
}

export type CrewMood = 'CALM' | 'WORRIED' | 'PANIC' | 'DOWN' | 'ISO';

export function animateCrewmate(c: Crewmate, t: number, mood: CrewMood) {
  const b = c.body;
  const p = t + c.phase;
  b.rotation.set(0, 0, 0);
  b.position.set(0, 0, 0);
  b.scale.set(1, 1, 1);
  switch (mood) {
    case 'CALM':
      b.position.y = Math.abs(Math.sin(p * 1.4)) * 0.03;
      b.rotation.y = Math.sin(p * 0.6) * 0.5;
      break;
    case 'WORRIED':
      b.position.y = Math.abs(Math.sin(p * 4)) * 0.08;
      b.rotation.z = Math.sin(p * 6) * 0.12;
      break;
    case 'PANIC':
      b.position.y = Math.abs(Math.sin(p * 8)) * 0.3;
      b.rotation.z = Math.sin(p * 10) * 0.25;
      b.rotation.y = p * 3;
      break;
    case 'DOWN':
      b.scale.set(1.15, 0.55, 1.15);
      b.rotation.z = 0.15;
      break;
    case 'ISO':
      b.position.y = Math.abs(Math.sin(p * 2)) * 0.05;
      break;
  }
}

// ---------------------------------------------------------------------------
// Ground, roads, trees, lamps
// ---------------------------------------------------------------------------

export const ROADS = {
  horizontals: [-3.2, 3.2],
  verticals: [-4.55, 4.55],
  hx: 17,
  vz: [-11.5, 4.1] as [number, number],
};

export function buildGround(scene: THREE.Scene) {
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.MeshLambertMaterial({ map: makeGrassTexture() }));
  grass.rotation.x = -Math.PI / 2;
  grass.receiveShadow = true;
  scene.add(grass);

  const asphalt = new THREE.MeshLambertMaterial({ map: makeAsphaltTexture() });
  asphalt.map!.repeat.set(8, 1);
  const curb = lam(0xc9ced8);
  const dash = new THREE.MeshBasicMaterial({ color: 0xffe066 });
  const road = (len: number, horizontal: boolean, at: number, from = 0) => {
    const w = 2.4;
    const g = new THREE.Mesh(new THREE.BoxGeometry(horizontal ? len : w, 0.06, horizontal ? w : len), asphalt);
    g.position.set(horizontal ? from : at, 0.03, horizontal ? at : from);
    g.receiveShadow = true;
    scene.add(g);
    for (const s of [-1, 1]) {
      const c = new THREE.Mesh(new THREE.BoxGeometry(horizontal ? len : 0.22, 0.1, horizontal ? 0.22 : len), curb);
      c.position.set(horizontal ? from : at + s * (w / 2 + 0.11), 0.05, horizontal ? at + s * (w / 2 + 0.11) : from);
      c.receiveShadow = true;
      scene.add(c);
    }
    const dashes = new THREE.InstancedMesh(new THREE.BoxGeometry(horizontal ? 0.55 : 0.12, 0.02, horizontal ? 0.12 : 0.55), dash, Math.floor(len / 1.3));
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < dashes.count; i++) {
      const u = from - len / 2 + 0.7 + i * 1.3;
      m4.setPosition(horizontal ? u : at, 0.07, horizontal ? at : u);
      dashes.setMatrixAt(i, m4);
    }
    scene.add(dashes);
  };
  for (const z of ROADS.horizontals) road(ROADS.hx * 2, true, z);
  const [z0, z1] = ROADS.vz;
  for (const x of ROADS.verticals) road(z1 - z0, false, x, (z0 + z1) / 2);
}

export function buildTrees(scene: THREE.Scene, avoid: (x: number, z: number) => boolean, count: number) {
  const rng = mulberry32(21);
  const trunk = new THREE.InstancedMesh(new THREE.BoxGeometry(0.26, 0.7, 0.26), lam(0x7a5230), count);
  const crown1 = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.8, 1), lam(0x3f9f3a), count);
  const crown2 = new THREE.InstancedMesh(new THREE.BoxGeometry(0.62, 0.6, 0.62), lam(0x58bd47), count);
  const m4 = new THREE.Matrix4();
  let n = 0;
  let guard = 0;
  while (n < count && guard++ < 6000) {
    const x = (rng() - 0.5) * 60;
    const z = (rng() - 0.5) * 46;
    if (avoid(x, z)) continue;
    const s = 0.7 + rng() * 0.8;
    m4.makeScale(s, s, s).setPosition(x, 0.35 * s, z);
    trunk.setMatrixAt(n, m4);
    m4.makeScale(s, s, s).setPosition(x, 0.95 * s, z);
    crown1.setMatrixAt(n, m4);
    m4.makeScale(s, s, s).setPosition(x, 1.55 * s, z);
    crown2.setMatrixAt(n, m4);
    n++;
  }
  for (const m of [trunk, crown1, crown2]) {
    m.count = n;
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
  }
}

export function buildLamps() {
  const g = new THREE.Group();
  const post = lam(0x2b3342);
  const headMat = new THREE.MeshBasicMaterial({ color: 0x777777 });
  const spots: [number, number][] = [];
  for (const z of ROADS.horizontals) for (let x = -14; x <= 14; x += 4) spots.push([x, z + (x % 8 === 0 ? 1.7 : -1.7)]);
  for (const x of ROADS.verticals) for (let z = -10; z <= 3; z += 4) spots.push([x + 1.7, z]);
  const posts = new THREE.InstancedMesh(new THREE.BoxGeometry(0.1, 1.5, 0.1), post, spots.length);
  const heads = new THREE.InstancedMesh(new THREE.BoxGeometry(0.34, 0.14, 0.34), headMat, spots.length);
  const m4 = new THREE.Matrix4();
  spots.forEach(([x, z], i) => {
    m4.setPosition(x, 0.75, z);
    posts.setMatrixAt(i, m4);
    m4.setPosition(x, 1.55, z);
    heads.setMatrixAt(i, m4);
  });
  posts.castShadow = true;
  g.add(posts, heads);
  return { group: g, update: (night: number) => headMat.color.setRGB(0.45 + night * 0.55, 0.45 + night * 0.5, 0.4) };
}

// ---------------------------------------------------------------------------
// Traffic
// ---------------------------------------------------------------------------

interface Car {
  g: THREE.Group;
  axis: 'x' | 'z';
  dir: 1 | -1;
  speed: number;
  fixed: number;
  min: number;
  max: number;
  head: THREE.MeshBasicMaterial;
}

export function buildTraffic(scene: THREE.Scene) {
  const rng = mulberry32(77);
  const colors = [0xe8423a, 0x3a6fe8, 0xf5f5f5, 0xff8a1f, 0x37b24d, 0xf2c230, 0x9b59d6];
  const cars: Car[] = [];
  const mkCar = (axis: 'x' | 'z', dir: 1 | -1, fixed: number, min: number, max: number) => {
    const g = new THREE.Group();
    const col = lam(colors[Math.floor(rng() * colors.length)]);
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.26, 1.0), col);
    body.position.y = 0.26;
    const cab = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.22, 0.5), lam(0xdfe8f2));
    cab.position.set(0, 0.5, -0.05);
    g.add(body, cab);
    const wheel = new THREE.BoxGeometry(0.12, 0.2, 0.2);
    const wm = lam(0x1a1f2b);
    for (const [x, z] of [[-0.27, 0.3], [0.27, 0.3], [-0.27, -0.3], [0.27, -0.3]]) {
      const w = new THREE.Mesh(wheel, wm);
      w.position.set(x, 0.12, z);
      g.add(w);
    }
    const head = new THREE.MeshBasicMaterial({ color: 0x666666 });
    for (const x of [-0.16, 0.16]) {
      const h = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.07, 0.03), head);
      h.position.set(x, 0.28, 0.51);
      g.add(h);
    }
    shadowed(g, true, false);
    g.rotation.y = axis === 'x' ? (dir === 1 ? Math.PI / 2 : -Math.PI / 2) : dir === 1 ? 0 : Math.PI;
    scene.add(g);
    const car: Car = { g, axis, dir, speed: 2.2 + rng() * 2.2, fixed, min, max, head };
    const t = min + rng() * (max - min);
    g.position.set(axis === 'x' ? t : fixed, 0, axis === 'x' ? fixed : t);
    cars.push(car);
  };
  for (const z of ROADS.horizontals) {
    for (let i = 0; i < 2; i++) mkCar('x', 1, z + 0.6, -ROADS.hx, ROADS.hx);
    for (let i = 0; i < 2; i++) mkCar('x', -1, z - 0.6, -ROADS.hx, ROADS.hx);
  }
  for (const x of ROADS.verticals) {
    mkCar('z', 1, x - 0.6, ROADS.vz[0], ROADS.vz[1]);
    mkCar('z', -1, x + 0.6, ROADS.vz[0], ROADS.vz[1]);
  }
  return {
    update(dt: number, night: number) {
      for (const c of cars) {
        const p = c.g.position;
        if (c.axis === 'x') {
          p.x += c.dir * c.speed * dt;
          if (p.x > c.max) p.x = c.min;
          if (p.x < c.min) p.x = c.max;
        } else {
          p.z += c.dir * c.speed * dt;
          if (p.z > c.max) p.z = c.min;
          if (p.z < c.min) p.z = c.max;
        }
        c.head.color.setRGB(0.4 + night * 0.6, 0.4 + night * 0.58, 0.35 + night * 0.3);
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Sky: sun, moon, stars and blocky clouds
// ---------------------------------------------------------------------------

export function buildSky(scene: THREE.Scene) {
  const sun = new THREE.Mesh(new THREE.BoxGeometry(7, 7, 1), new THREE.MeshBasicMaterial({ color: 0xfff1a0, fog: false }));
  const moon = new THREE.Mesh(new THREE.BoxGeometry(5, 5, 1), new THREE.MeshBasicMaterial({ color: 0xe6ecff, fog: false }));
  scene.add(sun, moon);

  const starPos: number[] = [];
  const rng = mulberry32(3);
  for (let i = 0; i < 320; i++) {
    const a = rng() * Math.PI * 2;
    const e = 0.15 + rng() * 1.2;
    const r = 95;
    starPos.push(Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r - 20);
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.9, transparent: true, opacity: 0, fog: false, sizeAttenuation: false });
  starMat.size = 2.2;
  const stars = new THREE.Points(sg, starMat);
  stars.frustumCulled = false;
  scene.add(stars);

  const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.96 });
  const clouds: THREE.Group[] = [];
  for (let i = 0; i < 14; i++) {
    const g = new THREE.Group();
    const n = 3 + Math.floor(rng() * 4);
    for (let k = 0; k < n; k++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(2 + rng() * 3, 1 + rng() * 0.9, 2 + rng() * 2.5), cloudMat);
      b.position.set(k * 2.1 - n, rng() * 0.6, (rng() - 0.5) * 2);
      g.add(b);
    }
    g.position.set((rng() - 0.5) * 90, 16 + rng() * 7, -40 + rng() * 55);
    scene.add(g);
    clouds.push(g);
  }
  const dayCloud = new THREE.Color(0xffffff);
  const stormCloud = new THREE.Color(0x6e7a8c);
  const nightCloud = new THREE.Color(0x2a3350);
  const tmp = new THREE.Color();
  return {
    clouds,
    update(dt: number, night: number, storm: number, sunDir: THREE.Vector3) {
      sun.position.copy(sunDir).multiplyScalar(80);
      sun.lookAt(0, 0, 0);
      sun.visible = night < 0.8;
      moon.position.set(-sunDir.x * 80, Math.max(20, 45 - sunDir.y * 0.5), -sunDir.z * 80 - 10);
      moon.lookAt(0, 0, 0);
      moon.visible = night > 0.25;
      starMat.opacity = Math.max(0, night - 0.35) * 1.4 * (1 - storm * 0.6);
      tmp.copy(dayCloud).lerp(stormCloud, storm * 0.85).lerp(nightCloud, night);
      cloudMat.color.copy(tmp);
      for (const c of clouds) {
        c.position.x += dt * (0.5 + storm * 1.2);
        if (c.position.x > 60) c.position.x = -60;
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Smoke / steam puffs
// ---------------------------------------------------------------------------

export function buildSmoke(scene: THREE.Scene) {
  const N = 170;
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 }), N);
  mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(N * 3), 3);
  mesh.frustumCulled = false;
  scene.add(mesh);
  interface P { life: number; max: number; x: number; y: number; z: number; vx: number; vy: number; vz: number; s: number; r: number; g: number; b: number }
  const ps: P[] = Array.from({ length: N }, () => ({ life: 0, max: 1, x: 0, y: -50, z: 0, vx: 0, vy: 0, vz: 0, s: 0, r: 1, g: 1, b: 1 }));
  let cursor = 0;
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const sc = new THREE.Vector3();
  const pos = new THREE.Vector3();
  const col = new THREE.Color();
  const kinds = {
    steam: { c: 0xf4f7fb, s: 0.32, life: 2.2, vy: 0.9 },
    smoke: { c: 0x3a3f4a, s: 0.4, life: 2.8, vy: 0.8 },
    ash: { c: 0x8a93a3, s: 0.28, life: 2.4, vy: 0.55 },
    spark: { c: 0xff9a2a, s: 0.16, life: 0.8, vy: 1.8 },
  } as const;
  return {
    emit(kind: keyof typeof kinds, x: number, y: number, z: number) {
      const k = kinds[kind];
      const p = ps[cursor++ % N];
      col.setHex(k.c);
      Object.assign(p, {
        life: k.life * (0.7 + Math.random() * 0.6), x: x + (Math.random() - 0.5) * 0.4, y, z: z + (Math.random() - 0.5) * 0.4,
        vx: (Math.random() - 0.3) * 0.3, vy: k.vy * (0.8 + Math.random() * 0.4), vz: (Math.random() - 0.5) * 0.3,
        s: k.s * (0.8 + Math.random() * 0.5), r: col.r, g: col.g, b: col.b,
      });
      p.max = p.life;
    },
    update(dt: number) {
      ps.forEach((p, i) => {
        p.life -= dt;
        if (p.life <= 0) {
          sc.set(0, 0, 0);
          m4.compose(pos.set(0, -50, 0), q, sc);
        } else {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.z += p.vz * dt;
          const k = p.life / p.max;
          const size = p.s * (1 + (1 - k) * 1.6) * Math.min(1, k * 3);
          m4.compose(pos.set(p.x, p.y, p.z), q, sc.set(size, size, size));
          col.setRGB(p.r, p.g, p.b);
          mesh.setColorAt(i, col);
        }
        mesh.setMatrixAt(i, m4);
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    },
  };
}
