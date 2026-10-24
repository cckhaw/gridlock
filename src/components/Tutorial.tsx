import { useMemo, useState } from 'react';
import { useGame } from '../store/useGame';

interface Step {
  icon: string;
  title: string;
  lead: string;
  bullets?: string[];
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
    },
    {
      icon: '🚚',
      title: 'You drive the repair truck',
      lead: touch() ? 'Drag the joystick (bottom-left of the city) to drive.' : 'Drive with W A S D.',
      bullets: [
        touch() ? 'Push up to go forward, down to reverse, sideways to steer. Drag anywhere else on the city to look around; pinch to zoom.' : 'Arrow keys (or click-drag) pan the camera, scroll zooms, V returns to follow-cam. E honks, ? reopens this guide.',
        'The minimap (bottom-right) shows districts, the depot and your truck.',
        'Buildings are solid — use the streets between districts.',
      ],
    },
    {
      icon: '🟡',
      title: 'The repair loop',
      lead: 'Pick up, then deliver — every time something goes wrong.',
      bullets: [
        '1. Follow the yellow arrow to the DEPOT and drive into the yellow ring to load a repair kit.',
        '2. Follow the green arrow to the district in trouble. It is the one with the alert pop-up, a bobbing marker and a tall green beam; the banner names it, and the minimap shows it as a pulsing green box.',
        'A floating green arrow above your truck and an on-screen pointer (“Deliver here · District name”) always show which way to go.',
        'A kit heals 25% condition, cools 20°C, clears hazards there and re-tops its power. Delivering to a dark district restores it.',
        'You earn credits for each repair. A new kit is ready 8 seconds later.',
      ],
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
        'On Cadet (and Practice) an Autopilot switch in the DISTRICT tab does the balancing and cooling for you — switch it off to try it by hand.',
      ],
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
    },
    {
      icon: '🏆',
      title: 'Scoring',
      lead: 'Your grade (S to F) rewards how well you protect the city.',
      bullets: ['Points: survival time, average city power, blackouts avoided, repairs delivered and districts restored.', 'Veteran difficulty multiplies your score. Ready? Pick up that first kit.'],
    },
  ];
}

function practiceSteps(): Step[] {
  const base = soloSteps();
  return [
    {
      icon: '🎓',
      title: 'Practice mode',
      lead: 'There is no timer and you cannot lose. Explore the game at your own pace.',
      bullets: [
        'Autopilot is ON, so the city keeps itself balanced while you learn to drive and deliver.',
        'Follow the 🎓 Practice goals list on the left of the city — it ticks off as you try each thing.',
        'Use ⛈ Trigger storm whenever you want to see a hazard and practise fixing it.',
        'Turn Autopilot OFF to practise the power slider and Cool down yourself.',
      ],
    },
    ...base.slice(1, 6),
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
    },
  ];
}

export default function Tutorial() {
  const mode = useGame((s) => s.g.mode);
  const close = useGame((s) => s.closeTutorial);
  const steps = useMemo(() => (mode === 'SABOTEUR_DEDUCTION' ? deductionSteps() : mode === 'PRACTICE' ? practiceSteps() : soloSteps()), [mode]);
  const [i, setI] = useState(0);
  const step = steps[i];
  const last = i === steps.length - 1;

  return (
    <div className="fixed inset-0 z-[58] flex items-end justify-center bg-black/50 p-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-[max(12px,env(safe-area-inset-top))] backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-label="How to play">
      <div className="glass-strong flex max-h-[88dvh] w-full max-w-md flex-col rounded-[28px] p-5">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="flex h-14 w-14 items-center justify-center rounded-[16px] bg-white/12 text-[30px]">{step.icon}</div>
          <h3 className="mt-3 text-[26px] font-bold leading-tight tracking-tight">{step.title}</h3>
          <p className="mt-1.5 text-[17px] leading-snug text-white/90">{step.lead}</p>
          {step.bullets && (
            <ul className="group-list mt-3 text-[15px] leading-snug">
              {step.bullets.map((b) => (
                <li key={b} className="group-row !items-start !justify-start !gap-2.5 text-white/90"><span className="mt-px text-[#0a84ff]">●</span><span>{b}</span></li>
              ))}
            </ul>
          )}
        </div>
        <div className="mt-4 flex justify-center gap-1.5" aria-hidden>
          {steps.map((_, k) => <span key={k} className={`h-[7px] rounded-full transition-all ${k === i ? 'w-5 bg-white' : 'w-[7px] bg-white/30'}`} />)}
        </div>
        <div className="mt-4 flex flex-col gap-2">
          <button className="btn-filled w-full touch-target" onClick={() => (last ? close() : setI(i + 1))}>{last ? 'Start' : 'Continue'}</button>
          <div className="flex items-center justify-between">
            <button className="touch-target min-h-11 px-3 text-[15px] font-medium text-[#0a84ff] disabled:opacity-0" disabled={i === 0} onClick={() => setI(i - 1)}>Back</button>
            <span className="text-[13px] tabular-nums text-white/45">{i + 1} of {steps.length}</span>
            <button className="touch-target min-h-11 px-3 text-[15px] font-medium text-white/60" onClick={close}>Skip</button>
          </div>
        </div>
      </div>
    </div>
  );
}
