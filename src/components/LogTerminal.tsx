import { useEffect, useRef } from 'react';
import { useGame } from '../store/useGame';

const DOT = { INFO: '#30d158', WARN: '#ff9f0a', CRIT: '#ff453a' } as const;

/** City news: a plain chronological feed. */
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
      className="h-full min-h-40 overflow-y-auto overscroll-contain"
      role="log"
      aria-label="City news"
    >
      <div className="group-list">
        {logs.length === 0 && <div className="group-row text-[15px] text-white/60">Nothing yet.</div>}
        {logs.map((l) => (
          <div key={l.id} className="group-row !items-start !gap-2.5 !py-2">
            <span className="mt-[7px] h-2 w-2 shrink-0 rounded-full" style={{ background: DOT[l.severity] }} />
            <span className="min-w-0 flex-1 text-[14px] leading-snug">
              <span className="font-semibold">{l.source}</span> <span className={l.severity === 'CRIT' ? 'text-[#ff6961]' : 'text-white/85'}>{l.message}</span>
            </span>
            <span className="shrink-0 pt-px text-[12px] tabular-nums text-white/45">{l.timestamp}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
