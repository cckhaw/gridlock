import { ChevronLeft, ChevronRight, Minus, Plus } from 'lucide-react';
import { DISTRICT_ORDER } from '../engine/constants';
import { canControl } from '../engine/sim';
import { useGame } from '../store/useGame';
import { Gauge, ICONS, STATUS_STYLE, integrityColor, tempColor } from './ui';

const MOOD: Record<string, string> = { NOMINAL: 'All good', CAUTION: 'Running hot', CRITICAL: 'In trouble', BLACKOUT: 'Lights are out', ISOLATED: 'Cut off from the grid' };

function Switch({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) {
  return <button role="switch" aria-checked={on} aria-label={label} onClick={onChange} className="ios-switch touch-target" />;
}

/** Selected-district inspector, laid out as inset grouped lists. */
export default function FocusPanel({ children }: { children?: React.ReactNode }) {
  const g = useGame((s) => s.g);
  const selectNode = useGame((s) => s.selectNode);
  const setSupply = useGame((s) => s.setSupply);
  const patchAssist = useGame((s) => s.patchAssist);
  const node = g.nodes[g.selectedNodeId];
  const st = STATUS_STYLE[node.status];
  const Icon = ICONS[node.icon];
  const own = canControl(g, node.id);
  const online = node.status !== 'BLACKOUT' && !node.isolated;
  const idx = DISTRICT_ORDER.indexOf(node.id);
  const step = (d: number) => selectNode(DISTRICT_ORDER[(idx + d + DISTRICT_ORDER.length) % DISTRICT_ORDER.length]);
  const hazards = g.hazards.filter((h) => h.targetNodeId === node.id);
  const delta = Math.round(node.delta);
  const round = 'touch-target flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/12 text-white disabled:opacity-35';

  return (
    <div className="flex flex-col gap-3 pb-1">
      <div className="flex items-center gap-3">
        <button className={round} onClick={() => step(-1)} aria-label="Previous district"><ChevronLeft size={20} /></button>
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px]" style={{ background: `${st.hex}33` }}>
            <Icon size={24} style={{ color: st.hex }} />
          </span>
          <div className="min-w-0">
            <div className="text-[20px] font-bold leading-tight tracking-tight">{node.name}</div>
            <div className="text-[13px] font-medium" style={{ color: st.hex }}>● {MOOD[node.status]} <span className="text-white/50">· {node.ownerId === 'PLAYER' ? 'You' : node.ownerId}</span></div>
          </div>
        </div>
        <button className={round} onClick={() => step(1)} aria-label="Next district"><ChevronRight size={20} /></button>
      </div>

      {children}

      <div>
        <div className="caption-label mb-1.5 px-1">Power</div>
        <div className="group-list">
          <div className="group-row"><span className="text-[15px]">Needs</span><span className="text-[17px] font-semibold tabular-nums text-[#ff9f0a]">{Math.round(node.demand)} MW</span></div>
          <div className="group-row"><span className="text-[15px]">Gets</span><span className="text-[17px] font-semibold tabular-nums text-[#0a84ff]">{Math.round(node.supply)} MW</span></div>
          <div className="group-row"><span className="text-[15px]">Gap</span><span className={`text-[17px] font-semibold tabular-nums ${delta > 0 ? 'text-[#ff453a]' : 'text-[#30d158]'}`}>{delta > 0 ? '+' : ''}{delta} MW</span></div>
        </div>
        {node.redistributedLoad > 0 && <div className="mt-1.5 px-1 text-[13px] text-[#ff9f0a]">+{Math.round(node.redistributedLoad)} MW rerouted in from a neighbour</div>}
      </div>

      <div>
        <div className="caption-label mb-1.5 px-1">Health</div>
        <div className="group-list">
          <div className="group-row flex-col !items-stretch !gap-1.5">
            <Gauge label="Temperature" value={node.temperature} max={120} markers={[80, 95]} color={tempColor(node.temperature)} display={`${node.temperature.toFixed(1)}°C`} />
          </div>
          <div className="group-row flex-col !items-stretch !gap-1.5">
            <Gauge label="Condition" value={node.integrity} max={100} color={integrityColor(node.integrity)} display={`${Math.round(node.integrity)}%`} />
          </div>
          {node.coolantActive && <div className="group-row text-[15px] text-[#4cd964]"><span>Cooling down</span><span className="tabular-nums">{node.coolantRemaining}s</span></div>}
          {hazards.map((h) => (
            <div key={h.id} className="group-row text-[15px] text-[#ffb340]"><span>⚠ {h.type.replace('_', ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}</span><span className="tabular-nums">{h.remainingSec}s</span></div>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-1.5 flex items-baseline justify-between px-1">
          <span className="caption-label">Power sent here</span>
          <span className="text-[13px] text-white/60">Spare <b className="tabular-nums text-[#0a84ff]">{g.reserveMW} MW</b></span>
        </div>
        <div className="group-list px-2 py-1">
          <div className="flex items-center gap-1">
            <button className={round} disabled={!own || !online} onClick={() => setSupply(node.supply - 10)} aria-label="Decrease 10 MW"><Minus size={18} /></button>
            <input type="range" className="mw-slider" min={0} max={node.capacity} step={5} value={Math.round(node.supply)} disabled={!own || !online} onChange={(e) => setSupply(Number(e.target.value))} aria-label="Megawatt allocation" />
            <button className={round} disabled={!own || !online} onClick={() => setSupply(node.supply + 10)} aria-label="Increase 10 MW"><Plus size={18} /></button>
          </div>
        </div>
        {!own && <div className="mt-1.5 px-1 text-[13px] text-white/60">{node.ownerId} runs this district. Use Inspect and the News feed to check on them.</div>}
      </div>

      {g.assistAllowed && (
        <div>
          <div className="caption-label mb-1.5 px-1">Autopilot</div>
          <div className="group-list">
            <div className="group-row"><span className="text-[15px]">Balance power</span><Switch on={g.assist.autoBalance} label="Balance power automatically" onChange={() => patchAssist({ autoBalance: !g.assist.autoBalance })} /></div>
            <div className="group-row"><span className="text-[15px]">Cool hot districts</span><Switch on={g.assist.autoCool} label="Cool hot districts automatically" onChange={() => patchAssist({ autoCool: !g.assist.autoCool })} /></div>
          </div>
          <div className="mt-1.5 px-1 text-[13px] leading-snug text-white/60">Turn these off to practise the slider and Cool down yourself.</div>
        </div>
      )}
    </div>
  );
}
