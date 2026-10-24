import { useMemo } from 'react';
import { currentObjective } from '../engine/sim';
import { useGame } from '../store/useGame';

/** One-line "what should I do now" strip shown on tabs where the city banner is not visible. */
export default function ObjectiveStrip() {
  const g = useGame((s) => s.g);
  const o = useMemo(() => currentObjective(g), [g]);
  const icon = o.kind === 'DELIVER' ? '🟢' : o.kind === 'PICKUP' ? '🟡' : o.kind === 'INVESTIGATE' ? '🕵️' : '⏳';
  return (
    <div className="mb-3 flex items-center gap-2 rounded-xl border border-white/15 bg-black/40 px-3 py-2">
      <span>{icon}</span>
      <div className="min-w-0">
        <div className="font-hud text-sm font-bold uppercase leading-tight tracking-wide">{o.title}</div>
        <div className="text-[11px] leading-tight text-scada-dim">{o.detail} {o.kind !== 'INVESTIGATE' && 'Go to the CITY tab to drive.'}</div>
      </div>
    </div>
  );
}
