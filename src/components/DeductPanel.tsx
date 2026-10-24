import { Flag, ScanSearch, ShieldAlert, ShieldCheck } from 'lucide-react';
import { C } from '../engine/constants';
import { useGame } from '../store/useGame';
import type { AIEngineer } from '../types/game';

const SCAN = {
  UNSCANNED: { t: 'UNSCANNED', c: 'text-scada-dim' },
  SCANNING: { t: 'SCANNING…', c: 'text-scada-amber' },
  CLEAN: { t: 'CLEAN', c: 'text-scada-mint' },
  ANOMALY: { t: 'ANOMALY', c: 'text-scada-crimson' },
} as const;

function Card({ e }: { e: AIEngineer }) {
  const node = useGame((s) => s.g.nodes[e.nodeId]);
  const logs = useGame((s) => s.g.logs);
  const flag = useGame((s) => s.flag);
  const selectNode = useGame((s) => s.selectNode);
  const mine = logs.filter((l) => l.source === e.callsign).slice(-3);
  const sc = SCAN[e.scanStatus];
  return (
    <div className={`scada-panel flex flex-col gap-1.5 border p-2.5 ${e.flagged ? 'border-scada-amber' : ''} ${e.isolated ? 'opacity-70' : ''}`}>
      <div className="flex items-center gap-2">
        <button className="touch-target min-w-0 flex-1 text-left" onClick={() => selectNode(e.nodeId)}>
          <div className="text-xs font-bold">{e.callsign} <span className="font-normal text-scada-dim">· {node.name}</span></div>
          <div className={`text-[11px] font-bold ${sc.c}`}>{sc.t}</div>
        </button>
        {e.revealed ? (
          e.role === 'SABOTEUR'
            ? <span className="flex items-center gap-1 text-[11px] font-bold text-scada-crimson"><ShieldAlert size={16} />SABOTEUR</span>
            : <span className="flex items-center gap-1 text-[11px] font-bold text-scada-mint"><ShieldCheck size={16} />INNOCENT</span>
        ) : (
          <button
            className={`touch-target flex h-12 w-12 items-center justify-center rounded border ${e.flagged ? 'border-scada-amber text-scada-amber' : 'border-scada-border text-scada-dim'}`}
            onClick={() => flag(e.id)} aria-label={`Flag ${e.callsign} as suspect`}
          >
            <Flag size={18} />
          </button>
        )}
      </div>
      <div className="min-h-[3.75rem] rounded bg-black/40 p-1.5 text-[10px] leading-4 text-scada-dim">
        {mine.length ? mine.map((l) => <div key={l.id} className="truncate">[{l.timestamp}] {l.message}</div>) : 'No actions logged yet.'}
      </div>
    </div>
  );
}

export default function DeductPanel() {
  const g = useGame((s) => s.g);
  if (g.mode !== 'SABOTEUR_DEDUCTION') {
    return (
      <div className="scada-panel flex flex-col gap-2 p-3 text-xs">
        <div className="flex items-center gap-2 font-bold text-scada-cobalt"><ScanSearch size={18} />Storm watch</div>
        <p className="text-scada-dim">Active storm hazards:</p>
        {g.hazards.length === 0 && <div className="text-scada-mint">All quiet — next hazard in ≤{g.nextHazardInSec}s</div>}
        {g.hazards.map((h) => (
          <div key={h.id} className="text-scada-amber">⚠ {h.type.replace('_', ' ')} @ {g.nodes[h.targetNodeId].shortName} · {h.remainingSec}s</div>
        ))}
        <div className="text-scada-dim">Blackouts: <span className="text-scada-crimson">{g.blackoutCount}/{g.defeatBlackouts}</span></div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="scada-panel flex justify-between p-2 text-[11px]">
        <span>SCANS <b className="text-scada-amber">{g.scansRemaining}</b></span>
        <span>SABOTEURS <b className="text-scada-crimson">{g.engineers.filter((e) => e.role === 'SABOTEUR' && e.isolated).length}/2</b></span>
        <span>ERRORS <b className="text-scada-crimson">{g.wrongVotes}/{C.MAX_WRONG_VOTES}</b></span>
      </div>
      <div className="text-[11px] text-scada-dim">Select a roster node, then use DIAGNOSE or VOTE OUT (tap twice) in the action bar.</div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        {g.engineers.map((e) => <Card key={e.id} e={e} />)}
      </div>
    </div>
  );
}
