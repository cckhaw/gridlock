import * as THREE from 'three';

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
  if (k.has('KeyA') || k.has('ArrowLeft')) steer -= 1;
  if (k.has('KeyD') || k.has('ArrowRight')) steer += 1;
  if (k.has('KeyW') || k.has('ArrowUp')) throttle += 1;
  if (k.has('KeyS') || k.has('ArrowDown')) throttle -= 1;
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
  const yellow = new THREE.MeshStandardMaterial({ color: 0xffc400, roughness: 0.5, metalness: 0.1, emissive: 0x7a5a00, emissiveIntensity: 1 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1a2030, roughness: 0.8 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.4, 1.3), yellow);
  body.position.set(0, 0.45, -0.25);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.5, 0.6), yellow);
  cab.position.set(0, 0.52, 0.55);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.22, 0.05), new THREE.MeshStandardMaterial({ color: 0x0a1626, emissive: 0x2a5a8a, emissiveIntensity: 0.6 }));
  glass.position.set(0, 0.62, 0.86);
  const boom = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 1.2), new THREE.MeshStandardMaterial({ color: 0xff6a00, emissive: 0x401800 }));
  boom.position.set(0, 0.8, -0.3);
  boom.rotation.x = -0.25;
  const wheelGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.16, 14);
  wheelGeo.rotateZ(Math.PI / 2);
  for (const [x, z] of [[-0.45, 0.55], [0.45, 0.55], [-0.45, -0.65], [0.45, -0.65]]) {
    const w = new THREE.Mesh(wheelGeo, dark);
    w.position.set(x, 0.22, z);
    g.add(w);
  }
  const beaconMat = new THREE.MeshBasicMaterial({ color: 0xffa500 });
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), beaconMat);
  beacon.position.set(0, 0.86, 0.5);
  const head = new THREE.MeshBasicMaterial({ color: 0xfff6c8 });
  for (const x of [-0.28, 0.28]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.04), head);
    h.position.set(x, 0.42, 0.87);
    g.add(h);
  }
  const spot = new THREE.SpotLight(0xfff0c0, 55, 14, 0.55, 0.5, 1.4);
  spot.position.set(0, 0.5, 0.9);
  spot.target.position.set(0, 0, 5);
  g.add(spot, spot.target);
  g.add(body, cab, glass, boom, beacon);
  return { group: g, beaconMat };
}
