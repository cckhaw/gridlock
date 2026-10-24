import { targetNight } from '../city/timeOfDay';
import { useGame } from '../store/useGame';
import { music, type TrackId } from './music';

let lastTense = -1e9;

function pick(): TrackId {
  const s = useGame.getState();
  const g = s.g;
  if (g.phase === 'MENU' || g.phase === 'VICTORY' || g.phase === 'DEFEAT') return 'menu';
  const now = performance.now();
  const danger =
    Object.values(g.nodes).some((n) => n.status === 'CRITICAL' || n.status === 'BLACKOUT') ||
    g.hazards.some((h) => h.type === 'LIGHTNING_STRIKE' || h.type === 'TRANSFORMER_BLOWOUT') ||
    (g.mode !== 'PRACTICE' && g.timeRemainingSec <= 20);
  if (danger) lastTense = now;
  if (now - lastTense < 8000) return 'tension';
  if (g.mode === 'SABOTEUR_DEDUCTION') return 'investigate';
  return targetNight(g) > 0.55 ? 'night' : 'day';
}

/** Chooses the background track from game state and unlocks audio on the first gesture. */
export function startMusicDirector() {
  const unlock = () => {
    music.unlock();
    music.play(pick());
  };
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });
  let last: TrackId | null = null;
  const update = () => {
    const t = pick();
    if (t !== last) {
      last = t;
      music.play(t);
    }
  };
  (window as unknown as { __music?: typeof music }).__music = music;
  useGame.subscribe(update);
  update();
  document.addEventListener('visibilitychange', () => (document.hidden ? music.suspend() : music.resume()));
}
