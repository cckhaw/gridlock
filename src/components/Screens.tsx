import { Radio, Siren, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useInstall } from '../pwa';
import Replay from './Replay';
import { DIFFICULTY } from '../engine/constants';
import { computeScore } from '../engine/score';
import { bestKey, useGame } from '../store/useGame';
import type { Difficulty, GameMode } from '../types/game';

export function MenuScreen() {
  const start = useGame((s) => s.start);
  const crt = useGame((s) => s.g.settings.crtScanlines);
  const toggleCrt = useGame((s) => s.toggleCrt);
  const difficulty = useGame((s) => s.difficulty);
  const setDifficulty = useGame((s) => s.setDifficulty);
  const best = useGame((s) => s.best);
  const pwa = useInstall();
  const Mode = ({ mode, title, desc, Icon }: { mode: GameMode; title: string; desc: string; Icon: typeof Siren }) => (
    <button onClick={() => start(mode)} className="touch-target scada-panel flex w-full items-start gap-3 border border-scada-cobalt/60 p-4 text-left">
      <Icon size={28} className="mt-0.5 shrink-0 text-scada-cobalt" />
      <span>
        <span className="block text-sm font-bold text-scada-cobalt text-glow-cobalt">{title}</span>
        <span className="block text-xs text-scada-dim">{desc}</span>
        {best[bestKey(mode, difficulty)] ? (
          <span className="mt-1 block text-[11px] text-scada-amber">BEST ({difficulty}): {best[bestKey(mode, difficulty)]}</span>
        ) : null}
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
      <div>
        <div className="mb-1 text-[11px] text-scada-dim">DIFFICULTY</div>
        <div className="flex gap-2">
          {(Object.keys(DIFFICULTY) as Difficulty[]).map((d) => (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              className={`touch-target h-12 flex-1 rounded border text-[11px] font-bold ${difficulty === d ? 'border-scada-mint text-scada-mint shadow-glow-mint' : 'border-scada-border text-scada-dim'}`}
            >
              {DIFFICULTY[d].label}
            </button>
          ))}
        </div>
        <div className="mt-1 text-[11px] text-scada-dim">{DIFFICULTY[difficulty].blurb}</div>
      </div>
      <Mode mode="SOLO_CRISIS" title="SOLO CRISIS" Icon={Siren} desc="Run all 8 districts through an escalating 5:00 storm. Hazards strike every 15–20s." />
      <Mode mode="SABOTEUR_DEDUCTION" title="VS AI SABOTEURS" Icon={Users} desc="Run one district beside 7 AI engineers. Two are saboteurs — read the telemetry log, scan, and vote them out." />
      <div className="text-[11px] text-scada-dim">First run of each mode shows a short training briefing. Tap a mode, then SKIP any time.</div>
      {pwa.canPrompt && (
        <button onClick={pwa.install} className="touch-target h-12 rounded border border-scada-cobalt text-xs font-bold text-scada-cobalt">INSTALL APP</button>
      )}
      {pwa.iosHint && <div className="text-[11px] text-scada-dim">To install: tap Share, then “Add to Home Screen”.</div>}
      {pwa.offlineReady && <div className="text-[11px] text-scada-mint">● Offline ready — plays without a connection.</div>}
      <button onClick={toggleCrt} className="touch-target text-xs text-scada-dim">CRT scanlines: <b className={crt ? 'text-scada-mint' : ''}>{crt ? 'ON' : 'OFF'}</b></button>
    </main>
  );
}

export function EndScreen() {
  const g = useGame((s) => s.g);
  const toMenu = useGame((s) => s.toMenu);
  const start = useGame((s) => s.start);
  const win = g.phase === 'VICTORY';
  const [replay, setReplay] = useState(false);
  const score = useMemo(() => computeScore(g), [g]);
  const recordScore = useGame((s) => s.recordScore);
  const best = useGame((s) => s.best[bestKey(g.mode, g.difficulty)] ?? 0);
  useEffect(() => { recordScore(score.total); }, [score.total, recordScore]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-scada-bg/90 p-5">
      {replay && <Replay onClose={() => setReplay(false)} />}
      <div className={`scada-panel w-full max-w-md border p-5 ${win ? 'border-scada-mint shadow-glow-mint' : 'border-scada-crimson shadow-glow-crimson'}`}>
        <h2 className={`text-2xl font-bold ${win ? 'text-scada-mint text-glow-mint' : 'text-scada-crimson text-glow-crimson'}`}>{win ? 'GRID SECURED' : 'GRID FAILURE'}</h2>
        <p className="mt-1 text-xs text-scada-dim">{g.endReason}</p>
        <div className="my-3 flex items-center gap-4">
          <div className={`text-6xl font-bold ${win ? 'text-scada-mint text-glow-mint' : 'text-scada-crimson text-glow-crimson'}`}>{score.grade}</div>
          <div>
            <div className="text-2xl font-bold tabular-nums">{score.total.toLocaleString()}</div>
            <div className="text-[11px] text-scada-dim">{g.difficulty} ×{score.multiplier} · BEST {Math.max(best, score.total).toLocaleString()}</div>
          </div>
        </div>
        <div className="mb-3 max-h-40 overflow-y-auto rounded bg-black/40 p-2 text-[11px]">
          {score.lines.map((l) => (
            <div key={l.label} className="flex justify-between">
              <span className="text-scada-dim">{l.label}</span>
              <span className={l.points < 0 ? 'text-scada-crimson' : 'text-scada-mint'}>{l.points > 0 ? '+' : ''}{l.points}</span>
            </div>
          ))}
        </div>
        <div className="mb-3 grid grid-cols-4 gap-2 text-center text-[11px]">
          <div><div className="text-scada-dim">HEALTH</div><b>{g.gridHealth}%</b></div>
          <div><div className="text-scada-dim">BLACKOUTS</div><b>{g.blackoutCount}</b></div>
          <div><div className="text-scada-dim">FLUSHES</div><b>{g.stats.coolantUses}</b></div>
          <div><div className="text-scada-dim">TIME</div><b>{g.tick}s</b></div>
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
          <button className="touch-target h-12 flex-1 rounded border border-scada-amber text-xs font-bold text-scada-amber" onClick={() => setReplay(true)}>REPLAY</button>
          <button className="touch-target h-12 flex-1 rounded border border-scada-border text-xs font-bold" onClick={toMenu}>MENU</button>
        </div>
      </div>
    </div>
  );
}
