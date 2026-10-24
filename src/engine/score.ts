import type { GameState } from '../types/game';
import { DIFFICULTY } from './constants';

export type Grade = 'S' | 'A' | 'B' | 'C' | 'D' | 'F';

export interface ScoreLine {
  label: string;
  points: number;
}

export interface ScoreResult {
  lines: ScoreLine[];
  subtotal: number;
  multiplier: number;
  total: number;
  grade: Grade;
}

const THRESHOLDS: [number, Grade][] = [
  [9000, 'S'],
  [7000, 'A'],
  [5000, 'B'],
  [3000, 'C'],
  [1500, 'D'],
];

export function computeScore(s: GameState): ScoreResult {
  const win = s.phase === 'VICTORY';
  const avgHealth = s.tick > 0 ? s.stats.healthSum / s.tick : 100;
  const lines: ScoreLine[] = [
    { label: 'Survival time', points: Math.round(Math.min(1, s.tick / s.durationSec) * 3000) },
    { label: 'Average grid health', points: Math.round(avgHealth * 25) },
    { label: 'Final grid health', points: Math.round(s.gridHealth * 10) },
    { label: 'Blackouts', points: -s.blackoutCount * 400 },
  ];
  if (s.mode === 'SABOTEUR_DEDUCTION') {
    const found = s.votes.filter((v) => v.correct).length;
    lines.push({ label: 'Saboteurs caught', points: found * 1500 });
    lines.push({ label: 'Innocents isolated', points: -s.wrongVotes * 600 });
    if (win) lines.push({ label: 'Speed bonus', points: Math.round(s.timeRemainingSec * 8) });
  } else if (win) {
    lines.push({ label: 'Storm survived', points: 1500 });
  }
  lines.push({ label: 'Repair deliveries', points: s.crew.deliveries * 120 });
  lines.push({ label: 'Districts restored', points: s.crew.revives * 250 });
  if (win) lines.push({ label: 'Clean sweep (no blackouts)', points: s.blackoutCount === 0 ? 1000 : 0 });
  const subtotal = Math.max(0, lines.reduce((a, l) => a + l.points, 0));
  const multiplier = DIFFICULTY[s.difficulty].scoreMult;
  const total = Math.round(subtotal * multiplier);
  const grade = win ? (THRESHOLDS.find(([t]) => total >= t)?.[1] ?? 'F') : total >= 1500 ? 'D' : 'F';
  return { lines, subtotal, multiplier, total, grade };
}
