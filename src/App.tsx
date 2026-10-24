import { PanelRightClose, PanelRightOpen } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import CityScene from './city/CityScene';
import DeductPanel from './components/DeductPanel';
import DistrictStrip from './components/DistrictStrip';
import FocusPanel from './components/FocusPanel';
import LogTerminal from './components/LogTerminal';
import { EndScreen, MenuScreen } from './components/Screens';
import Tutorial from './components/Tutorial';
import { useGameLoop } from './hooks/useGameLoop';
import { useMediaQuery } from './hooks/useMediaQuery';
import { useGame } from './store/useGame';
import ActionDock from './ui/ActionDock';
import { EyeButton, Joystick, Minimap, ObjectiveCard, PracticeCard } from './ui/Hud';
import Sheet from './ui/Sheet';
import StatusCapsule from './ui/StatusCapsule';
import TabBar, { TAB_BAR_HEIGHT } from './ui/TabBar';

function KeyHints() {
  return (
    <div className="glass pointer-events-auto hidden rounded-[18px] px-3 py-2 text-[13px] leading-5 text-white/80 mouse:block">
      <b className="text-white">WASD</b> drive (screen-relative) · <b className="text-white">Arrows</b> / drag pan · <b className="text-white">E</b> horn<br />
      <b className="text-white">V</b> follow cam · <b className="text-white">N</b> day / night · <b className="text-white">?</b> help
    </div>
  );
}

function SheetBody({ tab }: { tab: 'FOCUS' | 'LOGS' | 'DEDUCT' }) {
  if (tab === 'FOCUS') {
    return (
      <FocusPanel>
        <ActionDock embedded />
      </FocusPanel>
    );
  }
  return tab === 'LOGS' ? <LogTerminal /> : <DeductPanel />;
}

function sheetTitle(tab: string, mode: string) {
  return tab === 'FOCUS' ? 'District' : tab === 'LOGS' ? 'City news' : mode === 'SABOTEUR_DEDUCTION' ? 'Suspects' : 'Storm watch';
}

function MobileHud() {
  const tab = useGame((s) => s.g.activeTab);
  const mode = useGame((s) => s.g.mode);
  const hidden = useGame((s) => s.uiHidden);
  const detent = useGame((s) => s.sheet);
  const setSheet = useGame((s) => s.setSheet);
  const setTab = useGame((s) => s.setTab);
  const coarse = useMemo(() => window.matchMedia('(pointer: coarse)').matches, []);
  const sheetOpen = tab !== 'GRID' && !hidden;
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col">
      <div className="flex items-start justify-between gap-2 px-3 pt-[max(12px,env(safe-area-inset-top))]">
        <div className="flex min-w-0 flex-col items-start gap-2">
          <StatusCapsule />
          {!hidden && <ObjectiveCard />}
          {!hidden && !sheetOpen && <PracticeCard />}
        </div>
        <EyeButton />
      </div>
      <div className="flex-1" />
      <div className="flex flex-col gap-2 px-3 pb-[max(10px,env(safe-area-inset-bottom))]">
        {!sheetOpen && (
          <div className="flex items-end justify-between gap-3">
            {coarse ? <Joystick /> : <KeyHints />}
            {!hidden && <Minimap />}
          </div>
        )}
        {!sheetOpen && !hidden && <ActionDock collapsible />}
        {!hidden && <TabBar />}
      </div>
      {sheetOpen && (
        <Sheet title={sheetTitle(tab, mode)} detent={detent} onDetent={setSheet} onClose={() => setTab('GRID')} bottom={TAB_BAR_HEIGHT + 10}>
          <SheetBody tab={tab as 'FOCUS' | 'LOGS' | 'DEDUCT'} />
        </Sheet>
      )}
    </div>
  );
}

function CompactHud() {
  const tab = useGame((s) => s.g.activeTab);
  const mode = useGame((s) => s.g.mode);
  const hidden = useGame((s) => s.uiHidden);
  const setTab = useGame((s) => s.setTab);
  const sheetOpen = tab !== 'GRID' && !hidden;
  return (
    <div className="pointer-events-none absolute inset-0">
      {!hidden && (
        <div className="absolute left-[max(8px,env(safe-area-inset-left))] top-1/2 -translate-y-1/2"><TabBar rail /></div>
      )}
      <div className={`absolute top-[max(8px,env(safe-area-inset-top))] flex flex-col items-start gap-2 ${hidden ? 'left-[max(8px,env(safe-area-inset-left))]' : 'left-[calc(max(8px,env(safe-area-inset-left))+88px)]'}`}>
        <StatusCapsule />
        {!hidden && !sheetOpen && <ObjectiveCard />}
      </div>
      <div className="absolute bottom-2 left-[calc(max(8px,env(safe-area-inset-left))+88px)]"><Joystick /></div>
      {!sheetOpen && (
        <div className="absolute right-[max(8px,env(safe-area-inset-right))] top-[max(8px,env(safe-area-inset-top))]"><EyeButton /></div>
      )}
      {!hidden && !sheetOpen && (
        <div className="absolute bottom-2 right-[max(8px,env(safe-area-inset-right))] flex flex-col items-end gap-2">
          <ActionDock vertical collapsible defaultOpen={false} />
        </div>
      )}
      {sheetOpen && (
        <Sheet side title={sheetTitle(tab, mode)} detent="MEDIUM" onDetent={() => {}} onClose={() => setTab('GRID')} bottom={0}>
          <SheetBody tab={tab as 'FOCUS' | 'LOGS' | 'DEDUCT'} />
        </Sheet>
      )}
    </div>
  );
}

