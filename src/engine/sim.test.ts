import { describe, expect, it } from 'vitest';
import { applyAction, createInitialState, tickGame, voteIsolate } from './sim';
import type { GameState } from '../types/game';

const run = (s: GameState, n: number) => {
  for (let i = 0; i < n; i++) s = tickGame(s);
  return s;
};
// Remove random hazards so physics can be tested in isolation.
const calm = (s: GameState) => ({ ...s, nextHazardInSec: 9999 });

describe('thermal / integrity model', () => {
  it('stays near 60°C when supply matches demand', () => {
    const s = run(calm(createInitialState('SOLO_CRISIS', 7)), 20);
    expect(s.nodes.hospital.temperature).toBeLessThan(65);
    expect(s.nodes.hospital.integrity).toBe(100);
  });

  it('heats +1.5°C/s when under-supplied', () => {
    let s = calm(createInitialState('SOLO_CRISIS', 7));
    s = applyAction(s, { type: 'SET_SUPPLY', nodeId: 'water', amountMW: 100 });
    const t0 = s.nodes.water.temperature;
    s = run(s, 4);
    expect(s.nodes.water.temperature).toBeCloseTo(t0 + 6, 1);
  });

  it('coolant drops temperature 5°C/s and holds 50 MW reserve', () => {
    let s = calm(createInitialState('SOLO_CRISIS', 7));
    s.nodes.water.temperature = 80;
    const before = s.reserveMW;
    s = applyAction(s, { type: 'COOLANT', nodeId: 'water' });
    expect(s.reserveMW).toBe(before - 50);
    s = run(s, 2);
    expect(s.nodes.water.temperature).toBeCloseTo(70, 0);
  });

  it('decays integrity 5%/s at ≥95°C and cascades on zero', () => {
    let s = calm(createInitialState('SOLO_CRISIS', 7));
    s.nodes.water.temperature = 100;
    s.nodes.water.integrity = 6;
    s = applyAction(s, { type: 'SET_SUPPLY', nodeId: 'water', amountMW: 0 });
    const neighbours = s.nodes.water.adjacent;
    const before = neighbours.map((id) => s.nodes[id].demand);
    s = run(s, 2);
    expect(s.nodes.water.status).toBe('BLACKOUT');
    expect(s.blackoutCount).toBe(1);
    const after = neighbours.map((id) => s.nodes[id].redistributedLoad);
    expect(after.reduce((a, b) => a + b, 0)).toBeGreaterThan(250);
    expect(neighbours.some((id, i) => s.nodes[id].demand > before[i] + 100)).toBe(true);
  });
});

describe('hazards & loop', () => {
  it('spawns hazards on a 15–20s cadence', () => {
    const s = run(createInitialState('SOLO_CRISIS', 3), 60);
    const hazardLogs = s.logs.filter((l) => l.category === 'HAZARD');
    expect(hazardLogs.length).toBeGreaterThanOrEqual(3);
    for (let i = 1; i < hazardLogs.length; i++) {
      const gap = hazardLogs[i].tick - hazardLogs[i - 1].tick;
      expect(gap).toBeGreaterThanOrEqual(15);
      expect(gap).toBeLessThanOrEqual(20);
    }
  });

  it('ends the 5-minute run', () => {
    const s = run(createInitialState('SOLO_CRISIS', 5), 300);
    expect(['VICTORY', 'DEFEAT']).toContain(s.phase);
  });
});

describe('deduction mode', () => {
  it('creates 7 engineers with exactly 2 saboteurs and logs their actions', () => {
    let s = createInitialState('SABOTEUR_DEDUCTION', 11);
    expect(s.engineers).toHaveLength(7);
    expect(s.engineers.filter((e) => e.role === 'SABOTEUR')).toHaveLength(2);
    s = run(s, 120);
    expect(s.logs.some((l) => l.source.startsWith('ENG-'))).toBe(true);
  });

  it('wins when both saboteurs are voted out, penalises wrong votes', () => {
    let s = createInitialState('SABOTEUR_DEDUCTION', 11);
    const innocent = s.engineers.find((e) => e.role === 'ENGINEER')!;
    s = voteIsolate(s, innocent.id);
    expect(s.wrongVotes).toBe(1);
    expect(s.nodes[innocent.nodeId].isolated).toBe(true);
    for (const e of s.engineers.filter((x) => x.role === 'SABOTEUR')) s = voteIsolate(s, e.id);
    expect(s.phase).toBe('VICTORY');
  });
});
