import { LayoutGrid, Newspaper, Sliders, UserSearch, type LucideIcon } from 'lucide-react';
import { useGame } from '../store/useGame';
import type { ActiveTab } from '../types/game';

const TABS: { id: ActiveTab; label: string; Icon: LucideIcon }[] = [
  { id: 'GRID', label: 'City', Icon: LayoutGrid },
  { id: 'FOCUS', label: 'District', Icon: Sliders },
  { id: 'LOGS', label: 'News', Icon: Newspaper },
  { id: 'DEDUCT', label: 'Suspects', Icon: UserSearch },
];

export const TAB_BAR_HEIGHT = 76;

/** Floating glass tab bar (control layer). `rail` = vertical, for landscape phones. */
export default function TabBar({ rail = false }: { rail?: boolean }) {
  const active = useGame((s) => s.g.activeTab);
  const badges = useGame((s) => s.g.badges);
  const mode = useGame((s) => s.g.mode);
  const setTab = useGame((s) => s.setTab);
  return (
    <nav
      className={`glass pointer-events-auto ${rail ? 'flex w-[76px] flex-col gap-1 rounded-[30px] p-1.5' : 'mx-auto flex w-full max-w-[460px] gap-1 rounded-full p-1.5'}`}
      aria-label="Main"
    >
      {TABS.filter((t) => !(t.id === 'DEDUCT' && mode !== 'SABOTEUR_DEDUCTION' && false)).map(({ id, label, Icon }) => {
        const on = active === id;
        const badge = badges[id];
        return (
          <button
            key={id}
            onClick={() => setTab(id)}
            aria-current={on ? 'page' : undefined}
            className={`touch-target relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-full py-1.5 text-[11px] font-semibold transition-colors ${rail ? 'min-h-[56px]' : 'min-h-[56px]'} ${
              on ? 'bg-white/18 text-[#0a84ff]' : 'text-white/70'
            }`}
          >
            <Icon size={22} strokeWidth={on ? 2.4 : 1.8} />
            {id === 'DEDUCT' && mode !== 'SABOTEUR_DEDUCTION' ? 'Storm' : label}
            {badge > 0 && !on && (
              <span className="absolute right-[22%] top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#ff453a] px-1 text-[11px] font-bold text-white">{badge > 9 ? '9+' : badge}</span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
