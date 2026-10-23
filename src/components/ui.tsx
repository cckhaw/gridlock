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
  NOMINAL: { text: 'text-scada-mint', border: 'border-scada-mint/50', bg: 'bg-scada-mint', glow: 'shadow-glow-mint', hex: '#00F5D4', label: 'NOMINAL' },
  CAUTION: { text: 'text-scada-amber', border: 'border-scada-amber/70', bg: 'bg-scada-amber', glow: 'shadow-glow-amber', hex: '#FFB703', label: 'CAUTION' },
  CRITICAL: { text: 'text-scada-crimson', border: 'border-scada-crimson', bg: 'bg-scada-crimson', glow: 'shadow-glow-crimson animate-alarm-pulse', hex: '#FF0054', label: 'CRITICAL' },
  BLACKOUT: { text: 'text-scada-dim', border: 'border-scada-border', bg: 'bg-scada-dim', glow: '', hex: '#475569', label: 'BLACKOUT' },
  ISOLATED: { text: 'text-scada-cobalt', border: 'border-scada-cobalt/50', bg: 'bg-scada-cobalt', glow: '', hex: '#3A86FF', label: 'ISOLATED' },
};

export function healthColor(v: number): string {
  if (v >= 65) return '#00F5D4';
  if (v >= 35) return '#FFB703';
  return '#FF0054';
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

export const tempColor = (t: number) => (t >= 95 ? '#FF0054' : t >= 80 ? '#FFB703' : '#00F5D4');
export const integrityColor = (i: number) => (i < 35 ? '#FF0054' : i < 70 ? '#FFB703' : '#00F5D4');
