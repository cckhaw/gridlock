import {
  Building2, Factory, FlaskConical, Home, Hospital, ShieldHalf, TrainFront, Droplets, type LucideIcon,
} from 'lucide-react';
import type { NodeStatus } from '../types/game';

export const ICONS: Record<string, LucideIcon> = {
  Building2, Factory, Hospital, TrainFront, Home, Droplets, ShieldHalf, FlaskConical,
};

export const STATUS_STYLE: Record<
  NodeStatus,
  { text: string; border: string; bg: string; glow: string; hex: string; label: string }
> = {
  NOMINAL: { text: 'text-scada-mint', border: 'border-scada-mint/50', bg: 'bg-scada-mint', glow: 'shadow-glow-mint', hex: '#30D158', label: 'NOMINAL' },
  CAUTION: { text: 'text-scada-amber', border: 'border-scada-amber/70', bg: 'bg-scada-amber', glow: 'shadow-glow-amber', hex: '#FF9F0A', label: 'CAUTION' },
  CRITICAL: { text: 'text-scada-crimson', border: 'border-scada-crimson', bg: 'bg-scada-crimson', glow: 'shadow-glow-crimson animate-alarm-pulse', hex: '#FF453A', label: 'CRITICAL' },
  BLACKOUT: { text: 'text-scada-dim', border: 'border-scada-border', bg: 'bg-scada-dim', glow: '', hex: '#636366', label: 'BLACKOUT' },
  ISOLATED: { text: 'text-scada-cobalt', border: 'border-scada-cobalt/50', bg: 'bg-scada-cobalt', glow: '', hex: '#0A84FF', label: 'ISOLATED' },
};

export function healthColor(v: number): string {
  if (v >= 65) return '#30D158';
  if (v >= 35) return '#FF9F0A';
  return '#FF453A';
}

/** Linear gauge with smooth transitions and optional threshold markers. */
export function Gauge({
  value, max, color, markers = [], label, display,
}: {
  value: number; max: number; color: string; markers?: number[]; label?: string; display?: string;
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="w-full">
      {(label || display) && (
        <div className="flex justify-between text-[11px] leading-4 text-scada-dim">
          <span>{label}</span>
          <span style={{ color }}>{display}</span>
        </div>
      )}
      <div className="relative h-2 w-full overflow-hidden rounded bg-scada-border">
        <div
          className="h-full rounded transition-[width,background-color] duration-1000 ease-linear"
          style={{ width: `${pct}%`, backgroundColor: color, boxShadow: `0 0 8px ${color}` }}
        />
        {markers.map((m) => (
          <div key={m} className="absolute top-0 h-full w-px bg-scada-text/60" style={{ left: `${(m / max) * 100}%` }} />
        ))}
      </div>
    </div>
  );
}

export const tempColor = (t: number) => (t >= 95 ? '#FF453A' : t >= 80 ? '#FF9F0A' : '#30D158');
export const integrityColor = (i: number) => (i < 35 ? '#FF453A' : i < 70 ? '#FF9F0A' : '#30D158');
