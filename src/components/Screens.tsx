import { Radio, Siren, Users } from 'lucide-react';
import { useGame } from '../store/useGame';
import type { GameMode } from '../types/game';

export function MenuScreen() {
  const start = useGame((s) => s.start);
  const crt = useGame((s) => s.g.settings.crtScanlines);
  const toggleCrt = useGame((s) => s.toggleCrt);
  const Mode = ({ mode, title, desc, Icon }: { mode: GameMode; title: string; desc: string; Icon: typeof Siren }) => (
    <button onClick={() => start(mode)} className="touch-target scada-panel flex w-full items-start gap-3 border border-scada-cobalt/60 p-4 text-left">
      <Icon size={28} className="mt-0.5 shrink-0 text-scada-cobalt" />
      <span>
        <span className="block text-sm font-bold text-scada-cobalt text-glow-cobalt">{title}</span>
        <span className="block text-xs text-scada-dim">{desc}</span>
      </span>
    </button>
  );
  return (
    <main className="pt-safe pb-safe mx-auto flex min-h-full max-w-md flex-col justify-center gap-4 p-5">
      <div>
        <div className="flex items-center gap-2 text-scada-mint"><Radio size={20} /><span className="text-[11px]">SCADA // GRID CONTROL</span></div>
        <h1 className="text-3xl font-bold text-scada-mint text-glow-mint">BLACKOUT<br />PROTOCOL</h1>
        <p className="mt-2 text-xs text-scada-dim">Eight districts. Five minutes. Keep supply matched to demand, flush heat before integrity fails, and stop the cascade.</p>
      </div>
      <Mode mode="SOLO_CRISIS" title="SOLO CRISIS" Icon={Siren} desc="Run all 8 districts through an escalating 5:00 storm. Hazards strike every 15–20s." />
      <Mode mode="SABOTEUR_DEDUCTION" title="VS AI SABOTEURS" Icon={Users} desc="Run one district beside 7 AI engineers. Two are saboteurs — read the telemetry log, scan, and vote them out." />
      <button onClick={toggleCrt} className="touch-target text-xs text-scada-dim">CRT scanlines: <b className={crt ? 'text-scada-mint' : ''}>{crt ? 'ON' : 'OFF'}</b></button>
    </main>
  );
}

export function EndScreen() {
  const g = useGame((s) => s.g);
  const toMenu = useGame((s) => s.toMenu);
  const start = useGame((s) => s.start);
  const win = g.phase === 'VICTORY';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-scada-bg/90 p-5">
      <div className={`scada-panel w-full max-w-md border p-5 ${win ? 'border-scada-mint shadow-glow-mint' : 'border-scada-crimson shadow-glow-crimson'}`}>
        <h2 className={`text-2xl font-bold ${win ? 'text-scada-mint text-glow-mint' : 'text-scada-crimson text-glow-crimson'}`}>{win ? 'GRID SECURED' : 'GRID FAILURE'}</h2>
        <p className="mt-1 text-xs text-scada-dim">{g.endReason}</p>
        <div className="my-3 grid grid-cols-3 gap-2 text-center text-xs">
          <div><div className="text-scada-dim">HEALTH</div><b>{g.gridHealth}%</b></div>
          <div><div className="text-scada-dim">BLACKOUTS</div><b>{g.blackoutCount}</b></div>
          <div><div className="text-scada-dim">SURVIVED</div><b>{g.tick}s</b></div>
        </div>
        {g.mode === 'SABOTEUR_DEDUCTION' && (
          <div className="mb-3 text-xs">
            <div className="mb-1 text-scada-dim">THE SABOTEURS WERE:</div>
            {g.engineers.filter((e) => e.role === 'SABOTEUR').map((e) => (
              <div key={e.id} className="text-scada-crimson">{e.callsign} · {g.nodes[e.nodeId].name} · {e.tactics.join(' / ')}</div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <button className="touch-target h-12 flex-1 rounded border border-scada-cobalt text-xs font-bold text-scada-cobalt" onClick={() => start(g.mode)}>RETRY</button>
          <button className="touch-target h-12 flex-1 rounded border border-scada-border text-xs font-bold" onClick={toMenu}>MENU</button>
        </div>
      </div>
    </div>
  );
}
