import { progress } from '../engine/sim';
import type { GameState } from '../types/game';

export const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Target night factor 0..1 for the AUTO day/night cycle. */
export function autoNight(g: GameState): number {
  if (g.mode === 'PRACTICE') return smooth(0.35, 0.65, 0.5 - 0.5 * Math.cos((g.tick / 240) * Math.PI * 2));
  return smooth(0.3, 0.72, progress(g));
}

export function targetNight(g: GameState): number {
  const tod = g.settings.timeOfDay;
  return tod === 'DAY' ? 0 : tod === 'NIGHT' ? 1 : autoNight(g);
}
