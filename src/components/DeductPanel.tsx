import { Flag, ScanSearch, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useGame } from '../store/useGame';
import type { AIEngineer } from '../types/game';

const SCAN = {
  UNSCANNED: { t: 'Not inspected', c: 'text-white/50' },
  SCANNING: { t: 'Inspecting…', c: 'text-[#ff9f0a]' },
  CLEAN: { t: 'Looks fine', c: 'text-[#30d158]' },
  ANOMALY: { t: 'Something odd', c: 'text-[#ff453a]' },
} as const;

const AVATARS = ['#e8423a', '#3a6fe8', '#37b24d', '#f2c230', '#e36ad0', '#ff8a1f', '#39c9d6', '#f5f5f5'];

function Row({ e, i }: { e: AIEngineer; i: number }) {
  const node = useGame((s) => s.g.nodes[e.nodeId]);
  const selected = useGame((s) => s.g.selectedNodeId === e.nodeId);
  const logs = useGame((s) => s.g.logs);
  const flag = useGame((s) => s.flag);
  const selectNode = useGame((s) => s.selectNode);
  const last = logs.filter((l) => l.source === e.callsign).slice(-2);
  const sc = SCAN[e.scanStatus];
  return (
    <div className={`group-row !items-start ${selected ? 'bg-white/8' : ''}`}>
      <button className="touch-target flex min-w-0 flex-1 items-start gap-3 text-left" onClick={() => selectNode(e.nodeId)}>
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[15px] font-bold text-black/70" style={{ background: AVATARS[i % AVATARS.length] }}>{e.callsign.slice(-2)}</span>
        <span className="min-w-0">
          <span className="block text-[16px] font-semibold leading-tight">{e.callsign} <span className="font-normal text-white/55">· {node.name}</span></span>
          <span className={`block text-[13px] ${sc.c}`}>{sc.t}</span>
          {last.map((l) => <span key={l.id} className="block truncate text-[12px] text-white/50">{l.timestamp} {l.message}</span>)}
        </span>
      </button>
      {e.revealed ? (
        e.role === 'SABOTEUR' ? <span className="flex items-center gap-1 text-[13px] font-semibold text-[#ff453a]"><ShieldAlert size={16} />Saboteur</span> : <span className="flex items-center gap-1 text-[13px] font-semibold text-[#30d158]"><ShieldCheck size={16} />Innocent</span>
      ) : (
        <button className={`touch-target flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${e.flagged ? 'bg-[#ff9f0a] text-black' : 'bg-white/12 text-white/70'}`} onClick={() => flag(e.id)} aria-label={`Flag ${e.callsign} as suspect`} aria-pressed={e.flagged}><Flag size={18} /></button>
      )}
    </div>
  );
}

export default function DeductPanel() {
  const g = useGame((s) => s.g);
  if (g.mode !== 'SABOTEUR_DEDUCTION') {
    return (
      <div className="flex flex-col gap-3">
        <div className="group-list">
          <div className="group-row"><span className="flex items-center gap-2 text-[15px] font-semibold"><ScanSearch size={18} className="text-[#0a84ff]" />Storm watch</span></div>
          {g.hazards.length === 0 && <div className="group-row text-[15px] text-[#30d158]">All quiet right now</div>}
          {g.hazards.map((h) => (
            <div key={h.id} className="group-row text-[15px] text-[#ffb340]"><span>⚠ {h.type.replace('_', ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase())} · {g.nodes[h.targetNodeId].shortName}</span><span className="tabular-nums">{h.remainingSec}s</span></div>
          ))}
          <div className="group-row text-[15px]"><span>Blackouts</span><span className="font-semibold tabular-nums text-[#ff453a]">{g.blackoutCount}/{g.mode === 'PRACTICE' ? '∞' : g.defeatBlackouts}</span></div>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="group-list">
        <div className="group-row"><span className="text-[15px]">Inspections left</span><b className="tabular-nums text-[#ff9f0a]">{g.scansRemaining}</b></div>
        <div className="group-row"><span className="text-[15px]">Saboteurs caught</span><b className="tabular-nums text-[#30d158]">{g.engineers.filter((e) => e.role === 'SABOTEUR' && e.isolated).length}/2</b></div>
        <div className="group-row"><span className="text-[15px]">Wrong votes</span><b className="tabular-nums text-[#ff453a]">{g.wrongVotes}/3</b></div>
      </div>
      <div className="px-1 text-[13px] leading-snug text-white/60">Tap an engineer, then use Inspect or Vote out (tap twice) in the District tab.</div>
      <div className="group-list">
        {g.engineers.map((e, i) => <Row key={e.id} e={e} i={i} />)}
      </div>
    </div>
  );
}
