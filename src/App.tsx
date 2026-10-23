import ActionBar from './components/ActionBar';
import BottomDock from './components/BottomDock';
import DeductPanel from './components/DeductPanel';
import FocusPanel from './components/FocusPanel';
import GridMap from './components/GridMap';
import LogTerminal from './components/LogTerminal';
import NodeCard from './components/NodeCard';
import { EndScreen, MenuScreen } from './components/Screens';
import TopBar from './components/TopBar';
import { useGameLoop } from './hooks/useGameLoop';
import { useMediaQuery } from './hooks/useMediaQuery';
import { useGame } from './store/useGame';
import { useRef, useState, type ReactNode } from 'react';

const Panel = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="scada-panel flex min-h-0 flex-col">
    <h2 className="border-b border-scada-border px-3 py-1.5 text-[11px] font-bold tracking-widest text-scada-dim">{title}</h2>
    <div className="min-h-0 flex-1 overflow-y-auto p-3">{children}</div>
  </section>
);

function SwipeCards({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  return (
    <div>
      <div
        ref={ref}
        onScroll={(e) => setPage(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        className="scrollbar-none flex snap-x snap-mandatory gap-2 overflow-x-auto"
      >
        {children}
      </div>
      <div className="mt-2 flex items-center justify-center gap-2 text-[10px] text-scada-dim">
        {[0, 1].map((i) => (
          <span key={i} className={`h-1.5 w-6 rounded ${page === i ? 'bg-scada-cobalt shadow-glow-cobalt' : 'bg-scada-border'}`} />
        ))}
        <span>SWIPE FOR MORE</span>
      </div>
    </div>
  );
}

function GridView({ mobile }: { mobile: boolean }) {
  const nodes = useGame((s) => s.g.nodes);
  const setTab = useGame((s) => s.setTab);
  const selectNode = useGame((s) => s.selectNode);
  const list = Object.values(nodes);
  return (
    <div className="flex flex-col gap-3">
      <GridMap />
      {mobile ? (
        <SwipeCards>
          {[0, 4].map((o) => (
            <div key={o} className="grid w-full shrink-0 snap-center grid-cols-2 gap-2 pr-0.5">
              {list.slice(o, o + 4).map((n) => (
                <NodeCard key={n.id} node={n} onFocus={() => { selectNode(n.id); setTab('FOCUS'); }} />
              ))}
            </div>
          ))}
        </SwipeCards>
      ) : (
        <div className="grid grid-cols-2 gap-2 xl:grid-cols-3">
          {list.map((n) => <NodeCard key={n.id} node={n} />)}
        </div>
      )}
    </div>
  );
}

export default function App() {
  useGameLoop();
  const phase = useGame((s) => s.g.phase);
  const tab = useGame((s) => s.g.activeTab);
  const crt = useGame((s) => s.g.settings.crtScanlines);
  const desktop = useMediaQuery('(min-width: 900px) and (orientation: landscape)');

  let body: ReactNode;
  if (phase === 'MENU') {
    body = <MenuScreen />;
  } else if (desktop) {
    body = (
      <div className="flex h-full flex-col">
        <TopBar />
        <div className="grid min-h-0 flex-1 grid-cols-[1.4fr_1fr] grid-rows-2 gap-3 p-3">
          <Panel title="GRID MAP"><GridView mobile={false} /></Panel>
          <section className="scada-panel flex min-h-0 flex-col">
            <h2 className="border-b border-scada-border px-3 py-1.5 text-[11px] font-bold tracking-widest text-scada-dim">ACTIVE CONTROLS</h2>
            <div className="min-h-0 flex-1 overflow-y-auto p-3"><FocusPanel /></div>
            <ActionBar />
          </section>
          <Panel title="TELEMETRY LOG"><LogTerminal /></Panel>
          <Panel title="SABOTEUR ROSTER"><DeductPanel /></Panel>
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
    <div className={`h-full bg-scada-bg font-mono text-scada-text ${crt ? 'crt-on' : ''}`}>
      <div className="crt-flicker h-full">{body}</div>
      {(phase === 'VICTORY' || phase === 'DEFEAT') && <EndScreen />}
      {phase === 'PAUSED' && (
        <button className="fixed inset-0 z-50 flex items-center justify-center bg-scada-bg/80 text-xl font-bold text-scada-amber" onClick={() => useGame.getState().togglePause()}>
          PAUSED — TAP TO RESUME
        </button>
      )}
      <div className="crt-overlay" />
    </div>
  );
}
