import { useMemo, useState } from 'react';
import { useGame } from '../store/useGame';
import type { ActiveTab } from '../types/game';

interface Step {
  icon: string;
  title: string;
  lead: string;
  bullets?: string[];
  tab?: ActiveTab;
}

const touch = () => window.matchMedia('(pointer: coarse)').matches;

function soloSteps(): Step[] {
  return [
    {
      icon: '🎯',
      title: 'Your mission',
      lead: 'A storm is hitting the city. Keep the lights on until the clock reaches 0:00.',
      bullets: [
        'WIN: reach 0:00 with fewer than 4 districts blacked out.',
        'LOSE: 4 districts go dark, or CITY POWER falls below 10%.',
        'The storm gets worse every minute. A hazard hits every 15–20 seconds.',
      ],
      tab: 'GRID',
    },
    {
      icon: '🚚',
      title: 'You drive the repair truck',
      lead: touch() ? 'Drag the joystick (bottom-left of the city) to drive.' : 'Drive with W A S D or the arrow keys.',
      bullets: [
        touch() ? 'Push up to go forward, down to reverse, sideways to steer.' : 'E honks, V switches camera, ? reopens this guide.',
        'The minimap (bottom-right) shows districts, the depot and your truck.',
        'Buildings are solid — use the streets between districts.',
      ],
      tab: 'GRID',
    },
    {
      icon: '🟡',
      title: 'The repair loop',
      lead: 'Pick up, then deliver — every time something goes wrong.',
      bullets: [
        '1. Drive into the YELLOW ring at the depot to load a repair kit.',
        '2. Drive into the GREEN beam on the district that is in trouble.',
        'A kit heals 25% condition, cools 20°C, clears hazards there and re-tops its power. Delivering to a dark district restores it.',
        'You earn credits for each repair. A new kit is ready 8 seconds later.',
      ],
      tab: 'GRID',
    },
    {
      icon: '⚡',
      title: 'Keep power matched',
      lead: 'Open the DISTRICT tab. Every district NEEDS some power and GETS some power.',
      bullets: [
        'Drag the slider so “Gets” is at least “Needs”. If the Gap is red (+), that district is short.',
        'A short district heats up +1.5°C every second.',
        'Spare power is shared by the whole city — you cannot give everyone extra.',
        'Divert pulls spare power from neighbours into this district.',
      ],
      tab: 'FOCUS',
    },
    {
      icon: '🔥',
      title: 'Watch the heat',
      lead: 'Temperature decides whether a district survives.',
      bullets: [
        'Above 80°C its condition drops 1% per second. Above 95°C it drops 5% per second.',
        'At 0% condition it BLACKS OUT and dumps its whole load on the neighbours — that is how a chain-reaction starts.',
        'Cool down flushes 5°C per second for 5 seconds, then recharges for 15 seconds. It reserves 50 MW while running.',
        'Cut off sheds a hopeless district so it cannot drag others down.',
      ],
      tab: 'FOCUS',
    },
    {
      icon: '📣',
      title: 'Alerts tell you where to go',
      lead: 'Pop-ups float over the district in trouble.',
      bullets: [
        '⚡ Lightning · 🔧 Transformer blowout · 📈 Demand surge · 🔥 Heatwave',
        'Amber = running hot. Red = critical, act now. Dark = blackout.',
        'The banner at the top of the city always says what to do next.',
        'The NEWS tab keeps the full list.',
      ],
      tab: 'LOGS',
    },
    {
      icon: '🏆',
      title: 'Scoring',
      lead: 'Your grade (S to F) rewards how well you protect the city.',
      bullets: ['Points: survival time, average city power, blackouts avoided, repairs delivered and districts restored.', 'Veteran difficulty multiplies your score. Ready? Pick up that first kit.'],
      tab: 'GRID',
    },
  ];
}

