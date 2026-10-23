import { useEffect } from 'react';
import { C } from '../engine/constants';
import { useGame } from '../store/useGame';

/** Drives the 1000ms tick engine while the game is running. */
export function useGameLoop() {
  const running = useGame((s) => s.g.phase === 'RUNNING');
  const tick = useGame((s) => s.tick);
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(tick, C.TICK_MS);
    return () => window.clearInterval(id);
  }, [running, tick]);
}
