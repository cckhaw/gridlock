import { useGame } from '../store/useGame';
import { ICONS, STATUS_STYLE } from './ui';

/** Desktop district switcher: a floating row of glass chips. */
export default function DistrictStrip() {
  const nodes = useGame((s) => s.g.nodes);
  const selected = useGame((s) => s.g.selectedNodeId);
  const selectNode = useGame((s) => s.selectNode);
  return (
    <div className="glass pointer-events-auto scrollbar-none flex w-fit max-w-full gap-1 overflow-x-auto rounded-full p-1.5">
      {Object.values(nodes).map((d) => {
        const I = ICONS[d.icon];
        const s = STATUS_STYLE[d.status];
        return (
          <button
            key={d.id}
            onClick={() => selectNode(d.id)}
            aria-pressed={selected === d.id}
            className={`touch-target flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold ${selected === d.id ? 'bg-white/20 text-white' : 'text-white/75'}`}
          >
            <I size={16} style={{ color: s.hex }} />
            {d.shortName}
            <span className="h-2 w-2 rounded-full" style={{ background: s.hex }} />
          </button>
        );
      })}
    </div>
  );
}
