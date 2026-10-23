import { Monitor, Pause, Play, Volume2, VolumeX } from 'lucide-react';
import { fmtTime } from '../engine/sim';
import { useGame } from '../store/useGame';
import { healthColor } from './ui';

export default function TopBar() {
  const health = useGame((s) => s.g.gridHealth);
  const time = useGame((s) => s.g.timeRemainingSec);
  const muted = useGame((s) => s.g.settings.muted);
  const crt = useGame((s) => s.g.settings.crtScanlines);
  const paused = useGame((s) => s.g.phase === 'PAUSED');
  const reserve = useGame((s) => s.g.reserveMW);
  const { toggleMute, toggleCrt, togglePause } = useGame.getState();
  const color = healthColor(health);
  const btn = 'touch-target flex items-center justify-center rounded border border-scada-border bg-scada-panel text-scada-text';

  return (
    <header className="pt-safe flex shrink-0 items-center gap-1.5 border-b xs:gap-2 border-scada-border bg-scada-panel px-3 py-2">
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between text-[11px] text-scada-dim">
          <span className="whitespace-nowrap">GRID HEALTH</span>
          <span style={{ color }} className="font-bold">{health}%</span>
        </div>
        <div className="h-3 overflow-hidden rounded bg-scada-border">
          <div
            className="h-full transition-[width,background-color] duration-1000 ease-linear"
            style={{ width: `${health}%`, backgroundColor: color, boxShadow: `0 0 10px ${color}` }}
          />
        </div>
        <div className="mt-0.5 text-[10px] text-scada-dim">RESERVE <span className="text-scada-cobalt">{reserve} MW</span></div>
      </div>
      <div className={`font-bold tabular-nums text-xl xs:text-2xl ${time <= 30 ? 'text-scada-crimson text-glow-crimson' : 'text-scada-mint text-glow-mint'}`}>
        {fmtTime(time)}
      </div>
      <button className={btn} onClick={togglePause} aria-label={paused ? 'Resume' : 'Pause'}>
        {paused ? <Play size={20} /> : <Pause size={20} />}
      </button>
      <button className={`${btn} hidden min-[400px]:flex ${crt ? 'text-scada-mint' : 'text-scada-dim'}`} onClick={toggleCrt} aria-label="Toggle CRT scanlines">
        <Monitor size={20} />
      </button>
      <button className={btn} onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'}>
        {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
      </button>
    </header>
  );
}
