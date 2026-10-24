import * as THREE from 'three';
import { buildCrewmate } from './props';

/** Shared, mutable truck state (updated every frame by the scene, read by the HUD). */
export const truck = {
  x: 4.2,
  z: 3.25,
  heading: -Math.PI / 2, // 0 faces +z
  speed: 0,
  /** Joystick input (touch): x steer -1..1, y throttle -1..1. */
  stick: { x: 0, y: 0 },
  keys: new Set<string>(),
};

export const DEPOT = { x: 0, z: 3.25, r: 1.9 };
export const MAX_FWD = 7.5;
export const MAX_REV = 3;

export function resetTruck() {
  truck.x = 4.2;
  truck.z = 3.25;
  truck.heading = -Math.PI / 2;
  truck.speed = 0;
  truck.stick.x = truck.stick.y = 0;
  truck.keys.clear();
}

export function readInput(): { steer: number; throttle: number } {
  const k = truck.keys;
  let steer = truck.stick.x;
  let throttle = truck.stick.y;
  // W A S D drive; the arrow keys pan the camera (see CityScene)
  if (k.has('KeyA')) steer -= 1;
  if (k.has('KeyD')) steer += 1;
  if (k.has('KeyW')) throttle += 1;
  if (k.has('KeyS')) throttle -= 1;
  return { steer: Math.max(-1, Math.min(1, steer)), throttle: Math.max(-1, Math.min(1, throttle)) };
}

interface Box {
  x: number;
  z: number;
  hw: number;
  hd: number;
}

/** Advance the truck by dt seconds and resolve collisions against solid boxes. */
export function stepTruck(dt: number, boxes: Box[]) {
  const { steer, throttle } = readInput();
  const accel = throttle > 0 ? 9 : throttle < 0 ? 12 : 0;
  if (throttle !== 0) truck.speed += throttle * accel * dt;
  else truck.speed -= Math.sign(truck.speed) * Math.min(Math.abs(truck.speed), 6 * dt);
  truck.speed = Math.max(-MAX_REV, Math.min(MAX_FWD, truck.speed));
  const grip = Math.max(-1, Math.min(1, truck.speed / 3));
  truck.heading -= steer * 2.0 * dt * grip;
  const nx = truck.x + Math.sin(truck.heading) * truck.speed * dt;
  const nz = truck.z + Math.cos(truck.heading) * truck.speed * dt;
  truck.x = Math.max(-14.5, Math.min(14.5, nx));
  truck.z = Math.max(-11.5, Math.min(11.5, nz));
  const R = 0.55;
  for (const b of boxes) {
    const cx = Math.max(b.x - b.hw, Math.min(truck.x, b.x + b.hw));
    const cz = Math.max(b.z - b.hd, Math.min(truck.z, b.z + b.hd));
    const dx = truck.x - cx;
    const dz = truck.z - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 < R * R) {
      const d = Math.sqrt(d2) || 0.0001;
      const push = R - d;
      // Centre inside the box: push out along the shallowest axis.
      if (d2 === 0) {
        const ox = b.hw - Math.abs(truck.x - b.x);
        const oz = b.hd - Math.abs(truck.z - b.z);
        if (ox < oz) truck.x += Math.sign(truck.x - b.x || 1) * (ox + R);
        else truck.z += Math.sign(truck.z - b.z || 1) * (oz + R);
      } else {
        truck.x += (dx / d) * push;
        truck.z += (dz / d) * push;
      }
      truck.speed *= 0.5;
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
