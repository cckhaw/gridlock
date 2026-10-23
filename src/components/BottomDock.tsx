import { LayoutGrid, ScrollText, SlidersHorizontal, UserSearch, type LucideIcon } from 'lucide-react';
import { useGame } from '../store/useGame';
import type { ActiveTab } from '../types/game';

const TABS: { id: ActiveTab; label: string; Icon: LucideIcon }[] = [
  { id: 'GRID', label: 'CITY', Icon: LayoutGrid },
  { id: 'FOCUS', label: 'DISTRICT', Icon: SlidersHorizontal },
  { id: 'LOGS', label: 'NEWS', Icon: ScrollText },
  { id: 'DEDUCT', label: 'SUSPECTS', Icon: UserSearch },
];

export default function BottomDock({ side = false }: { side?: boolean }) {
  const active = useGame((s) => s.g.activeTab);
  const badges = useGame((s) => s.g.badges);
  const setTab = useGame((s) => s.setTab);
  return (
    <nav
      className={
        side
          ? 'flex w-16 shrink-0 flex-col border-r border-scada-border bg-scada-panel'
          : 'pb-safe fixed inset-x-0 bottom-0 z-40 flex border-t border-scada-border bg-scada-panel'
      }
    >
      {TABS.map(({ id, label, Icon }) => {
        const on = active === id;
        const badge = badges[id];
        return (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`touch-target relative flex ${side ? 'w-full' : 'h-16'} flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-bold ${
              on ? 'text-scada-cobalt text-glow-cobalt' : 'text-scada-dim'
            }`}
          >
            {on && <span className={`absolute bg-scada-cobalt shadow-glow-cobalt ${side ? 'inset-y-3 left-0 w-0.5' : 'inset-x-4 top-0 h-0.5'}`} />}
            <Icon size={22} />
            {label}
            {badge > 0 && id !== active && (
              <span className="absolute right-[18%] top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-scada-crimson px-1 text-[10px] text-white shadow-glow-crimson">
                {badge > 9 ? '9+' : badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
