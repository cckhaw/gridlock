import { ChevronRight, Snowflake } from 'lucide-react';
import { useGame } from '../store/useGame';
import type { DistrictNode } from '../types/game';
import { Gauge, ICONS, STATUS_STYLE, integrityColor, tempColor } from './ui';

export default function NodeCard({ node, onFocus }: { node: DistrictNode; onFocus?: () => void }) {
  const selected = useGame((s) => s.g.selectedNodeId === node.id);
  const selectNode = useGame((s) => s.selectNode);
  const owner = useGame((s) => s.g.mode === 'SABOTEUR_DEDUCTION' ? s.g.nodes[node.id].ownerId : null);
  const st = STATUS_STYLE[node.status];
  const Icon = ICONS[node.icon];
  const down = node.status === 'BLACKOUT';
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => selectNode(node.id)}
      onKeyDown={(e) => e.key === 'Enter' && selectNode(node.id)}
      className={`touch-target scada-panel relative flex min-h-[132px] flex-col gap-1.5 border p-2.5 ${st.border} ${st.glow} ${
        selected ? 'ring-2 ring-scada-cobalt' : ''
      } ${down ? 'opacity-60' : ''}`}
    >
      <div className="flex items-center gap-2">
        <Icon size={18} className={st.text} />
        <div className="min-w-0 flex-1 truncate text-xs font-bold">{node.name}</div>
        {node.coolantActive && <Snowflake size={14} className="text-scada-cobalt" />}
        {onFocus && (
          <button
            aria-label={`Focus ${node.name}`}
            className="touch-target -m-2 flex h-12 w-12 items-center justify-center text-scada-cobalt"
            onClick={(e) => { e.stopPropagation(); onFocus(); }}
          >
            <ChevronRight size={20} />
          </button>
        )}
      </div>
      <div className={`text-[10px] font-bold ${st.text}`}>
        {st.label}{owner ? <span className="ml-1 text-scada-dim">· {owner === 'PLAYER' ? 'YOU' : owner}</span> : null}
      </div>
      <Gauge
        label="SUP/DEM" color={node.delta > 0.5 ? '#FFB703' : '#00F5D4'}
        value={node.supply} max={Math.max(node.capacity, 1)}
        display={`${Math.round(node.supply)}/${Math.round(node.demand)} MW`}
      />
      <Gauge label="TEMP" value={node.temperature} max={120} markers={[80, 95]} color={tempColor(node.temperature)} display={`${Math.round(node.temperature)}°C`} />
      <Gauge label="INTEG" value={node.integrity} max={100} color={integrityColor(node.integrity)} display={`${Math.round(node.integrity)}%`} />
    </div>
  );
}
