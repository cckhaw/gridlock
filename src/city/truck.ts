import * as THREE from 'three';
import { DISTRICT_DEFS, DISTRICT_ORDER } from '../engine/constants';
import { PAD } from './buildDistricts';
import { buildCrewmate, ROADS } from './props';

/** Shared, mutable truck state (updated every frame by the scene, read by the HUD). */
export const truck = {
  x: 4.2,
  z: 3.25,
  heading: -Math.PI / 2, // 0 faces +z
  speed: 0,
  /** Joystick input (touch): direction the player wants to go, relative to the camera (x right, y up), -1..1. */
  stick: { x: 0, y: 0 },
  /** Camera yaw on the ground plane (set by the scene every frame). */
  camYaw: Math.PI,
  keys: new Set<string>(),
};

export const DEPOT = { x: 0, z: 3.25, r: 1.9 };
export const MAX_FWD = 7.5;

export function resetTruck() {
  truck.x = 4.2;
  truck.z = 3.25;
  truck.heading = -Math.PI / 2;
  truck.speed = 0;
  truck.stick.x = truck.stick.y = 0;
  truck.keys.clear();
}

/** Desired direction relative to the camera (x right, y up): keyboard W A S D, else the joystick. */
export function inputVector(): { x: number; y: number } {
  const k = truck.keys;
  const kx = (k.has('KeyD') ? 1 : 0) - (k.has('KeyA') ? 1 : 0);
  const ky = (k.has('KeyW') ? 1 : 0) - (k.has('KeyS') ? 1 : 0);
  if (kx || ky) {
    const m = Math.hypot(kx, ky);
    return { x: kx / m, y: ky / m };
  }
  return { x: truck.stick.x, y: truck.stick.y };
}

// ---------------------------------------------------------------------------
// Drivable area: the truck stays on the streets and inside the district pads.
// ---------------------------------------------------------------------------

interface Zone {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}

const WORLD_W = 24;
const WORLD_D = 17;

export const ZONES: Zone[] = (() => {
  const z: Zone[] = [];
  const road = 1.3; // half width of a street incl. sidewalks
  for (const rz of ROADS.horizontals) z.push({ x0: -ROADS.hx, x1: ROADS.hx, z0: rz - road, z1: rz + road });
  for (const rx of ROADS.verticals) z.push({ x0: rx - road, x1: rx + road, z0: ROADS.vz[0], z1: ROADS.vz[1] + 0.4 });
  for (const id of DISTRICT_ORDER) {
    const d = DISTRICT_DEFS[id];
    const cx = (d.position.x - 0.5) * WORLD_W;
    const cz = (d.position.y - 0.5) * WORLD_D;
    const apron = 0.7; // pad plus its kerb apron, so the pad and the street overlap
    z.push({ x0: cx - PAD.w / 2 - apron, x1: cx + PAD.w / 2 + apron, z0: cz - PAD.d / 2 - apron, z1: cz + PAD.d / 2 + apron });
  }
  return z;
})();

const inZone = (x: number, zz: number, m: number) => ZONES.some((q) => x >= q.x0 + m && x <= q.x1 - m && zz >= q.z0 + m && zz <= q.z1 - m);

/** Closest point that is inside the drivable area. */
function snapToZones(x: number, zz: number, m: number): [number, number] {
  let best: [number, number] = [x, zz];
  let bd = Infinity;
  for (const q of ZONES) {
    const cx = Math.max(q.x0 + m, Math.min(x, q.x1 - m));
    const cz = Math.max(q.z0 + m, Math.min(zz, q.z1 - m));
    const d = (cx - x) ** 2 + (cz - zz) ** 2;
    if (d < bd) {
      bd = d;
      best = [cx, cz];
    }
  }
  return best;
}

const angleDiff = (a: number, b: number) => {
  let d = b - a;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return d;
};

interface Box {
  x: number;
  z: number;
  hw: number;
  hd: number;
}

/**
 * Advance the truck by dt seconds.
 * Arcade steering for keyboard (W A S D) and joystick alike: push in the direction you want to go on screen and the truck turns toward it and drives.
 * Movement is limited to streets and district pads, and solid buildings push back.
 */
