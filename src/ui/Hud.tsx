import { ChevronDown, ChevronUp, Eye, Map as MapIcon } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { DISTRICT_ORDER } from '../engine/constants';
import { currentObjective } from '../engine/sim';
import { DEPOT, truck } from '../city/truck';
import { useGame } from '../store/useGame';
import type { PracticeState } from '../types/game';

const WORLD = { w: 24, d: 17 };
const COLORS = { NOMINAL: '#30D158', CAUTION: '#FF9F0A', CRITICAL: '#FF453A', BLACKOUT: '#636366', ISOLATED: '#0A84FF' } as const;

const KIND_ICON = { DELIVER: '🟢', PICKUP: '🟡', INVESTIGATE: '🕵️', STANDBY: '⏳' } as const;

/** Collapsible objective card: always says what to do next. */
export function ObjectiveCard() {
  const g = useGame((s) => s.g);
  const o = useMemo(() => currentObjective(g), [g]);
  const crew = g.crew;
  const [open, setOpen] = useState(() => window.innerHeight >= 520);
  const kit = crew.hasKit ? 'Kit loaded' : crew.kitCooldown > 0 ? `Next kit ${crew.kitCooldown}s` : 'No kit';
  return (
    <div className="glass pointer-events-auto w-fit max-w-[min(92vw,380px)] rounded-[22px]">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="touch-target flex min-h-11 w-full items-center gap-2.5 px-3.5 py-2 text-left">
        <span className="text-lg leading-none">{KIND_ICON[o.kind]}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold leading-tight tracking-tight">{o.title}</span>
          {open && <span className="mt-0.5 block text-[13px] leading-snug text-white/70">{o.detail}</span>}
        </span>
        {open ? <ChevronUp size={18} className="shrink-0 text-white/50" /> : <ChevronDown size={18} className="shrink-0 text-white/50" />}
      </button>
      {open && (
        <div className="flex gap-2 px-3.5 pb-2.5 text-[13px] font-semibold tabular-nums">
          <span className="rounded-full bg-white/12 px-2.5 py-1 text-[#ffd60a]">💰 {crew.credits}</span>
          <span className="rounded-full bg-white/12 px-2.5 py-1">🔧 {crew.deliveries}</span>
          <span className={`rounded-full bg-white/12 px-2.5 py-1 ${crew.hasKit ? 'text-[#30d158]' : 'text-white/70'}`}>{kit}</span>
        </div>
      )}
    </div>
  );
}

const GOALS: [keyof PracticeState['done'], string][] = [
  ['kit', 'Load a repair kit at the yellow depot'],
  ['deliver', 'Deliver it to the district the green arrow points to'],
  ['slider', 'Move a power slider (Autopilot off)'],
  ['cool', 'Press Cool down on a hot district'],
  ['divert', 'Press Divert'],
  ['hazard', 'Trigger a storm and survive it'],
];

export function PracticeCard() {
  const g = useGame((s) => s.g);
  const strike = useGame((s) => s.strike);
  const practiceHazards = useGame((s) => s.practiceHazards);
  const patchAssist = useGame((s) => s.patchAssist);
  const start = useGame((s) => s.start);
  const [open, setOpen] = useState(() => window.innerWidth >= 900);
  if (g.mode !== 'PRACTICE') return null;
  const done = GOALS.filter(([k]) => g.practice.done[k]).length;
  const pill = 'touch-target min-h-11 rounded-full bg-white/12 px-3.5 text-[13px] font-semibold';
  return (
    <div className="glass pointer-events-auto w-fit max-w-[min(92vw,330px)] rounded-[22px]">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="touch-target flex min-h-11 w-full items-center justify-between gap-3 px-3.5 text-[15px] font-semibold">
        <span>🎓 Practice goals <span className="tabular-nums text-white/60">{done}/{GOALS.length}</span></span>
        {open ? <ChevronUp size={18} className="text-white/50" /> : <ChevronDown size={18} className="text-white/50" />}
      </button>
      {open && (
        <div className="px-3.5 pb-3 text-[13px] leading-5">
          {GOALS.map(([k, label]) => (
            <div key={k} className={g.practice.done[k] ? 'text-[#30d158]' : 'text-white/80'}>{g.practice.done[k] ? '✓' : '○'} {label}</div>
          ))}
          <div className="mt-2.5 flex flex-wrap gap-2">
            <button className={pill} onClick={strike}>⛈ Trigger storm</button>
            <button className={pill} onClick={() => practiceHazards(!g.practice.hazards)}>Auto storms {g.practice.hazards ? 'On' : 'Off'}</button>
            <button className={pill} onClick={() => patchAssist({ autoBalance: !g.assist.autoBalance })}>Autopilot {g.assist.autoBalance ? 'On' : 'Off'}</button>
            <button className={pill} onClick={() => start('PRACTICE')}>Reset city</button>
          </div>
        </div>
      )}
    </div>
  );
}

