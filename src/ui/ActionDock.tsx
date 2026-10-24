import { Ban, ChevronDown, ChevronUp, Route, ScanSearch, Snowflake, Unplug, type LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { C } from '../engine/constants';
import { canControl } from '../engine/sim';
import { useGame } from '../store/useGame';

const TINT = {
  blue: { bg: 'rgba(10,132,255,0.24)', fg: '#4da3ff' },
  green: { bg: 'rgba(48,209,88,0.22)', fg: '#4cd964' },
  red: { bg: 'rgba(255,69,58,0.24)', fg: '#ff6961' },
  orange: { bg: 'rgba(255,159,10,0.24)', fg: '#ffb340' },
} as const;

function Btn({ Icon, label, sub, onClick, disabled, tone, armed, wide }: { Icon: LucideIcon; label: string; sub?: string; onClick: () => void; disabled?: boolean; tone: keyof typeof TINT; armed?: boolean; wide?: boolean }) {
  const t = TINT[tone];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`touch-target flex min-h-[56px] ${wide ? 'w-full flex-row justify-start gap-3 px-4' : 'flex-1 flex-col justify-center'} items-center rounded-[18px] text-[12px] font-semibold leading-tight transition-transform active:scale-95 disabled:opacity-35 ${armed ? 'animate-alarm-pulse' : ''}`}
      style={{ background: armed ? 'rgba(255,69,58,0.5)' : t.bg, color: t.fg }}
    >
      <Icon size={22} />
      <span className={wide ? 'text-left' : ''}>
        {label}
        {sub && <span className="block text-[11px] font-normal opacity-80">{sub}</span>}
      </span>
    </button>
  );
}

/** Four actions for the selected district. `embedded` drops the glass (used inside sheets). */
export default function ActionDock({ embedded = false, vertical = false, collapsible = false, defaultOpen = true }: { embedded?: boolean; vertical?: boolean; collapsible?: boolean; defaultOpen?: boolean }) {
  const g = useGame((s) => s.g);
  const act = useGame((s) => s.act);
  const vote = useGame((s) => s.vote);
  const [armed, setArmed] = useState(false);
  const [open, setOpen] = useState(defaultOpen);
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
  const coolSub = node.coolantActive ? 'Active' : node.coolantCooldown > 0 ? `${node.coolantCooldown}s` : `−${C.COOLANT_COST_MW} MW`;
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

  const buttons = (
    <div className={`flex gap-2 ${vertical ? 'flex-col' : ''}`}>
      <Btn wide={vertical} Icon={Route} label="Divert" sub="+60 MW" tone="blue" disabled={!own || !online} onClick={() => act('REROUTE')} />
      <Btn wide={vertical} Icon={Snowflake} label="Cool down" sub={coolSub} tone="green" disabled={!coolOk} onClick={() => act('COOLANT')} />
      <Btn
        wide={vertical}
        Icon={deduction ? Ban : Unplug}
        label={isoLabel}
        tone="red"
        armed={armed}
        disabled={!isoOk}
        onClick={() => {
          if (!deduction) return act('ISOLATE');
          if (!armed) return setArmed(true);
          setArmed(false);
          if (eng) vote(eng.id);
        }}
      />
      <Btn wide={vertical} Icon={ScanSearch} label="Inspect" sub={diagSub} tone="orange" disabled={!diagOk} onClick={() => act('DIAGNOSTIC')} />
    </div>
  );
  if (embedded) return buttons;
  return (
    <div className={`glass pointer-events-auto rounded-[26px] p-2 ${vertical ? 'w-[148px]' : 'mx-auto w-full max-w-[460px]'}`}>
      {collapsible && (
        <button onClick={() => setOpen(!open)} aria-expanded={open} aria-label={open ? 'Collapse actions' : 'Expand actions'} className="touch-target mx-auto flex h-7 w-full items-center justify-center gap-1 text-[12px] font-semibold text-white/70">
          {open ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          {open ? 'Hide actions' : `Actions · ${node.shortName}`}
        </button>
      )}
      {(!collapsible || open) && buttons}
    </div>
  );
}
