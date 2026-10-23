import { Ban, Route, ScanSearch, Snowflake, Unplug, type LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { C } from '../engine/constants';
import { canControl } from '../engine/sim';
import { useGame } from '../store/useGame';

function Btn({
  Icon, label, sub, onClick, disabled, tone, armed, vertical,
}: {
  vertical?: boolean;
  Icon: LucideIcon; label: string; sub?: string; onClick: () => void; disabled?: boolean;
  tone: 'cobalt' | 'mint' | 'crimson' | 'amber'; armed?: boolean;
}) {
  const tones = {
    cobalt: 'border-scada-cobalt text-scada-cobalt',
    mint: 'border-scada-mint text-scada-mint',
    crimson: 'border-scada-crimson text-scada-crimson',
    amber: 'border-scada-amber text-scada-amber',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`touch-target flex h-14 ${vertical ? 'w-24 flex-none' : 'flex-1'} flex-col items-center justify-center rounded-xl border bg-scada-bg/80 text-[11px] font-bold disabled:opacity-35 ${tones[tone]} ${
        armed ? 'animate-alarm-pulse bg-scada-crimson/20' : ''
      }`}
    >
      <Icon size={20} />
      <span>{label}</span>
      {sub && <span className="text-[9px] font-normal opacity-80">{sub}</span>}
    </button>
  );
}

export default function ActionBar({ className = '', vertical = false }: { className?: string; vertical?: boolean }) {
  const g = useGame((s) => s.g);
  const act = useGame((s) => s.act);
  const vote = useGame((s) => s.vote);
  const [armed, setArmed] = useState(false);
  const node = g.nodes[g.selectedNodeId];
  const deduction = g.mode === 'SABOTEUR_DEDUCTION';
  const eng = deduction ? g.engineers.find((e) => e.nodeId === node.id) : undefined;
  const own = canControl(g, node.id);
  const online = node.status !== 'BLACKOUT' && !node.isolated;

  useEffect(() => { setArmed(false); }, [node.id]);
  useEffect(() => {
    if (!armed) return;
    const t = window.setTimeout(() => setArmed(false), 3000);
    return () => window.clearTimeout(t);
  }, [armed]);

  const coolOk = own && online && !node.coolantActive && node.coolantCooldown <= 0 && g.reserveMW >= C.COOLANT_COST_MW;
  const coolSub = node.coolantActive ? 'ACTIVE' : node.coolantCooldown > 0 ? `${node.coolantCooldown}s` : `-${C.COOLANT_COST_MW}MW`;

  let diagOk: boolean;
  let diagSub: string | undefined;
  if (deduction) {
    diagOk = !!eng && !eng.isolated && online && g.scansRemaining > 0 && node.diagnosticRemaining === 0;
    diagSub = node.diagnosticRemaining > 0 ? `${node.diagnosticRemaining}s` : `${g.scansRemaining} left`;
  } else {
    diagOk = own && node.status !== 'BLACKOUT' && node.diagnosticRemaining === 0;
    diagSub = node.diagnosticRemaining > 0 ? `${node.diagnosticRemaining}s` : undefined;
  }

  const isoOk = deduction ? !!eng && !eng.isolated : own && node.status !== 'BLACKOUT';
  const isoLabel = deduction ? (armed ? 'Confirm?' : 'Vote out') : node.isolated ? 'Reconnect' : 'Cut off';

  return (
    <div className={`flex gap-2 bg-scada-panel/95 p-2 ${vertical ? 'flex-col justify-center border-l' : 'border-t'} border-scada-border ${className}`}>
      <Btn vertical={vertical} Icon={Route} label="Divert" sub="+60 MW" tone="cobalt" disabled={!own || !online} onClick={() => act('REROUTE')} />
      <Btn vertical={vertical} Icon={Snowflake} label="Cool down" sub={coolSub} tone="mint" disabled={!coolOk} onClick={() => act('COOLANT')} />
      <Btn
        vertical={vertical}
        Icon={deduction ? Ban : Unplug} label={isoLabel} tone="crimson" armed={armed} disabled={!isoOk}
        onClick={() => {
          if (!deduction) return act('ISOLATE');
          if (!armed) return setArmed(true);
          setArmed(false);
          if (eng) vote(eng.id);
        }}
      />
      <Btn vertical={vertical} Icon={ScanSearch} label="Inspect" sub={diagSub} tone="amber" disabled={!diagOk} onClick={() => act('DIAGNOSTIC')} />
    </div>
  );
}