export function Minimap({ collapsible = true }: { collapsible?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const speed = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(true);
  useEffect(() => {
    if (!open) return;
    let raf = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const c = ref.current;
      if (!c) return;
      const ctx = c.getContext('2d')!;
      const W = c.width;
      const H = c.height;
      const g = useGame.getState().g;
      const o = currentObjective(g);
      ctx.clearRect(0, 0, W, H);
      const mx = (x: number) => ((x + 15) / 30) * W;
      const mz = (z: number) => ((z + 12) / 24) * H;
      ctx.strokeStyle = 'rgba(255,255,255,0.22)';
      ctx.lineWidth = 1.2;
      for (const [a, b] of [['research', 'hospital'], ['hospital', 'defense'], ['industrial', 'downtown'], ['downtown', 'metro'], ['water', 'residential'], ['research', 'industrial'], ['industrial', 'water'], ['hospital', 'downtown'], ['defense', 'metro'], ['downtown', 'water'], ['downtown', 'residential'], ['metro', 'residential']] as const) {
        const na = g.nodes[a];
        const nb = g.nodes[b];
        ctx.beginPath();
        ctx.moveTo(mx((na.position.x - 0.5) * WORLD.w), mz((na.position.y - 0.5) * WORLD.d));
        ctx.lineTo(mx((nb.position.x - 0.5) * WORLD.w), mz((nb.position.y - 0.5) * WORLD.d));
        ctx.stroke();
      }
      const pulse = 0.6 + 0.4 * Math.sin(performance.now() / 180);
      for (const id of DISTRICT_ORDER) {
        const n = g.nodes[id];
        const x = mx((n.position.x - 0.5) * WORLD.w);
        const y = mz((n.position.y - 0.5) * WORLD.d);
        ctx.fillStyle = COLORS[n.status];
        ctx.beginPath();
        ctx.roundRect(x - 7, y - 5, 14, 10, 3);
        ctx.fill();
        if (o.targetNodeId === id) {
          ctx.strokeStyle = `rgba(48,209,88,${pulse})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(x - 10, y - 8, 20, 16, 5);
          ctx.stroke();
          ctx.lineWidth = 1;
        }
      }
      ctx.fillStyle = o.kind === 'PICKUP' ? `rgba(255,214,10,${pulse})` : 'rgba(255,214,10,0.5)';
      ctx.beginPath();
      ctx.arc(mx(DEPOT.x), mz(DEPOT.z), 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.translate(mx(truck.x), mz(truck.z));
      ctx.rotate(Math.PI - truck.heading);
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(0, -6.5);
      ctx.lineTo(4.8, 5);
      ctx.lineTo(0, 2.5);
      ctx.lineTo(-4.8, 5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      if (speed.current) speed.current.textContent = String(Math.round(Math.abs(truck.speed) * 9));
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [open]);
  if (!open && collapsible) {
    return (
      <button onClick={() => setOpen(true)} aria-label="Show map" className="glass pointer-events-auto touch-target flex h-12 w-12 items-center justify-center rounded-full"><MapIcon size={20} /></button>
    );
  }
  return (
    <div className="glass pointer-events-auto rounded-[22px] p-1.5">
      <canvas ref={ref} width={132} height={92} className="block rounded-[16px]" aria-label="Minimap" />
      <div className="flex items-center justify-between px-1.5 pt-1">
        <span className="text-[13px] font-semibold tabular-nums"><span ref={speed}>0</span> <span className="text-[11px] font-normal text-white/60">km/h</span></span>
        {collapsible && <button onClick={() => setOpen(false)} aria-label="Hide map" className="touch-target flex h-8 w-8 items-center justify-center rounded-full text-white/60"><ChevronDown size={16} /></button>}
      </div>
    </div>
  );
}

export function Joystick() {
  const base = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const active = useRef<number | null>(null);
  const R = 44;
  const move = (e: React.PointerEvent) => {
    const r = base.current!.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2);
    let dy = e.clientY - (r.top + r.height / 2);
    const d = Math.hypot(dx, dy);
    if (d > R) {
      dx = (dx / d) * R;
      dy = (dy / d) * R;
    }
    setKnob({ x: dx, y: dy });
    truck.stick.x = Math.abs(dx / R) < 0.15 ? 0 : dx / R;
    truck.stick.y = Math.abs(dy / R) < 0.15 ? 0 : -dy / R;
  };
  const end = () => {
    active.current = null;
    setKnob({ x: 0, y: 0 });
    truck.stick.x = truck.stick.y = 0;
  };
  return (
    <div
      ref={base}
      className="glass pointer-events-auto relative h-[120px] w-[120px] touch-none select-none rounded-full"
      onPointerDown={(e) => {
        active.current = e.pointerId;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        move(e);
      }}
      onPointerMove={(e) => active.current === e.pointerId && move(e)}
      onPointerUp={end}
      onPointerCancel={end}
      role="application"
      aria-label="Drive joystick"
    >
      <div className="absolute left-1/2 top-1/2 h-14 w-14 rounded-full bg-white/85 shadow-lg" style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))`, transition: active.current === null ? 'transform 160ms ease-out' : 'none' }} />
    </div>
  );
}

export function EyeButton() {
  const toggleUi = useGame((s) => s.toggleUi);
  const hidden = useGame((s) => s.uiHidden);
  return (
    <button onClick={toggleUi} aria-label={hidden ? 'Show interface' : 'Hide interface'} className="glass pointer-events-auto touch-target flex h-12 w-12 items-center justify-center rounded-full">
      <Eye size={20} className={hidden ? 'text-[#0a84ff]' : ''} />
    </button>
  );
}
