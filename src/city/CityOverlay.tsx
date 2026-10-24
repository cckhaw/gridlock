import { useEffect, useRef, useState } from 'react';
import { DISTRICT_ORDER } from '../engine/constants';
import { useGame } from '../store/useGame';
import type { DistrictId, NodeStatus } from '../types/game';
import { alertFromLog, type CityAlert } from './alertText';

const DOT: Record<NodeStatus, string> = {
  NOMINAL: 'bg-scada-mint',
  CAUTION: 'bg-scada-amber',
  CRITICAL: 'bg-scada-crimson animate-alarm-pulse',
  BLACKOUT: 'bg-scada-dim',
  ISOLATED: 'bg-scada-cobalt',
};

export function DistrictLabels() {
  const nodes = useGame((s) => s.g.nodes);
  const selected = useGame((s) => s.g.selectedNodeId);
  const selectNode = useGame((s) => s.selectNode);
  return (
    <>
      {DISTRICT_ORDER.map((id) => {
        const n = nodes[id];
        return (
          <div key={id} data-anchor={id} data-kind="label" className="absolute left-0 top-0 will-change-transform" style={{ visibility: 'hidden' }}>
            <button
              onClick={() => selectNode(id)}
              className={`pointer-events-auto flex min-h-8 items-center gap-1 rounded-full border px-2 py-1 text-[10px] sm:text-[11px] sm:gap-1.5 sm:px-2.5 font-semibold text-white shadow-lg backdrop-blur ${
                selected === id ? 'border-scada-cobalt bg-scada-cobalt/40' : 'border-white/15 bg-black/55'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${DOT[n.status]}`} />
              {n.name.split(' ')[0]}
              {n.ownerId === 'PLAYER' && useGame.getState().g.mode === 'SABOTEUR_DEDUCTION' ? <span className="text-scada-mint">· you</span> : null}
            </button>
          </div>
        );
      })}
    </>
  );
}

const TONE = {
  crit: 'border-scada-crimson bg-[#3a0a1c]/95 text-white shadow-glow-crimson',
  warn: 'border-scada-amber bg-[#3a2a05]/95 text-white shadow-glow-amber',
  info: 'border-scada-mint bg-[#04312c]/95 text-white shadow-glow-mint',
} as const;

export function CityAlerts() {
  const logs = useGame((s) => s.g.logs);
  const selectNode = useGame((s) => s.selectNode);
  const [alerts, setAlerts] = useState<CityAlert[]>([]);
  const lastSeen = useRef(useGame.getState().g.logCounter);

  useEffect(() => {
    const fresh = logs.filter((l) => Number(l.id.slice(1)) > lastSeen.current);
    if (!fresh.length) return;
    lastSeen.current = Number(fresh[fresh.length - 1].id.slice(1));
    const made: CityAlert[] = [];
    for (const l of fresh) {
      if (!l.nodeId) continue;
      const a = alertFromLog(l);
      if (a) made.push({ key: l.id, nodeId: l.nodeId, born: Date.now(), ...a });
    }
    if (made.length) setAlerts((cur) => [...cur, ...made].slice(-10));
  }, [logs]);

  useEffect(() => {
    const id = window.setInterval(() => setAlerts((cur) => (cur.some((a) => Date.now() - a.born > 5500) ? cur.filter((a) => Date.now() - a.born <= 5500) : cur)), 500);
    return () => window.clearInterval(id);
  }, []);

  const slots: Record<string, number> = {};
  return (
    <>
      {alerts.map((a) => {
        const slot = (slots[a.nodeId] = (slots[a.nodeId] ?? -1) + 1);
        return (
          <div key={a.key} data-anchor={a.nodeId} data-kind="alert" data-slot={slot} className="absolute left-0 top-0 will-change-transform" style={{ visibility: 'hidden' }}>
            <button
              onClick={() => selectNode(a.nodeId as DistrictId)}
              className={`pointer-events-auto animate-pop-in flex max-w-[190px] items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-left text-xs font-bold ${TONE[a.tone]}`}
            >
              <span className="text-base leading-none">{a.icon}</span>
              <span className="leading-tight">{a.text}</span>
            </button>
          </div>
        );
      })}
    </>
  );
}
