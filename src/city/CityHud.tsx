import { CircleHelp, Video } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { DISTRICT_ORDER } from '../engine/constants';
import { currentObjective } from '../engine/sim';
import { useGame } from '../store/useGame';
import { DEPOT, truck } from './truck';

const WORLD = { w: 24, d: 17 };
const COLORS = { NOMINAL: '#00F5D4', CAUTION: '#FFB703', CRITICAL: '#FF0054', BLACKOUT: '#475569', ISOLATED: '#3A86FF' } as const;

function Objective({ top }: { top: number }) {
  const g = useGame((s) => s.g);
  const o = useMemo(() => currentObjective(g), [g]);
  const tone =
    o.kind === 'DELIVER' ? 'border-[#00ff88] text-[#00ff88]' : o.kind === 'PICKUP' ? 'border-[#ffd400] text-[#ffd400]' : o.kind === 'INVESTIGATE' ? 'border-scada-cobalt text-scada-cobalt' : 'border-scada-mint text-scada-mint';
  const icon = o.kind === 'DELIVER' ? '🟢' : o.kind === 'PICKUP' ? '🟡' : o.kind === 'INVESTIGATE' ? '🕵️' : '⏳';
  return (
    <div className="pointer-events-none absolute inset-x-0 flex flex-col items-center gap-1 px-3" style={{ top }}>
      <div className={`flex max-w-md items-center gap-2 rounded-xl border-2 bg-black/70 px-3 py-1.5 backdrop-blur ${tone}`}>
        <span className="text-lg leading-none">{icon}</span>
        <div className="min-w-0">
          <div className="font-hud text-sm font-bold uppercase leading-tight tracking-wide">{o.title}</div>
          <div className="text-[11px] leading-tight text-white/75">{o.detail}</div>
        </div>
      </div>
      <Stats />
    </div>
  );
}

function Stats() {
  const crew = useGame((s) => s.g.crew);
  const mode = useGame((s) => s.g.mode);
  const kit = crew.hasKit ? 'KIT LOADED' : crew.kitCooldown > 0 ? `NEXT KIT ${crew.kitCooldown}s` : 'NO KIT';
  return (
    <div className="flex gap-1.5 font-hud text-xs font-bold uppercase tracking-wide">
      <span className="rounded-lg bg-black/65 px-2 py-1 text-[#ffd400]">💰 {crew.credits}</span>
      <span className="rounded-lg bg-black/65 px-2 py-1 text-white">🔧 {crew.deliveries}</span>
      <span className={`rounded-lg bg-black/65 px-2 py-1 ${crew.hasKit ? 'text-[#00ff88]' : 'text-white/70'}`}>{mode === 'SOLO_CRISIS' || crew.hasKit ? kit : kit}</span>
    </div>
  );
}

function Minimap() {
  const ref = useRef<HTMLCanvasElement>(null);
  const speed = useRef<HTMLSpanElement>(null);
  useEffect(() => {
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
      ctx.fillStyle = 'rgba(6,10,20,0.78)';
      ctx.fillRect(0, 0, W, H);
      const mx = (x: number) => ((x + 15) / 30) * W;
      const mz = (z: number) => ((z + 12) / 24) * H;
      ctx.strokeStyle = 'rgba(120,140,180,0.35)';
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
        ctx.fillRect(x - 6, y - 4.5, 12, 9);
        if (o.targetNodeId === id) {
          ctx.strokeStyle = `rgba(0,255,136,${pulse})`;
          ctx.lineWidth = 2;
          ctx.strokeRect(x - 9, y - 7.5, 18, 15);
          ctx.lineWidth = 1;
        }
      }
      ctx.fillStyle = o.kind === 'PICKUP' ? `rgba(255,212,0,${pulse})` : 'rgba(255,212,0,0.45)';
      ctx.beginPath();
      ctx.arc(mx(DEPOT.x), mz(DEPOT.z), 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.translate(mx(truck.x), mz(truck.z));
      ctx.rotate(Math.PI - truck.heading);
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(4.5, 5);
      ctx.lineTo(0, 2.5);
      ctx.lineTo(-4.5, 5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      if (speed.current) speed.current.textContent = String(Math.round(Math.abs(truck.speed) * 9));
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div className="flex flex-col items-end gap-1">
      <canvas ref={ref} width={132} height={92} className="rounded-lg border border-white/20" aria-label="Minimap" />
      <div className="rounded-lg bg-black/65 px-2 py-0.5 font-hud text-sm font-bold text-white">
        <span ref={speed}>0</span> <span className="text-[10px] text-white/60">KM/H</span>
      </div>
    </div>
  );
}

function Joystick() {
  const base = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const active = useRef<number | null>(null);
  const R = 42;
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
      className="pointer-events-auto relative h-[112px] w-[112px] touch-none select-none rounded-full border-2 border-white/25 bg-black/40"
      onPointerDown={(e) => {
        active.current = e.pointerId;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        move(e);
      }}
      onPointerMove={(e) => active.current === e.pointerId && move(e)}
      onPointerUp={end}
      onPointerCancel={end}
      aria-label="Drive joystick"
    >
      <div className="absolute left-1/2 top-1/2 h-14 w-14 rounded-full border-2 border-white/60 bg-white/25" style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }} />
      <span className="absolute left-1/2 top-1 -translate-x-1/2 text-[10px] text-white/50">▲</span>
      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] text-white/50">▼</span>
    </div>
  );
}

export default function CityHud({ topOffset }: { topOffset: number }) {
  const view = useGame((s) => s.cityView);
  const toggleView = useGame((s) => s.toggleView);
  const openTutorial = useGame((s) => s.openTutorial);
  const coarse = useMemo(() => window.matchMedia('(pointer: coarse)').matches, []);
  const btn = 'pointer-events-auto touch-target flex h-12 w-12 items-center justify-center rounded-xl border border-white/25 bg-black/60 text-white backdrop-blur';
  return (
    <>
      <Objective top={topOffset} />
      <div className="pointer-events-none absolute bottom-2 left-2 flex flex-col gap-2">
        {coarse ? <Joystick /> : (
          <div className="rounded-lg bg-black/60 px-2.5 py-1.5 font-hud text-xs uppercase leading-5 tracking-wide text-white/80">
            <b className="text-white">WASD / Arrows</b> drive · <b className="text-white">E</b> horn<br />
            <b className="text-white">V</b> camera · <b className="text-white">?</b> how to play
          </div>
        )}
      </div>
      <div className="pointer-events-none absolute bottom-2 right-2 flex items-end gap-2">
        <div className="flex flex-col gap-2">
          <button className={btn} onClick={toggleView} aria-label="Switch camera view" title="Camera (V)"><Video size={20} className={view === 'OVERVIEW' ? 'text-scada-cobalt' : ''} /></button>
          <button className={btn} onClick={openTutorial} aria-label="How to play" title="How to play (?)"><CircleHelp size={20} /></button>
        </div>
        <Minimap />
      </div>
    </>
  );
}
