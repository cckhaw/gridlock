import { GRID_EDGES } from '../engine/constants';
import { useGame } from '../store/useGame';
import type { DistrictId, DistrictNode, NodeStatus } from '../types/game';
import { STATUS_STYLE } from './ui';

const W = 100;
const H = 64;
const sev: Record<NodeStatus, number> = { NOMINAL: 0, ISOLATED: 1, CAUTION: 2, CRITICAL: 3, BLACKOUT: 4 };

const px = (n: DistrictNode) => ({ x: 6 + n.position.x * (W - 12), y: 6 + n.position.y * (H - 12) });

export default function GridMap() {
  const nodes = useGame((s) => s.g.nodes);
  const selected = useGame((s) => s.g.selectedNodeId);
  const selectNode = useGame((s) => s.selectNode);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto max-h-[34vh] w-full rounded border border-scada-border bg-scada-bg lg:max-h-[40vh] landscape-short:max-h-[72vh]" role="img" aria-label="Grid map">
      <defs>
        <pattern id="gridbg" width="6" height="6" patternUnits="userSpaceOnUse">
          <path d="M6 0H0V6" fill="none" stroke="#1E293B" strokeWidth="0.15" />
        </pattern>
      </defs>
      <rect width={W} height={H} fill="url(#gridbg)" />
      {GRID_EDGES.map(([ai, bi]) => {
        let a = nodes[ai];
        let b = nodes[bi];
        const dead = a.status === 'BLACKOUT' || b.status === 'BLACKOUT' || a.isolated || b.isolated;
        // Power flows from the node with more surplus toward the one with less.
        if (a.supply - a.demand < b.supply - b.demand) [a, b] = [b, a];
        const worst = sev[a.status] >= sev[b.status] ? a.status : b.status;
        const color = dead ? '#334155' : STATUS_STYLE[worst].hex;
        const pa = px(a);
        const pb = px(b);
        return (
          <g key={`${ai}-${bi}`}>
            <line x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} stroke={color} strokeOpacity={0.25} strokeWidth={1.2} />
            <line
              x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y}
              stroke={color} strokeWidth={0.6}
              className={`flow-line ${dead ? '' : 'animate-flow-forward'}`}
              style={dead ? { strokeDasharray: '1 3' } : { filter: `drop-shadow(0 0 1px ${color})` }}
            />
          </g>
        );
      })}
      {Object.values(nodes).map((n) => {
        const p = px(n);
        const st = STATUS_STYLE[n.status];
        const sel = n.id === selected;
        return (
          <g key={n.id} onClick={() => selectNode(n.id as DistrictId)} className="cursor-pointer">
            {sel && <circle cx={p.x} cy={p.y} r={7.6} fill="none" stroke="#0A84FF" strokeWidth={0.5} strokeDasharray="1.5 1.5" />}
            <circle
              cx={p.x} cy={p.y} r={5.4}
              fill="#131B2E" stroke={st.hex} strokeWidth={0.9}
              className={n.status === 'CRITICAL' ? 'animate-alarm-pulse' : ''}
              style={{ filter: n.status === 'BLACKOUT' ? 'none' : `drop-shadow(0 0 1.5px ${st.hex})` }}
            />
            <text x={p.x} y={p.y - 0.4} textAnchor="middle" fontSize={2.6} fill={st.hex} fontWeight={700}>{n.shortName}</text>
            <text x={p.x} y={p.y + 2.6} textAnchor="middle" fontSize={2} fill="#94A3B8">
              {n.status === 'BLACKOUT' ? 'DOWN' : n.isolated ? 'ISO' : `${Math.round(n.temperature)}°`}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
