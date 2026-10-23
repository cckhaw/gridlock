import { ArrowLeft } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { DISTRICT_DEFS, DISTRICT_ORDER } from '../engine/constants';
import { useGame } from '../store/useGame';
import type { TimelineKind } from '../types/game';

const KIND_COLOR: Record<TimelineKind, string> = {
  HAZARD: '#FFB703',
  BLACKOUT: '#FF0054',
  TACTIC: '#C77DFF',
  SCAN: '#3A86FF',
  VOTE: '#00F5D4',
  COOLANT: '#3A86FF',
};

const heat = (t: number, down: boolean) => {
  if (down) return '#1E293B';
  if (t >= 95) return '#FF0054';
  if (t >= 80) return '#FFB703';
  const k = Math.max(0, Math.min(1, (t - 55) / 25));
  return `rgb(${Math.round(0 + k * 120)},${Math.round(160 - k * 20)},${Math.round(150 - k * 90)})`;
};

export default function Replay({ onClose }: { onClose: () => void }) {
  const g = useGame((s) => s.g);
  const h = g.history;
  const last = h.length - 1;
  const [cursor, setCursor] = useState(Math.max(0, last));
  const canvas = useRef<HTMLCanvasElement>(null);
  const point = h[Math.min(cursor, last)];

  useEffect(() => {
    const c = canvas.current;
    if (!c || !h.length) return;
    c.width = h.length;
    c.height = DISTRICT_ORDER.length;
    const ctx = c.getContext('2d')!;
    h.forEach((p, x) => {
      p.temps.forEach((t, y) => {
        ctx.fillStyle = heat(t, (p.down & (1 << y)) !== 0);
        ctx.fillRect(x, y, 1, 1);
      });
    });
  }, [h]);

  const events = useMemo(() => g.timeline.filter((e) => e.kind !== 'COOLANT'), [g.timeline]);
  const nearby = events.filter((e) => Math.abs(e.tick - (point?.tick ?? 0)) <= 2);
  const logsNow = g.logs.filter((l) => l.tick === point?.tick).slice(-8);
  const hottest = point ? point.temps.indexOf(Math.max(...point.temps)) : 0;
  const xPct = (tick: number) => (h.length > 1 ? ((tick - 1) / (h.length - 1)) * 100 : 0);

  if (!point) return null;
  const path = h.map((p, i) => `${(i / Math.max(1, h.length - 1)) * 100},${100 - p.health}`).join(' ');

  return (
    <div className="fixed inset-0 z-[55] overflow-y-auto bg-scada-bg p-4 font-mono">
      <div className="mx-auto flex max-w-2xl flex-col gap-3">
        <button onClick={onClose} className="touch-target flex items-center gap-2 self-start text-xs text-scada-cobalt">
          <ArrowLeft size={18} /> BACK TO RESULTS
        </button>
        <h2 className="text-xl font-bold text-scada-mint text-glow-mint">POST-GAME REPLAY</h2>

        <div className="scada-panel p-3">
          <div className="mb-1 flex justify-between text-[11px] text-scada-dim">
            <span>GRID HEALTH</span>
            <span>T+{point.tick}s · {point.health}%</span>
          </div>
          <div className="relative">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-24 w-full rounded bg-black/40">
              <polyline points={path} fill="none" stroke="#00F5D4" strokeWidth={1.2} vectorEffect="non-scaling-stroke" />
            </svg>
            {events.map((e, i) => (
              <span
                key={i}
                title={e.label}
                className="absolute top-0 h-full w-px opacity-60"
                style={{ left: `${xPct(e.tick)}%`, backgroundColor: KIND_COLOR[e.kind] }}
              />
            ))}
            <span className="absolute top-0 h-full w-0.5 bg-white" style={{ left: `${xPct(point.tick)}%` }} />
          </div>

          <div className="mt-3 text-[11px] text-scada-dim">DISTRICT TEMPERATURE (rows: {DISTRICT_ORDER.map((d) => DISTRICT_DEFS[d].shortName).join(' ')})</div>
          <div className="relative">
            <canvas ref={canvas} className="h-24 w-full rounded" style={{ imageRendering: 'pixelated' }} />
            <span className="absolute top-0 h-full w-0.5 bg-white" style={{ left: `${xPct(point.tick)}%` }} />
          </div>

          <input
            type="range" className="mw-slider mt-2" min={0} max={last} value={cursor}
            onChange={(e) => setCursor(Number(e.target.value))} aria-label="Scrub replay"
          />
        </div>

        <div className="scada-panel p-3 text-xs">
          <div className="mb-1 text-scada-dim">AT T+{point.tick}s · hottest: <b className="text-scada-amber">{DISTRICT_DEFS[DISTRICT_ORDER[hottest]].name} {point.temps[hottest]}°C</b></div>
          {nearby.map((e, i) => (
            <div key={i} style={{ color: KIND_COLOR[e.kind] }}>◆ {e.label}</div>
          ))}
          <div className="mt-1 rounded bg-black/40 p-2 text-[11px] leading-4">
            {logsNow.length ? logsNow.map((l) => <div key={l.id}><span className="text-scada-dim">[{l.timestamp}]</span> {l.source} {l.message}</div>) : <span className="text-scada-dim">No log lines this second.</span>}
          </div>
        </div>

        <div className="scada-panel p-3">
          <div className="mb-1 text-[11px] text-scada-dim">TIMELINE (tap to jump)</div>
          <div className="max-h-56 overflow-y-auto text-xs">
            {events.map((e, i) => (
              <button key={i} className="flex min-h-8 w-full gap-2 text-left" onClick={() => setCursor(Math.min(last, Math.max(0, e.tick - 1)))}>
                <span className="w-10 shrink-0 text-scada-dim">{e.tick}s</span>
                <span style={{ color: KIND_COLOR[e.kind] }}>{e.kind === 'TACTIC' ? '🕵 ' : ''}{e.label}</span>
              </button>
            ))}
            {events.length === 0 && <div className="text-scada-dim">Nothing eventful happened.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