export function stepTruck(dt: number, boxes: Box[]) {
  const v = inputVector();
  const mag = Math.min(1, Math.hypot(v.x, v.y));
  if (mag > 0.12) {
    const fx = Math.sin(truck.camYaw);
    const fz = Math.cos(truck.camYaw);
    const dx = -fz * v.x + fx * v.y;
    const dz = fx * v.x + fz * v.y;
    const want = Math.atan2(dx, dz);
    const diff = angleDiff(truck.heading, want);
    const turn = 6.5 * dt;
    truck.heading += Math.max(-turn, Math.min(turn, diff));
    const sharp = Math.min(1, Math.abs(diff) / (Math.PI * 0.6));
    const goal = MAX_FWD * Math.pow(mag, 0.85) * (1 - 0.55 * sharp);
    truck.speed += Math.max(-16 * dt, Math.min(12 * dt, goal - truck.speed));
  } else {
    truck.speed -= Math.sign(truck.speed) * Math.min(Math.abs(truck.speed), 14 * dt);
  }

  const R = 0.2;
  const nx = truck.x + Math.sin(truck.heading) * truck.speed * dt;
  const nz = truck.z + Math.cos(truck.heading) * truck.speed * dt;
  if (inZone(nx, nz, R)) {
    truck.x = nx;
    truck.z = nz;
  } else if (inZone(nx, truck.z, R)) {
    truck.x = nx; // slide along the kerb
    truck.speed *= 0.97;
  } else if (inZone(truck.x, nz, R)) {
    truck.z = nz;
    truck.speed *= 0.97;
  } else {
    truck.speed *= 0.6;
  }
  if (!inZone(truck.x, truck.z, R * 0.5)) [truck.x, truck.z] = snapToZones(truck.x, truck.z, R);

  const BR = 0.5;
  for (const b of boxes) {
    const cx = Math.max(b.x - b.hw, Math.min(truck.x, b.x + b.hw));
    const cz = Math.max(b.z - b.hd, Math.min(truck.z, b.z + b.hd));
    const dx = truck.x - cx;
    const dz = truck.z - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 < BR * BR) {
      const d = Math.sqrt(d2) || 0.0001;
      const push = BR - d;
      if (d2 === 0) {
        const ox = b.hw - Math.abs(truck.x - b.x);
        const oz = b.hd - Math.abs(truck.z - b.z);
        if (ox < oz) truck.x += Math.sign(truck.x - b.x || 1) * (ox + BR);
        else truck.z += Math.sign(truck.z - b.z || 1) * (oz + BR);
      } else {
        truck.x += (dx / d) * push;
        truck.z += (dz / d) * push;
      }
      truck.speed *= 0.6;
    }
  }
}

export function buildTruck() {
  const g = new THREE.Group();
  const yellow = new THREE.MeshLambertMaterial({ color: 0xffc400, emissive: new THREE.Color(0x4a3600) });
  const white = new THREE.MeshLambertMaterial({ color: 0xf6f6f6 });
  const dark = new THREE.MeshLambertMaterial({ color: 0x1a2030 });
  const orange = new THREE.MeshLambertMaterial({ color: 0xff6a00, emissive: new THREE.Color(0x401800) });
  const box = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    mesh.position.set(x, y, z);
    g.add(mesh);
    return mesh;
  };
  box(0.9, 0.3, 1.9, yellow, 0, 0.36, 0);
  box(0.92, 0.08, 1.92, white, 0, 0.22, 0);
  box(0.9, 0.34, 0.32, yellow, 0, 0.65, 0.78);
  box(0.06, 0.34, 0.7, yellow, -0.43, 0.6, 0.4);
  box(0.06, 0.34, 0.7, yellow, 0.43, 0.6, 0.4);
  box(0.8, 0.28, 0.5, orange, 0, 0.64, -0.55);
  box(0.12, 0.12, 1.3, orange, 0, 1.0, -0.4).rotation.x = -0.3;
  box(0.34, 0.12, 0.34, white, 0, 1.4, -1.0);
  const wheelGeo = new THREE.BoxGeometry(0.16, 0.34, 0.34);
  for (const [x, z] of [[-0.5, 0.6], [0.5, 0.6], [-0.5, -0.65], [0.5, -0.65]]) {
    const w = new THREE.Mesh(wheelGeo, dark);
    w.position.set(x, 0.18, z);
    g.add(w);
  }
  const beaconMat = new THREE.MeshBasicMaterial({ color: 0xffa500 });
  const beacon = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.16, 0.2), beaconMat);
  beacon.position.set(0, 0.9, 0.78);
  g.add(beacon);
  const headMat = new THREE.MeshBasicMaterial({ color: 0xfff6c8 });
  for (const x of [-0.3, 0.3]) box(0.2, 0.13, 0.05, headMat, x, 0.42, 0.96);
  const driver = buildCrewmate(0, 0.85);
  driver.group.position.set(0, 0.5, 0.35);
  g.add(driver.group);
  const spot = new THREE.SpotLight(0xfff0c0, 0, 14, 0.55, 0.5, 1.4);
  spot.position.set(0, 0.5, 0.95);
  spot.target.position.set(0, 0, 5);
  g.add(spot, spot.target);
  g.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) o.castShadow = true;
  });
  return { group: g, beaconMat, headMats: [headMat] as THREE.MeshBasicMaterial[], spot };
}
