import { useEffect, useMemo, useState } from 'react';
import { useInstall } from '../pwa';
import Replay from './Replay';
import { DIFFICULTY } from '../engine/constants';
import { computeScore } from '../engine/score';
import { bestKey, useGame } from '../store/useGame';
import type { Difficulty, GameMode } from '../types/game';

const MODES: { mode: GameMode; title: string; goal: string }[] = [
  { mode: 'PRACTICE', title: 'Practice', goal: 'No timer, no losing. Learn to drive, deliver repair kits and balance power at your own pace, with a checklist to guide you.' },
  { mode: 'SOLO_CRISIS', title: 'Solo Crisis', goal: 'Run all 8 districts through a 5-minute storm. Drive the repair truck, balance power, keep fewer than 4 districts dark.' },
  { mode: 'SABOTEUR_DEDUCTION', title: 'Find the Saboteurs', goal: 'Run 1 district beside 7 AI engineers. Two are saboteurs — read the news, inspect, and vote both out.' },
];

function Picker({ label, value, onPrev, onNext }: { label: string; value: string; onPrev: () => void; onNext: () => void }) {
  const arrow = 'touch-target flex h-12 w-12 items-center justify-center rounded-xl border border-white/20 bg-black/40 text-xl text-white';
  return (
    <div>
      <div className="mb-1 font-hud text-xs uppercase tracking-widest text-scada-dim">{label}</div>
      <div className="flex items-center gap-2">
        <button className={arrow} onClick={onPrev} aria-label={`Previous ${label}`}>◀</button>
        <div className="flex h-12 flex-1 items-center justify-center rounded-xl border border-scada-mint/60 bg-black/40 font-hud text-lg font-bold uppercase tracking-wide text-scada-mint">{value}</div>
        <button className={arrow} onClick={onNext} aria-label={`Next ${label}`}>▶</button>
      </div>
    </div>
  );
}

export function MenuScreen() {
  const start = useGame((s) => s.start);
  const crt = useGame((s) => s.g.settings.crtScanlines);
  const toggleCrt = useGame((s) => s.toggleCrt);
  const difficulty = useGame((s) => s.difficulty);
  const setDifficulty = useGame((s) => s.setDifficulty);
  const best = useGame((s) => s.best);
  const pwa = useInstall();
  const [mi, setMi] = useState(() => (Object.keys(useGame.getState().best).length === 0 ? 0 : 1));
  const diffs = Object.keys(DIFFICULTY) as Difficulty[];
  const m = MODES[mi];
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  return (
    <main className="pt-safe pb-safe relative mx-auto flex min-h-full max-w-md flex-col gap-4 p-5 before:flex-1 before:content-[''] after:flex-1 after:content-['']">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 bg-gradient-to-b from-scada-cobalt/20 to-transparent" />
      <div>
        <div className="font-hud text-xs uppercase tracking-[0.3em] text-scada-mint">City power control</div>
        <h1 className="font-hud text-6xl font-bold uppercase leading-[0.9] tracking-tight text-white">Black<span className="text-scada-amber">out</span><br />Protocol</h1>
        <p className="mt-2 text-sm text-white/70">A storm is rolling over the city. Drive your repair truck, keep the power flowing, and keep the lights on.</p>
      </div>

      <Picker label="Mode" value={m.title} onPrev={() => setMi((mi + MODES.length - 1) % MODES.length)} onNext={() => setMi((mi + 1) % MODES.length)} />
      <p className="-mt-2 text-xs text-white/70">{m.goal}</p>
      {m.mode !== 'PRACTICE' && <><Picker
        label="Difficulty"
        value={difficulty}
        onPrev={() => setDifficulty(diffs[(diffs.indexOf(difficulty) + diffs.length - 1) % diffs.length])}
        onNext={() => setDifficulty(diffs[(diffs.indexOf(difficulty) + 1) % diffs.length])}
      />
      <p className="-mt-2 text-xs text-white/70">{DIFFICULTY[difficulty].blurb}</p></>}

      <button onClick={() => start(m.mode)} className="touch-target h-14 rounded-xl bg-scada-mint font-hud text-2xl font-bold uppercase tracking-widest text-scada-bg shadow-glow-mint">
        Start
      </button>
      {best[bestKey(m.mode, difficulty)] ? <div className="-mt-2 text-center text-xs text-scada-amber">Best score ({difficulty}): {best[bestKey(m.mode, difficulty)].toLocaleString()}</div> : null}

      <section className="rounded-2xl border border-white/10 bg-black/35 p-3 text-xs leading-5 text-white/80">
        <div className="mb-1 font-hud text-sm font-bold uppercase tracking-widest text-scada-cobalt">How to play</div>
        {m.mode === 'PRACTICE' ? (
          <ul className="space-y-1">
            <li>🎓 <b>No timer and you cannot lose.</b> Explore freely.</li>
            <li>🟡 Drive into the yellow depot ring, then 🟢 the green beam on a district that needs help.</li>
            <li>⚡ In DISTRICT, drag the power slider; switch Autopilot off to do it yourself.</li>
            <li>⛈ Use <b>Trigger storm</b> to see hazards, then fix them.</li>
          </ul>
        ) : m.mode === 'SOLO_CRISIS' ? (
          <ul className="space-y-1">
            <li>🎯 <b>Goal:</b> survive until 0:00 with fewer than 4 districts blacked out.</li>
            <li>🟡 Pick up a repair kit at the <b>yellow</b> depot ring.</li>
            <li>🟢 Deliver it to the <b>green</b> beam on the district in trouble.</li>
            <li>⚡ In DISTRICT, set power ≥ what the district needs; cool it before 80°C.</li>
          </ul>
        ) : (
          <ul className="space-y-1">
            <li>🎯 <b>Goal:</b> vote out both saboteurs before 0:00 (3 wrong votes = loss).</li>
            <li>📰 Compare engineer actions in NEWS with the SCADA sensor lines.</li>
            <li>🔎 Inspect suspects (limited scans), flag them, then Vote out.</li>
            <li>🚚 Keep your own district alive with the truck and the power slider.</li>
          </ul>
        )}
        <div className="mt-2 border-t border-white/10 pt-2 text-white/60">{coarse ? 'Controls: on-screen joystick to drive.' : 'Controls: WASD / arrows drive · E horn · V camera · ? help.'} A short briefing plays on your first run.</div>
      </section>

      {pwa.canPrompt && (
        <button onClick={pwa.install} className="touch-target h-12 rounded-xl border border-scada-cobalt text-xs font-bold text-scada-cobalt">INSTALL APP</button>
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
