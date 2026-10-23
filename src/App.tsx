import ActionBar from './components/ActionBar';
import BottomDock from './components/BottomDock';
import DeductPanel from './components/DeductPanel';
import FocusPanel from './components/FocusPanel';
import CityScene from './city/CityScene';
import DistrictStrip from './components/DistrictStrip';
import LogTerminal from './components/LogTerminal';
import { EndScreen, MenuScreen } from './components/Screens';
import TopBar from './components/TopBar';
import Tutorial from './components/Tutorial';
import { useGameLoop } from './hooks/useGameLoop';
import { useMediaQuery } from './hooks/useMediaQuery';
import { useGame } from './store/useGame';
import { useState, type ReactNode } from 'react';

function DesktopFeed() {
  const [tab, setTab] = useState<'NEWS' | 'SUSPECTS' | null>(null);
  const mode = useGame((s) => s.g.mode);
  const chip = (id: 'NEWS' | 'SUSPECTS', label: string) => (
    <button
      onClick={() => setTab(tab === id ? null : id)}
      className={`touch-target h-9 rounded-full border px-4 text-xs font-bold ${tab === id ? 'border-scada-cobalt bg-scada-cobalt/25 text-white' : 'border-white/15 bg-black/50 text-scada-dim'}`}
    >
      {label}
    </button>
  );
  return (
    <div className="absolute inset-x-3 bottom-3 flex flex-col gap-2">
      <div className="flex gap-2">
        {chip('NEWS', 'City news')}
        {chip('SUSPECTS', mode === 'SABOTEUR_DEDUCTION' ? 'Suspects' : 'Storm')}
      </div>
      {tab && (
        <div className="scada-panel h-[30vh] min-h-[150px] overflow-y-auto p-2">
          {tab === 'NEWS' ? <LogTerminal /> : <DeductPanel />}
        </div>
      )}
    </div>
  );
}

function GridView({ mobile }: { mobile: boolean }) {
  const setTab = useGame((s) => s.setTab);
  return (
    <div className="flex h-full flex-col gap-3">
      <div className={mobile ? 'h-[52vh] min-h-[300px] landscape-short:h-[78vh]' : 'min-h-[300px] flex-1'}>
        <CityScene />
      </div>
      <DistrictStrip onOpen={mobile ? () => setTab('FOCUS') : undefined} />
    </div>
  );
}

export default function App() {
  useGameLoop();
  const phase = useGame((s) => s.g.phase);
  const tab = useGame((s) => s.g.activeTab);
  const crt = useGame((s) => s.g.settings.crtScanlines);
  const tutorialOpen = useGame((s) => s.tutorialOpen);
  const desktop = useMediaQuery('(min-width: 900px) and (min-height: 600px) and (orientation: landscape)');
  const compact = useMediaQuery('(orientation: landscape) and (max-height: 599px)');

  let body: ReactNode;
  if (phase === 'MENU') {
    body = <MenuScreen />;
  } else if (desktop) {
    body = (
      <div className="flex h-full flex-col">
        <TopBar />
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(340px,400px)] gap-3 p-3">
          <section className="relative min-h-0 overflow-hidden rounded-2xl">
            <div className="absolute inset-0"><CityScene /></div>
            <div className="absolute inset-x-3 top-3"><DistrictStrip chipsOnly /></div>
            <DesktopFeed />
          </section>
          <section className="scada-panel flex min-h-0 flex-col">
            <h2 className="border-b border-white/10 px-4 py-2 text-xs font-bold tracking-widest text-scada-dim">DISTRICT</h2>
            <div className="min-h-0 flex-1 overflow-y-auto p-3"><FocusPanel /></div>
            <ActionBar />
          </section>
        </div>
      </div>
    );
  } else if (compact) {
    body = (
      <div className="flex h-full flex-col">
        <TopBar />
        <div className="flex min-h-0 flex-1">
          <BottomDock side />
          <main className="min-h-0 flex-1 overflow-y-auto p-2">
            {tab === 'GRID' && <GridView mobile />}
            {tab === 'FOCUS' && <FocusPanel />}
            {tab === 'LOGS' && <div className="h-full min-h-40"><LogTerminal /></div>}
            {tab === 'DEDUCT' && <DeductPanel />}
          </main>
          {tab !== 'LOGS' && <ActionBar vertical className="shrink-0 overflow-y-auto" />}
        </div>
      </div>
    );
  } else {
    body = (
      <div className="flex h-full flex-col">
        <TopBar />
        <main className="min-h-0 flex-1 overflow-y-auto p-3" style={{ paddingBottom: 'calc(8.75rem + env(safe-area-inset-bottom))' }}>
          {tab === 'GRID' && <GridView mobile />}
          {tab === 'FOCUS' && <FocusPanel />}
          {tab === 'LOGS' && <div className="h-[calc(100dvh-14rem)]"><LogTerminal /></div>}
          {tab === 'DEDUCT' && <DeductPanel />}
        </main>
        {tab !== 'LOGS' && (
          <div className="fixed inset-x-0 z-30" style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom))' }}>
            <ActionBar />
          </div>
        )}
        <BottomDock />
      </div>
    );
  }

  return (
    <div className={`h-full bg-scada-bg font-sans text-scada-text ${crt ? 'crt-on' : ''}`}>
      <div className="crt-flicker h-full">{body}</div>
      {tutorialOpen && phase === 'RUNNING' && <Tutorial />}
      {(phase === 'VICTORY' || phase === 'DEFEAT') && <EndScreen />}
      {phase === 'PAUSED' && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-scada-bg/85">
          <div className="text-xl font-bold text-scada-amber">PAUSED</div>
          <button className="touch-target h-12 w-56 rounded border border-scada-mint text-sm font-bold text-scada-mint" onClick={() => useGame.getState().togglePause()}>RESUME</button>
          <button className="touch-target h-12 w-56 rounded border border-scada-cobalt text-sm font-bold text-scada-cobalt" onClick={() => { useGame.getState().togglePause(); useGame.getState().openTutorial(); }}>TRAINING</button>
          <button className="touch-target h-12 w-56 rounded border border-scada-border text-sm font-bold" onClick={() => useGame.getState().toMenu()}>QUIT TO MENU</button>
        </div>
      )}
      <div className="crt-overlay" />
    </div>
  );
}