function deductionSteps(): Step[] {
  return [
    {
      icon: '🎯',
      title: 'Your mission',
      lead: 'Two of the seven AI engineers are saboteurs. Find them before 0:00.',
      bullets: [
        'WIN: vote out BOTH saboteurs.',
        'LOSE: 3 wrong votes, 4 districts blacked out, or time runs out with a saboteur still free.',
        'You run ONE district (tagged “you”). The engineers run the other seven.',
      ],
      tab: 'GRID',
    },
    {
      icon: '🚚',
      title: 'Keep your district alive',
      lead: touch() ? 'Drive the repair truck with the joystick (bottom-left).' : 'Drive the repair truck with W A S D / arrows.',
      bullets: [
        'Yellow ring = depot (get a kit). Green beam = deliver it to YOUR district when it is in trouble.',
        'In the DISTRICT tab, keep “Gets” at or above “Needs” and use Cool down above 80°C.',
        'Engineers handle their own districts — your kit only serves yours.',
      ],
      tab: 'GRID',
    },
    {
      icon: '🕵️',
      title: 'How saboteurs cheat',
      lead: 'They are subtle and never all the time.',
      bullets: [
        'UNDER-SUPPLY: send less power than the district needs, so it heats.',
        'DELAYED COOLANT: flush late, at a much higher temperature.',
        'FALSE ALARMS: report an overload that the sensors do not show — sometimes blaming someone else.',
        'Honest engineers lag a little and raise real alarms too, so look for patterns, not one event.',
      ],
      tab: 'LOGS',
    },
    {
      icon: '📰',
      title: 'Investigate in NEWS',
      lead: 'Every engineer action is logged with a time.',
      bullets: [
        'SCADA lines (every 2 seconds) are the truth: demand, supply and temperature of a district.',
        'Compare an engineer’s claim or allocation with the SCADA line at the same time.',
        'Hot district with low supply? Alarm with normal sensors? Coolant at 90°C+? Note who did it.',
      ],
      tab: 'LOGS',
    },
    {
      icon: '🔎',
      title: 'Inspect and flag',
      lead: 'Open SUSPECTS to see all seven engineers.',
      bullets: [
        'Tap a roster name, then Inspect to scan them. You get a limited number of scans.',
        'Scans are not perfect: an anomaly hints at which trick was used, but can be wrong.',
        'Use the flag button to mark people you suspect.',
      ],
      tab: 'DEDUCT',
    },
    {
      icon: '🗳️',
      title: 'Vote them out',
      lead: 'When you are sure, select the engineer’s district and tap Vote out twice.',
      bullets: [
        'Right call: the saboteur is removed and the district reverts to autopilot.',
        'Wrong call: an innocent engineer’s district goes dark. Three errors and you lose.',
        'Catch both saboteurs to win. Faster wins score higher.',
      ],
      tab: 'DEDUCT',
    },
  ];
}

export default function Tutorial() {
  const mode = useGame((s) => s.g.mode);
  const close = useGame((s) => s.closeTutorial);
  const setTab = useGame((s) => s.setTab);
  const steps = useMemo(() => (mode === 'SABOTEUR_DEDUCTION' ? deductionSteps() : soloSteps()), [mode]);
  const [i, setI] = useState(0);
  const step = steps[i];
  const last = i === steps.length - 1;

  const go = (n: number) => {
    setI(n);
    const t = steps[n]?.tab;
    if (t) setTab(t);
  };

  return (
    <div className="pt-safe fixed inset-x-0 top-0 z-[58] flex justify-center p-3" role="dialog" aria-label="How to play">
      <div className="scada-panel max-h-[78dvh] w-full max-w-md overflow-y-auto border border-scada-cobalt p-4 shadow-glow-cobalt">
        <div className="mb-1 flex items-center justify-between text-[11px] text-scada-dim">
          <span>HOW TO PLAY · {i + 1}/{steps.length}</span>
          <button className="touch-target -m-3 p-3 text-scada-dim" onClick={close}>SKIP</button>
        </div>
        <h3 className="flex items-center gap-2 font-hud text-xl font-bold uppercase tracking-wide text-scada-cobalt text-glow-cobalt">
          <span>{step.icon}</span>
          {step.title}
        </h3>
        <p className="mt-1 text-sm font-semibold leading-5">{step.lead}</p>
        {step.bullets && (
          <ul className="mt-2 space-y-1.5 text-xs leading-5 text-white/85">
            {step.bullets.map((b) => (
              <li key={b} className="flex gap-2"><span className="text-scada-cobalt">▸</span><span>{b}</span></li>
            ))}
          </ul>
        )}
        <div className="mt-3 flex items-center gap-2">
          <div className="flex flex-1 gap-1">
            {steps.map((_, k) => (
              <span key={k} className={`h-1 flex-1 rounded ${k <= i ? 'bg-scada-cobalt' : 'bg-scada-border'}`} />
            ))}
          </div>
          {i > 0 && (
            <button className="touch-target h-12 rounded-xl border border-scada-border px-4 text-xs font-bold" onClick={() => go(i - 1)}>BACK</button>
          )}
          <button
            className="touch-target h-12 rounded-xl border border-scada-mint px-4 text-xs font-bold text-scada-mint"
            onClick={() => (last ? close() : go(i + 1))}
          >
            {last ? 'START' : 'NEXT'}
          </button>
        </div>
      </div>
    </div>
  );
}
