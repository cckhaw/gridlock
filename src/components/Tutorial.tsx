import { useState } from 'react';
import { useGame } from '../store/useGame';
import type { ActiveTab } from '../types/game';

interface Step {
  title: string;
  body: string;
  tab?: ActiveTab;
  deductionOnly?: boolean;
  soloOnly?: boolean;
}

const STEPS: Step[] = [
  { title: 'YOUR JOB', body: 'Keep every district powered for 5:00. Supply must meet demand, or the district overheats and fails. The game is paused while you read.', tab: 'GRID' },
  { title: 'TOP BAR', body: 'GRID HEALTH is the average condition of the whole grid. RESERVE is unallocated megawatts you can still hand out. The big timer is the storm countdown.' },
  { title: 'READ THE GRID', body: 'Green is nominal, amber is caution, red is critical, grey is blacked out. Glowing lines show power flowing toward districts with less surplus. Tap a district to select it; the arrow opens FOCUS.', tab: 'GRID' },
  { title: 'BALANCE POWER', body: 'In FOCUS, drag the slider (or tap − / +) so SUPPLY ≥ DEMAND. Demand drifts and surges all the time. Under-supply heats a district +1.5°C every second.', tab: 'FOCUS' },
  { title: 'HEAT KILLS', body: 'Above 80°C integrity drains 1%/s; above 95°C it drains 5%/s. At 0% the district blacks out and dumps its entire load on its neighbours — that is how cascades start.', tab: 'FOCUS' },
  { title: 'ACTION BUTTONS', body: 'COOLANT cools 5°C/s for 5s and holds 50 MW of reserve. REROUTE pulls spare MW from neighbours or reserve. ISOLATE sheds a failing district to stop a cascade. DIAGNOSE forecasts demand and heat.', soloOnly: true },
  { title: 'ACTION BUTTONS', body: 'COOLANT flushes your district. REROUTE pulls spare MW. On an engineer’s district, DIAGNOSE scans them (limited uses) and VOTE OUT (tap twice) removes them. Wrong votes take an innocent district offline.', deductionOnly: true },
  { title: 'TELEMETRY LOG', body: 'Every engineer action is public with a timestamp. Hazards (lightning, blowouts, surges, heatwaves) hit every 15–20s.', tab: 'LOGS', soloOnly: true },
  { title: 'FIND THE SABOTEURS', body: 'Two engineers are compromised. They under-supply, stall coolant, or file false overload alarms. Cross-reference log timestamps with the SCADA sensor lines. Honest engineers also lag or raise real alarms, so look for patterns, not single events.', tab: 'LOGS', deductionOnly: true },
  { title: 'THE ROSTER', body: 'Flag suspects, run scans on them, then vote. Catch both saboteurs before the clock hits 0:00 to win.', tab: 'DEDUCT', deductionOnly: true },
];

export default function Tutorial() {
  const mode = useGame((s) => s.g.mode);
  const close = useGame((s) => s.closeTutorial);
  const setTab = useGame((s) => s.setTab);
  const steps = STEPS.filter((s) => (mode === 'SABOTEUR_DEDUCTION' ? !s.soloOnly : !s.deductionOnly));
  const [i, setI] = useState(0);
  const step = steps[i];
  const last = i === steps.length - 1;

  const go = (n: number) => {
    setI(n);
    const t = steps[n]?.tab;
    if (t) setTab(t);
  };

  return (
    <div className="fixed inset-x-0 top-0 z-[58] flex justify-center p-3 pt-safe" role="dialog" aria-label="Tutorial">
      <div className="scada-panel w-full max-w-md border border-scada-cobalt p-4 shadow-glow-cobalt">
        <div className="mb-1 flex items-center justify-between text-[11px] text-scada-dim">
          <span>TRAINING {i + 1}/{steps.length}</span>
          <button className="touch-target -m-3 p-3 text-scada-dim" onClick={close}>SKIP</button>
        </div>
        <h3 className="text-sm font-bold text-scada-cobalt text-glow-cobalt">{step.title}</h3>
        <p className="mt-1 text-xs leading-5">{step.body}</p>
        <div className="mt-3 flex items-center gap-2">
          <div className="flex flex-1 gap-1">
            {steps.map((_, k) => (
              <span key={k} className={`h-1 flex-1 rounded ${k <= i ? 'bg-scada-cobalt' : 'bg-scada-border'}`} />
            ))}
          </div>
          {i > 0 && (
            <button className="touch-target h-12 rounded border border-scada-border px-4 text-xs font-bold" onClick={() => go(i - 1)}>BACK</button>
          )}
          <button
            className="touch-target h-12 rounded border border-scada-mint px-4 text-xs font-bold text-scada-mint"
            onClick={() => (last ? close() : go(i + 1))}
          >
            {last ? 'START' : 'NEXT'}
          </button>
        </div>
      </div>
    </div>
  );
}
