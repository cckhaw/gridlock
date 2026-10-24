import { ChevronDown, CircleHelp, EyeOff, Home, Moon, Music, Pause, Play, Sun, SunMoon, Video, Volume2, VolumeX } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { fmtTime } from '../engine/sim';
import { useGame } from '../store/useGame';
import { healthColor } from '../components/ui';

function Ring({ value, color }: { value: number; color: string }) {
  const r = 15;
  const c = 2 * Math.PI * r;
  return (
    <svg width="38" height="38" viewBox="0 0 38 38" aria-hidden>
      <circle cx="19" cy="19" r={r} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="4" />
      <circle cx="19" cy="19" r={r} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} transform="rotate(-90 19 19)" style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s' }} />
    </svg>
  );
}

function IconBtn({ label, onClick, children, active }: { label: string; onClick: () => void; children: ReactNode; active?: boolean }) {
  return (
    <button onClick={onClick} aria-label={label} title={label} className={`touch-target flex h-11 w-11 items-center justify-center rounded-full ${active ? 'bg-[#0a84ff] text-white' : 'bg-white/12 text-white'}`}>
      {children}
    </button>
  );
}

/** Dynamic-Island-style status capsule: tap to expand quick controls. */
export default function StatusCapsule() {
  const g = useGame((s) => s.g);
  const [open, setOpen] = useState(false);
  const { togglePause, toggleMute, toggleMusic, cycleTimeOfDay, toggleView, openTutorial, toggleUi, toMenu } = useGame.getState();
  const view = useGame((s) => s.cityView);
  const practice = g.mode === 'PRACTICE';
  const paused = g.phase === 'PAUSED';
  const color = healthColor(g.gridHealth);
  const tod = g.settings.timeOfDay;
  return (
    <div className="glass pointer-events-auto w-fit max-w-[92vw] rounded-[26px] p-1.5">
      <button onClick={() => setOpen(!open)} className="touch-target flex min-h-11 items-center gap-2.5 rounded-full pl-1 pr-3" aria-expanded={open} aria-label="City status">
        <Ring value={g.gridHealth} color={color} />
        <span className="flex flex-col items-start leading-none">
          <span className="text-[11px] font-medium text-white/60">{practice ? 'Practice' : 'Storm ends in'}</span>
          <span className={`mt-0.5 text-[22px] font-bold tabular-nums ${!practice && g.timeRemainingSec <= 30 ? 'text-[#ff453a]' : 'text-white'}`}>{practice ? '∞' : fmtTime(g.timeRemainingSec)}</span>
        </span>
        <ChevronDown size={18} className={`text-white/60 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="mt-1 flex flex-col gap-2 px-1 pb-1">
          <div className="group-list">
            <div className="group-row"><span className="text-[15px]">City power</span><span className="text-[15px] font-semibold tabular-nums" style={{ color }}>{g.gridHealth}%</span></div>
            <div className="group-row"><span className="text-[15px]">Spare power</span><span className="text-[15px] font-semibold tabular-nums text-[#0a84ff]">{g.reserveMW} MW</span></div>
          </div>
          <div className="flex flex-wrap gap-2">
            <IconBtn label={paused ? 'Resume' : 'Pause'} onClick={togglePause}>{paused ? <Play size={18} /> : <Pause size={18} />}</IconBtn>
            <IconBtn label={g.settings.muted ? 'Unmute' : 'Mute'} onClick={toggleMute}>{g.settings.muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</IconBtn>
            <IconBtn label={g.settings.music ? 'Music on' : 'Music off'} onClick={toggleMusic} active={g.settings.music}><Music size={18} /></IconBtn>
            <IconBtn label={`Time of day: ${tod}`} onClick={cycleTimeOfDay}>{tod === 'DAY' ? <Sun size={18} /> : tod === 'NIGHT' ? <Moon size={18} /> : <SunMoon size={18} />}</IconBtn>
            <IconBtn label="Camera" onClick={toggleView} active={view === 'OVERVIEW'}><Video size={18} /></IconBtn>
            <IconBtn label="Hide interface" onClick={toggleUi}><EyeOff size={18} /></IconBtn>
            <IconBtn label="How to play" onClick={openTutorial}><CircleHelp size={18} /></IconBtn>
            <IconBtn label="Quit to menu" onClick={toMenu}><Home size={18} /></IconBtn>
          </div>
        </div>
      )}
    </div>
  );
}