function DesktopHud() {
  const hidden = useGame((s) => s.uiHidden);
  const mode = useGame((s) => s.g.mode);
  const [inspector, setInspector] = useState(true);
  const [feed, setFeed] = useState<'NEWS' | 'SUSPECTS' | null>(null);
  const coarse = useMemo(() => window.matchMedia('(pointer: coarse)').matches, []);
  const chip = (id: 'NEWS' | 'SUSPECTS', label: string) => (
    <button
      key={id}
      onClick={() => setFeed(feed === id ? null : id)}
      aria-pressed={feed === id}
      className={`touch-target min-h-11 rounded-full px-5 text-[14px] font-semibold ${feed === id ? 'bg-white/90 text-black' : 'text-white/80'}`}
    >
      {label}
    </button>
  );
  const panelRight = !hidden && inspector;
  return (
    <div className="pointer-events-none absolute inset-0 p-3">
      <div className="absolute left-3 top-3 flex w-[min(380px,34vw)] flex-col items-start gap-2">
        <StatusCapsule />
        {!hidden && <ObjectiveCard />}
        {!hidden && <PracticeCard />}
      </div>
      {!hidden && <div className="absolute left-1/2 top-3 -translate-x-1/2" style={{ maxWidth: 'calc(100% - 880px)' }}><DistrictStrip /></div>}
      <div className={`absolute top-3 ${panelRight ? 'right-[404px]' : 'right-3'}`}><div className="flex gap-2"><EyeButton />
        {!hidden && !inspector && (
          <button onClick={() => setInspector(true)} aria-label="Show district panel" className="glass pointer-events-auto touch-target flex h-12 w-12 items-center justify-center rounded-full"><PanelRightOpen size={20} /></button>
        )}
      </div></div>
      {panelRight && (
        <section className="glass-strong pointer-events-auto absolute bottom-3 right-3 top-3 flex w-[380px] flex-col overflow-hidden rounded-[28px]">
          <header className="flex items-center justify-between px-5 pb-1 pt-4">
            <h2 className="text-[20px] font-bold tracking-tight">District</h2>
            <button onClick={() => setInspector(false)} aria-label="Hide district panel" className="touch-target flex h-11 w-11 items-center justify-center rounded-full bg-white/10"><PanelRightClose size={18} /></button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
            <FocusPanel><ActionDock embedded /></FocusPanel>
          </div>
        </section>
      )}
      <div className="absolute bottom-3 left-3 flex items-end gap-3">
        {coarse ? <Joystick /> : <KeyHints />}
        {!hidden && <Minimap />}
      </div>
      {!hidden && (
        <div className={`absolute bottom-3 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 ${panelRight ? '-ml-[190px]' : ''}`}>
          {feed && (
            <div className="glass-strong pointer-events-auto h-[34vh] min-h-[180px] w-[min(520px,46vw)] overflow-hidden rounded-[24px] p-3">
              <div className="h-full">{feed === 'NEWS' ? <LogTerminal /> : <div className="h-full overflow-y-auto"><DeductPanel /></div>}</div>
            </div>
          )}
          <div className="glass pointer-events-auto flex gap-1 rounded-full p-1.5">
            {chip('NEWS', 'City news')}
            {chip('SUSPECTS', mode === 'SABOTEUR_DEDUCTION' ? 'Suspects' : 'Storm watch')}
          </div>
        </div>
      )}
    </div>
  );
}

function PauseSheet() {
  const { togglePause, openTutorial, toMenu } = useGame.getState();
  return (
    <div className="fixed inset-0 z-[57] flex items-end justify-center bg-black/45 p-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur-sm sm:items-center" role="dialog" aria-label="Paused">
      <div className="glass-strong flex w-full max-w-sm flex-col gap-2 rounded-[28px] p-4">
        <div className="pb-1 text-center text-[20px] font-bold">Paused</div>
        <button className="btn-filled touch-target" onClick={togglePause}>Resume</button>
        <button className="btn-tinted touch-target" onClick={() => { togglePause(); openTutorial(); }}>How to play</button>
        <button className="btn-tinted touch-target !text-[#ff453a] !bg-[rgba(255,69,58,0.16)]" onClick={toMenu}>Quit to menu</button>
      </div>
    </div>
  );
}

export default function App() {
  useGameLoop();
  const phase = useGame((s) => s.g.phase);
  const tutorialOpen = useGame((s) => s.tutorialOpen);
  const desktop = useMediaQuery('(min-width: 900px) and (min-height: 600px) and (orientation: landscape)');
  const compact = useMediaQuery('(orientation: landscape) and (max-height: 599px)');

  let body: ReactNode;
  if (phase === 'MENU') {
    body = <MenuScreen />;
  } else {
    body = (
      <>
        <div className="absolute inset-0"><CityScene bleed /></div>
        {desktop ? <DesktopHud /> : compact ? <CompactHud /> : <MobileHud />}
      </>
    );
  }

  return (
    <div className="fixed inset-0 overflow-hidden bg-black font-sans text-white">
      {body}
      {tutorialOpen && phase !== 'MENU' && <Tutorial />}
      {(phase === 'VICTORY' || phase === 'DEFEAT') && <EndScreen />}
      {phase === 'PAUSED' && <PauseSheet />}
    </div>
  );
}
