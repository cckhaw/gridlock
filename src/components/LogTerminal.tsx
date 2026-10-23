import { useEffect, useRef } from 'react';
import { useGame } from '../store/useGame';

const SEV = { INFO: 'text-scada-mint', WARN: 'text-scada-amber', CRIT: 'text-scada-crimson' } as const;

export default function LogTerminal() {
  const logs = useGame((s) => s.g.logs);
  const ref = useRef<HTMLDivElement>(null);
  const stick = useRef(true);

  useEffect(() => {
    const el = ref.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [logs]);

  return (
    <div
      ref={ref}
      onScroll={(e) => {
        const el = e.currentTarget;
        stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
      }}
      className="h-full min-h-48 overflow-y-auto rounded border border-scada-border bg-black/60 p-2 text-[12px] leading-5"
      role="log"
    >
      {logs.map((l) => (
        <div key={l.id} className={`${SEV[l.severity]} ${l.severity === 'CRIT' ? 'text-glow-crimson' : ''}`}>
          <span className="text-scada-dim">[{l.timestamp}]</span> <span className="font-bold">{l.source}</span> {l.message}
        </div>
      ))}
      <span className="animate-caret text-scada-mint">█</span>
    </div>
  );
}
