import { describe, expect, it } from 'vitest';
import { DISTRICT_DEFS, DISTRICT_ORDER } from '../engine/constants';
import { resetTruck, stepTruck, truck, ZONES } from './truck';

const inside = (x: number, z: number) => ZONES.some((q) => x >= q.x0 - 0.01 && x <= q.x1 + 0.01 && z >= q.z0 - 0.01 && z <= q.z1 + 0.01);

describe('truck stays on the streets', () => {
  it('never leaves the drivable area, even when pushed at the grass', () => {
    resetTruck();
    truck.camYaw = Math.PI;
    for (const dir of [
      { x: 0, y: 1 },
      { x: 1, y: 0 },
      { x: 0, y: -1 },
      { x: -1, y: 0.4 },
      { x: 0.7, y: 0.7 },
    ]) {
      truck.stick.x = dir.x;
      truck.stick.y = dir.y;
      for (let i = 0; i < 600; i++) {
        stepTruck(1 / 60, []);
        expect(inside(truck.x, truck.z)).toBe(true);
      }
    }
  });

  it('can steer to every district from the depot', () => {
    for (const id of DISTRICT_ORDER) {
      resetTruck();
      truck.camYaw = Math.PI;
      const d = DISTRICT_DEFS[id];
      const tx = (d.position.x - 0.5) * 24;
      const tz = (d.position.y - 0.5) * 17;
      // simple pilot: head along the streets (x first on the horizontal street, then z)
      let reached = false;
      for (let i = 0; i < 60 * 40 && !reached; i++) {
        const dx = tx - truck.x;
        const dz = tz - truck.z;
        // screen-up is -z when camYaw = PI, screen-right is +x
        const onStreet = Math.abs(truck.z - 3.25) < 1 || Math.abs(truck.z + 3.2) < 1;
        const vx = Math.abs(dx) > 0.4 && (onStreet || Math.abs(dz) < 1.5) ? Math.sign(dx) : 0;
        const vz = vx === 0 ? Math.sign(dz) : 0;
        truck.stick.x = vx;
        truck.stick.y = -vz;
        stepTruck(1 / 60, []);
        reached = Math.hypot(tx - truck.x, tz - truck.z) < 1.8;
      }
      expect(reached, `reach ${id}`).toBe(true);
    }
  });
});
