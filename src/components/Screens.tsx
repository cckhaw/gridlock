import { useEffect, useMemo, useState } from 'react';
import { useInstall } from '../pwa';
import Segmented from '../ui/Segmented';
import Replay from './Replay';
import { DIFFICULTY } from '../engine/constants';
import { computeScore } from '../engine/score';
import { bestKey, useGame } from '../store/useGame';
import type { Difficulty, GameMode } from '../types/game';

const MODES: { mode: GameMode; title: string; short: string; goal: string }[] = [
  { mode: 'PRACTICE', title: 'Practice', short: 'Practice', goal: 'No timer, no losing. Learn to drive, deliver repair kits and balance power at your own pace, with a checklist to guide you.' },
  { mode: 'SOLO_CRISIS', title: 'Solo Crisis', short: 'Solo', goal: 'Run all 8 districts through a 5-minute storm. Drive the repair truck, balance power, keep fewer than 4 districts dark.' },
  { mode: 'SABOTEUR_DEDUCTION', title: 'Find the Saboteurs', short: 'Saboteurs', goal: 'Run 1 district beside 7 AI engineers. Two are saboteurs — read the news, inspect, and vote both out.' },
];

export function MenuScreen() {
  const start = useGame((s) => s.start);
  const difficulty = useGame((s) => s.difficulty);
  const setDifficulty = useGame((s) => s.setDifficulty);
  const best = useGame((s) => s.best);
  const pwa = useInstall();
  const [mi, setMi] = useState(() => (Object.keys(useGame.getState().best).length === 0 ? 0 : 1));
  const m = MODES[mi];
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const bestScore = best[bestKey(m.mode, difficulty)];
  return (
    <main className="absolute inset-0 overflow-y-auto overscroll-contain bg-[radial-gradient(120%_70%_at_50%_0%,#0b2a52_0%,#05080f_62%,#000_100%)] pb-[max(24px,env(safe-area-inset-bottom))] pt-[max(24px,env(safe-area-inset-top))]">
      <div className="mx-auto flex min-h-full w-full max-w-md flex-col gap-5 px-5">
        <div className="mt-6 flex flex-col items-start gap-3">
          <img src="./icons/icon-192.png" alt="" width={72} height={72} className="rounded-[18px] shadow-lg" />
          <div>
            <h1 className="text-[40px] font-extrabold leading-[1.05] tracking-[-0.03em]">Blackout<br />Protocol</h1>
            <p className="mt-2 text-[17px] leading-snug text-white/70">A storm is rolling over the city. Drive your repair truck and keep the lights on.</p>
          </div>
        </div>

        <section className="flex flex-col gap-3">
          <Segmented label="Mode" value={m.mode} onChange={(v) => setMi(MODES.findIndex((x) => x.mode === v))} options={MODES.map((x) => ({ id: x.mode, label: x.short }))} />
          <p className="px-1 text-[15px] leading-snug text-white/70">{m.goal}</p>
          {m.mode !== 'PRACTICE' && (
            <>
              <Segmented label="Difficulty" value={difficulty} onChange={setDifficulty} options={(Object.keys(DIFFICULTY) as Difficulty[]).map((d) => ({ id: d, label: d[0] + d.slice(1).toLowerCase() }))} />
              <p className="px-1 text-[15px] leading-snug text-white/70">{DIFFICULTY[difficulty].blurb}</p>
            </>
          )}
        </section>

        <div className="flex flex-col gap-2">
          <button onClick={() => start(m.mode)} className="btn-filled w-full touch-target">{m.mode === 'PRACTICE' ? 'Start practising' : 'Start'}</button>
          {bestScore ? <div className="text-center text-[13px] text-[#ffd60a]">Best score · {bestScore.toLocaleString()}</div> : null}
        </div>

        <section>
          <div className="caption-label mb-1.5 px-1">How to play</div>
          <div className="group-list text-[15px] leading-snug">
            {(m.mode === 'PRACTICE'
              ? ['🎓 No timer and you cannot lose. Explore freely.', '🟡 Drive into the yellow ring, then 🟢 the green beam.', '⚡ Drag the power slider in the District tab.', '⛈ Trigger a storm whenever you like.']
              : m.mode === 'SOLO_CRISIS'
                ? [`🎯 Survive until the clock hits 0:00 with fewer than ${DIFFICULTY[difficulty].defeatBlackouts} blackouts.`, '🟡 Pick up a repair kit at the yellow depot ring.', '🟢 Deliver it to the green beam on the district in trouble.', '⚡ Keep each district’s power at or above what it needs.']
                : ['🎯 Vote out both saboteurs before 0:00 (3 wrong votes = loss).', '📰 Compare engineer actions in News with the sensor lines.', '🔎 Inspect suspects, flag them, then Vote out.', '🚚 Keep your own district alive with the truck.']
            ).map((t) => <div key={t} className="group-row !justify-start">{t}</div>)}
            <div className="group-row !justify-start text-[13px] text-white/55">{coarse ? 'Drive with the joystick. Drag the city to look around.' : 'WASD drive · arrow keys or drag to pan · E horn · V follow cam · N day/night · ? help'}</div>
          </div>
        </section>

        <div className="mt-auto flex flex-col items-center gap-2 pt-2 text-[13px] text-white/55">
          {pwa.canPrompt && <button onClick={pwa.install} className="btn-tinted w-full touch-target">Install app</button>}
          {pwa.iosHint && <div className="text-center">To install: tap <b>Share</b>, then <b>Add to Home Screen</b>.</div>}
          {pwa.offlineReady && <div className="text-[#30d158]">Ready to play offline</div>}
        </div>
      </div>
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
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/55 p-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-[max(12px,env(safe-area-inset-top))] backdrop-blur-sm sm:items-center" role="dialog" aria-label="Results">
      {replay && <Replay onClose={() => setReplay(false)} />}
      <div className="glass-strong w-full max-w-md rounded-[28px] p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[22px] text-[48px] font-extrabold" style={{ background: win ? 'rgba(48,209,88,0.2)' : 'rgba(255,69,58,0.2)', color: win ? '#30d158' : '#ff453a' }}>{score.grade}</div>
          <div className="min-w-0">
            <h2 className="text-[24px] font-bold leading-tight tracking-tight">{win ? 'City saved' : 'Lights out'}</h2>
            <p className="text-[15px] leading-snug text-white/70">{g.endReason}</p>
          </div>
        </div>
        <div className="mt-4 text-center">
          <div className="text-[40px] font-bold tabular-nums tracking-tight">{score.total.toLocaleString()}</div>
          <div className="text-[13px] text-white/55">{g.difficulty[0] + g.difficulty.slice(1).toLowerCase()} ×{score.multiplier} · Best {Math.max(best, score.total).toLocaleString()}</div>
        </div>
        <div className="group-list mt-4 max-h-44 overflow-y-auto">
          {score.lines.map((l) => (
            <div key={l.label} className="group-row !min-h-10 !py-1.5 text-[15px]">
              <span className="text-white/80">{l.label}</span>
              <span className={`font-semibold tabular-nums ${l.points < 0 ? 'text-[#ff453a]' : 'text-[#30d158]'}`}>{l.points > 0 ? '+' : ''}{l.points}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2 text-center">
          {[['Power', `${g.gridHealth}%`], ['Blackouts', g.blackoutCount], ['Flushes', g.stats.coolantUses], ['Time', `${g.tick}s`]].map(([k, v]) => (
            <div key={k as string} className="rounded-[12px] bg-white/8 py-2"><div className="text-[11px] text-white/55">{k}</div><div className="text-[17px] font-semibold tabular-nums">{v}</div></div>
          ))}
        </div>
        {g.mode === 'SABOTEUR_DEDUCTION' && (
          <div className="group-list mt-3">
            <div className="group-row !min-h-9 text-[13px] text-white/55">The saboteurs were</div>
            {g.engineers.filter((e) => e.role === 'SABOTEUR').map((e) => (
              <div key={e.id} className="group-row text-[15px] text-[#ff6961]"><span>{e.callsign} · {g.nodes[e.nodeId].name}</span><span className="text-[12px] text-white/50">{e.tactics.join(' / ').replace(/_/g, ' ').toLowerCase()}</span></div>
            ))}
          </div>
        )}
        <div className="mt-4 flex flex-col gap-2">
          <button className="btn-filled w-full touch-target" onClick={() => start(g.mode)}>Play again</button>
          <div className="flex gap-2">
            <button className="btn-tinted flex-1 touch-target" onClick={() => setReplay(true)}>Replay</button>
            <button className="btn-tinted flex-1 touch-target" onClick={toMenu}>Menu</button>
          </div>
        </div>
      </div>
    </div>
  );
}
