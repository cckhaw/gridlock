import { ChevronRight } from 'lucide-react';
import { useGame } from '../store/useGame';
import { Gauge, ICONS, STATUS_STYLE } from './ui';

/** Friendly selected-district summary plus a scrollable row of district chips. */
export default function DistrictStrip({ onOpen, chipsOnly = false }: { onOpen?: () => void; chipsOnly?: boolean }) {
  const nodes = useGame((s) => s.g.nodes);
  const selected = useGame((s) => s.g.selectedNodeId);
  const selectNode = useGame((s) => s.selectNode);
  const n = nodes[selected];
  const st = STATUS_STYLE[n.status];
  const Icon = ICONS[n.icon];
  const need = Math.round(n.demand);
  const have = Math.round(n.supply);
  const mood =
    n.status === 'BLACKOUT' ? 'Lights are out' : n.status === 'ISOLATED' ? 'Cut off from the grid' : n.status === 'CRITICAL' ? 'In trouble!' : n.status === 'CAUTION' ? 'Running hot' : 'All good';

  return (
    <div className="flex flex-col gap-2">
      {!chipsOnly && <div className={`flex items-center gap-3 rounded-2xl border bg-scada-panel/80 p-3 backdrop-blur ${st.border}`}>
        <Icon size={28} className={st.text} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold">{n.name}</div>
          <div className={`text-xs font-semibold ${st.text}`}>{mood}</div>
          <div className="mt-1.5">
            <Gauge value={have} max={Math.max(need, have, 1) * 1.15} color={have >= need ? '#00F5D4' : '#FFB703'} display={`${have} / ${need} MW`} label="Power" />
          </div>
        </div>
        {onOpen && (
          <button onClick={onOpen} className="touch-target flex h-12 items-center gap-1 rounded-xl border border-scada-cobalt px-3 text-xs font-bold text-scada-cobalt">
            Manage <ChevronRight size={16} />
          </button>
        )}
      </div>}
      <div className="scrollbar-none flex gap-2 overflow-x-auto pb-1">
        {Object.values(nodes).map((d) => {
          const s = STATUS_STYLE[d.status];
          const I = ICONS[d.icon];
          return (
            <button
              key={d.id}
              onClick={() => selectNode(d.id)}
              className={`touch-target flex h-12 shrink-0 items-center gap-1.5 rounded-xl border bg-black/55 px-3 text-xs font-semibold backdrop-blur ${s.border} ${selected === d.id ? 'ring-2 ring-scada-cobalt' : ''}`}
            >
              <I size={16} className={s.text} />
              {d.shortName}
              <span className={`h-2 w-2 rounded-full ${s.bg}`} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
