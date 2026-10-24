import { useEffect, useRef, useState } from 'react';
import { DISTRICT_ORDER } from '../engine/constants';
import { useGame } from '../store/useGame';
import type { DistrictId, NodeStatus } from '../types/game';
import { alertFromLog, type CityAlert } from './alertText';

const DOT: Record<NodeStatus, string> = {
  NOMINAL: 'bg-[#30d158]',
  CAUTION: 'bg-[#ff9f0a]',
  CRITICAL: 'bg-[#ff453a] animate-alarm-pulse',
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
              className={`glass pointer-events-auto relative flex min-h-8 items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold text-white before:absolute before:-inset-x-1 before:-inset-y-2 before:content-[''] ${selected === id ? '!bg-[#0a84ff]/70' : ''}`}
            >
              <span className={`h-2 w-2 rounded-full ${DOT[n.status]}`} />
              {n.name.split(' ')[0]}
              {n.ownerId === 'PLAYER' && useGame.getState().g.mode === 'SABOTEUR_DEDUCTION' ? <span className="text-white/70">· you</span> : null}
            </button>
          </div>
        );
      })}
    </>
  );
}

const TONE = {
  crit: 'bg-[#ff453a]/85',
  warn: 'bg-[#ff9f0a]/85 text-black',
  info: 'bg-[#30d158]/85 text-black',
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
              className={`pointer-events-auto animate-pop-in flex max-w-[210px] items-center gap-2 rounded-[18px] px-3 py-2 text-left text-[14px] font-semibold text-white shadow-xl backdrop-blur ${TONE[a.tone]}`}
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
