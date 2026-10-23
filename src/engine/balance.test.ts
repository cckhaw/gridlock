import { describe, expect, it } from 'vitest';
import { computeScore } from './score';
import { applyAction, createInitialState, nodeList, tickGame } from './sim';
import type { Difficulty, GameState } from '../types/game';

/** A player limited to `apm` actions per second, prioritising the most urgent node. */
function attentivePlayer(s: GameState, apm: number): GameState {
  const urgent = nodeList(s)
    .filter((n) => n.status !== 'BLACKOUT' && !n.isolated)
    .map((n) => ({ n, u: (n.temperature >= 72 ? 100 + n.temperature : 0) + Math.max(0, n.demand - n.supply) }))
    .filter((x) => x.u > 3)
    .sort((a, b) => b.u - a.u)
    .slice(0, apm);
  for (const { n } of urgent) {
    if (n.temperature >= 72 && !n.coolantActive && n.coolantCooldown <= 0) {
      const t = applyAction(s, { type: 'COOLANT', nodeId: n.id });
      if (t !== s) {
        s = t;
        continue;
      }
    }
    s = applyAction(s, { type: 'SET_SUPPLY', nodeId: n.id, amountMW: Math.ceil(n.demand) + 1 });
  }
  return s;
}

function winRate(d: Difficulty, apm: number, n = 10) {
  let wins = 0;
  for (let seed = 1; seed <= n; seed++) {
    let s = createInitialState('SOLO_CRISIS', seed, undefined, d);
    while (s.phase === 'RUNNING') s = attentivePlayer(tickGame(s), apm);
    if (s.phase === 'VICTORY') wins++;
  }
  return wins / n;
}

describe('difficulty balance (solo, attentive player)', () => {
  it('orders difficulties and keeps each in a playable band', () => {
    const cadet = winRate('CADET', 1);
    const operator = winRate('OPERATOR', 1);
    const veteran = winRate('VETERAN', 2);
    expect(cadet).toBeGreaterThanOrEqual(0.8);
    expect(operator).toBeGreaterThanOrEqual(0.4);
    expect(operator).toBeLessThan(cadet + 0.01);
    expect(veteran).toBeLessThan(0.7);
    expect(veteran).toBeGreaterThan(0);
  });

  it('a passive player always loses', () => {
    for (const d of ['CADET', 'OPERATOR', 'VETERAN'] as Difficulty[]) {
      let s = createInitialState('SOLO_CRISIS', 1, undefined, d);
      while (s.phase === 'RUNNING') s = tickGame(s);
      expect(s.phase).toBe('DEFEAT');
    }
  });
});

describe('scoring', () => {
  it('grades a clean win above a loss and applies the difficulty multiplier', () => {
    const win = createInitialState('SOLO_CRISIS', 1, undefined, 'VETERAN');
    win.phase = 'VICTORY';
    win.tick = 300;
    win.gridHealth = 90;
    win.stats.healthSum = 90 * 300;
    const w = computeScore(win);
    const loss = { ...win, phase: 'DEFEAT' as const, tick: 60, blackoutCount: 4, gridHealth: 20, stats: { ...win.stats, healthSum: 40 * 60 } };
    const l = computeScore(loss);
    expect(w.total).toBeGreaterThan(l.total);
    expect(w.multiplier).toBe(1.5);
    expect(['S', 'A']).toContain(w.grade);
    expect(l.grade).toBe('F');
  });
});
