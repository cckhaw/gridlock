import { ChevronLeft, ChevronRight, Minus, Plus } from 'lucide-react';
import { DISTRICT_ORDER } from '../engine/constants';
import { canControl } from '../engine/sim';
import { useGame } from '../store/useGame';
import { Gauge, ICONS, STATUS_STYLE, integrityColor, tempColor } from './ui';

export default function FocusPanel() {
  const g = useGame((s) => s.g);
  const selectNode = useGame((s) => s.selectNode);
  const setSupply = useGame((s) => s.setSupply);
  const node = g.nodes[g.selectedNodeId];
  const st = STATUS_STYLE[node.status];
  const Icon = ICONS[node.icon];
  const own = canControl(g, node.id);
  const online = node.status !== 'BLACKOUT' && !node.isolated;
  const idx = DISTRICT_ORDER.indexOf(node.id);
  const step = (d: number) => selectNode(DISTRICT_ORDER[(idx + d + DISTRICT_ORDER.length) % DISTRICT_ORDER.length]);
  const hazards = g.hazards.filter((h) => h.targetNodeId === node.id);
  const owner = node.ownerId === 'PLAYER' ? 'YOU' : node.ownerId;
  const nudge = 'touch-target flex h-12 w-12 shrink-0 items-center justify-center rounded border border-scada-cobalt text-scada-cobalt disabled:opacity-35';
  const delta = Math.round(node.delta);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <button className={nudge} onClick={() => step(-1)} aria-label="Previous node"><ChevronLeft size={22} /></button>
        <div className={`scada-panel flex min-w-0 flex-1 items-center gap-2 border px-3 py-2 ${st.border}`}>
          <Icon size={26} className={st.text} />
          <div className="min-w-0">
            <div className="text-sm font-bold leading-tight">{node.name}</div>
            <div className={`text-[11px] font-bold ${st.text}`}>{st.label} <span className="text-scada-dim">· {owner}</span></div>
          </div>
        </div>
        <button className={nudge} onClick={() => step(1)} aria-label="Next node"><ChevronRight size={22} /></button>
      </div>

      <div className="scada-panel grid grid-cols-3 gap-2 p-3 text-center">
        <div><div className="text-[10px] text-scada-dim">DEMAND</div><div className="text-lg font-bold text-scada-amber">{Math.round(node.demand)}</div></div>
        <div><div className="text-[10px] text-scada-dim">SUPPLY</div><div className="text-lg font-bold text-scada-cobalt">{Math.round(node.supply)}</div></div>
        <div>
          <div className="text-[10px] text-scada-dim">DELTA</div>
          <div className={`text-lg font-bold ${delta > 0 ? 'text-scada-crimson' : 'text-scada-mint'}`}>{delta > 0 ? '+' : ''}{delta}</div>
        </div>
        <div className="col-span-3 text-[10px] text-scada-dim">MW · CAPACITY {node.capacity} · LOAD {Math.round((node.supply / node.capacity) * 100)}%
          {node.redistributedLoad > 0 && <span className="text-scada-amber"> · +{Math.round(node.redistributedLoad)} MW rerouted in</span>}
        </div>
      </div>

      <div className="scada-panel flex flex-col gap-3 p-3">
        <Gauge label="TEMPERATURE" value={node.temperature} max={120} markers={[80, 95]} color={tempColor(node.temperature)} display={`${node.temperature.toFixed(1)}°C`} />
        <Gauge label="INTEGRITY" value={node.integrity} max={100} color={integrityColor(node.integrity)} display={`${Math.round(node.integrity)}%`} />
        {node.coolantActive && <div className="text-[11px] text-scada-cobalt">❄ COOLANT FLUSH · {node.coolantRemaining}s</div>}
        {hazards.map((h) => (
          <div key={h.id} className="text-[11px] font-bold text-scada-amber">⚠ {h.type.replace('_', ' ')} · {h.remainingSec}s</div>
        ))}
      </div>

      <div className="scada-panel p-3">
        <div className="mb-1 flex justify-between text-[11px] text-scada-dim">
          <span>POWER ALLOCATION</span>
          <span>RESERVE <span className="text-scada-cobalt">{g.reserveMW} MW</span></span>
        </div>
        <div className="flex items-center gap-2">
          <button className={nudge} disabled={!own || !online} onClick={() => setSupply(node.supply - 10)} aria-label="Decrease 10 MW"><Minus size={20} /></button>
          <input
            type="range" className="mw-slider" min={0} max={node.capacity} step={5}
            value={Math.round(node.supply)} disabled={!own || !online}
            onChange={(e) => setSupply(Number(e.target.value))}
            aria-label="Megawatt allocation"
          />
          <button className={nudge} disabled={!own || !online} onClick={() => setSupply(node.supply + 10)} aria-label="Increase 10 MW"><Plus size={20} /></button>
        </div>
        {!own && <div className="mt-1 text-[11px] text-scada-dim">Controlled by {node.ownerId}. Use DIAGNOSE and the telemetry log to audit.</div>}
      </div>
    </div>
  );
}
