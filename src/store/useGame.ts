import { create } from 'zustand';
import { sound, vibrate } from '../audio/synth';
import { resetTruck } from '../city/truck';
import { applyAction, createInitialState, deliverKit, pickupKit, tickGame, voteIsolate } from '../engine/sim';
import type { ActionType, ActiveTab, Difficulty, DistrictId, GameMode, GameSettings, GameState } from '../types/game';

const SETTINGS_KEY = 'blackout-protocol:settings';

function loadSettings(): GameSettings {
  const def: GameSettings = { crtScanlines: true, muted: false, haptics: true };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...def, ...JSON.parse(raw) } : def;
  } catch {
    return def;
  }
}

function saveSettings(s: GameSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* storage unavailable */
  }
}

const DIFF_KEY = 'blackout-protocol:difficulty';
const BEST_KEY = 'blackout-protocol:best';

function loadDifficulty(): Difficulty {
  try {
    const v = localStorage.getItem(DIFF_KEY);
    if (v === 'CADET' || v === 'OPERATOR' || v === 'VETERAN') return v;
  } catch {
    /* storage unavailable */
  }
  return 'OPERATOR';
}

export const bestKey = (mode: GameMode, d: Difficulty) => `${mode}:${d}`;

export function loadBest(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(BEST_KEY) ?? '{}');
  } catch {
    return {};
  }
}

const TUT_KEY = 'blackout-protocol:tutorial-seen';

function tutorialSeen(mode: GameMode): boolean {
  try {
    return (JSON.parse(localStorage.getItem(TUT_KEY) ?? '{}') as Record<string, boolean>)[mode] === true;
  } catch {
    return false;
  }
}

function markTutorialSeen(mode: GameMode) {
  try {
    const seen = JSON.parse(localStorage.getItem(TUT_KEY) ?? '{}');
    localStorage.setItem(TUT_KEY, JSON.stringify({ ...seen, [mode]: true }));
  } catch {
    /* storage unavailable */
  }
}

interface Store {
  g: GameState;
  tutorialOpen: boolean;
  cityView: 'CHASE' | 'OVERVIEW';
  toggleView: () => void;
  takeKit: () => void;
  dropKit: (id: DistrictId) => void;
  openTutorial: () => void;
  closeTutorial: () => void;
  difficulty: Difficulty;
  best: Record<string, number>;
  setDifficulty: (d: Difficulty) => void;
  recordScore: (score: number) => void;
  start: (mode: GameMode) => void;
  toMenu: () => void;
  tick: () => void;
  setTab: (t: ActiveTab) => void;
  selectNode: (id: DistrictId, goFocus?: boolean) => void;
  setSupply: (mw: number) => void;
  act: (type: ActionType, nodeId?: DistrictId) => void;
  vote: (engineerId: string) => void;
  flag: (engineerId: string) => void;
  togglePause: () => void;
  toggleMute: () => void;
  toggleCrt: () => void;
}

const menuState = (settings: GameSettings): GameState => ({
  ...createInitialState('SOLO_CRISIS', 1, settings),
  phase: 'MENU',
});

const initialSettings = loadSettings();
sound.setMuted(initialSettings.muted);

export const useGame = create<Store>((set, get) => ({
  g: menuState(initialSettings),
  tutorialOpen: false,
  cityView: 'CHASE',
  toggleView: () => set({ cityView: get().cityView === 'CHASE' ? 'OVERVIEW' : 'CHASE' }),
  takeKit: () => {
    const g = get().g;
    const next = pickupKit(g);
    if (next === g) return;
    sound.pickup();
    vibrate(40, g.settings.haptics);
    set({ g: next });
  },
  dropKit: (id) => {
    const g = get().g;
    const next = deliverKit(g, id);
    if (next === g) return;
    sound.deliver();
    vibrate([40, 40, 80], g.settings.haptics);
    set({ g: next });
  },
  openTutorial: () => set({ tutorialOpen: true }),
  closeTutorial: () => {
    markTutorialSeen(get().g.mode);
    set({ tutorialOpen: false });
  },
  difficulty: loadDifficulty(),
  best: loadBest(),

  setDifficulty: (difficulty) => {
    try {
      localStorage.setItem(DIFF_KEY, difficulty);
    } catch {
      /* storage unavailable */
    }
    set({ difficulty });
  },

  recordScore: (score) => {
    const { g, difficulty, best } = get();
    const k = bestKey(g.mode, g.difficulty ?? difficulty);
    if (score <= (best[k] ?? 0)) return;
    const next = { ...best, [k]: score };
    try {
      localStorage.setItem(BEST_KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable */
    }
    set({ best: next });
  },

  start: (mode) => {
    const settings = get().g.settings;
    sound.setMuted(settings.muted);
    resetTruck();
    const g = createInitialState(mode, undefined, settings, get().difficulty);
    g.selectedNodeId = g.playerNodeId ?? 'downtown';
    set({ g, tutorialOpen: !tutorialSeen(mode) });
    sound.click();
    sound.startDrone();
  },

  toMenu: () => {
    sound.stopDrone();
    set({ g: menuState(get().g.settings), tutorialOpen: false });
  },

  tick: () => {
    const prev = get().g;
    const next = tickGame(prev);
    if (next === prev) return;
    const haptics = next.settings.haptics;
    let blackout = false;
    let critical = false;
    for (const id of Object.keys(next.nodes) as DistrictId[]) {
      const a = prev.nodes[id].status;
      const b = next.nodes[id].status;
      if (a !== b && b === 'BLACKOUT') blackout = true;
      if (a !== b && b === 'CRITICAL') critical = true;
    }
    const newHazard = next.hazards.some((h) => !prev.hazards.some((p) => p.id === h.id));
    if (blackout) {
      sound.blackout();
      vibrate([200, 80, 200], haptics);
    } else if (critical) {
      sound.alarm();
      vibrate(120, haptics);
    } else if (newHazard) sound.hazard();
    if (next.phase !== prev.phase) {
      sound.stopDrone();
      if (next.phase === 'VICTORY') sound.success();
      else sound.fail();
    }
    set({ g: next });
  },

  setTab: (t) => {
    const g = structuredClone(get().g);
    g.activeTab = t;
    if (t === 'LOGS' || t === 'DEDUCT') g.badges[t] = 0;
    sound.tab();
    set({ g });
  },

  selectNode: (id, goFocus) => {
    if (get().g.selectedNodeId === id && !goFocus) return;
    const g = { ...get().g, selectedNodeId: id };
    if (goFocus) g.activeTab = 'FOCUS';
    sound.click();
    set({ g });
  },

  setSupply: (mw) => {
    const g = get().g;
    set({ g: applyAction(g, { type: 'SET_SUPPLY', nodeId: g.selectedNodeId, amountMW: mw }) });
  },

  act: (type, nodeId) => {
    const g = get().g;
    const next = applyAction(g, { type, nodeId: nodeId ?? g.selectedNodeId });
    if (next === g) return;
    if (type === 'COOLANT') sound.coolant();
    else if (type === 'REROUTE') sound.reroute();
    else if (type === 'DIAGNOSTIC') sound.scan();
    else sound.click();
    vibrate(30, g.settings.haptics);
    set({ g: next });
  },

  vote: (engineerId) => {
    const g = get().g;
    const next = voteIsolate(g, engineerId);
    if (next === g) return;
    vibrate([60, 40, 60], g.settings.haptics);
    sound.warn();
    if (next.phase !== g.phase) {
      sound.stopDrone();
      if (next.phase === 'VICTORY') sound.success();
      else sound.fail();
    }
    set({ g: next });
  },

  flag: (engineerId) => {
    const g = structuredClone(get().g);
    const e = g.engineers.find((x) => x.id === engineerId);
    if (e) e.flagged = !e.flagged;
    sound.click();
    set({ g });
  },

  togglePause: () => {
    const g = { ...get().g };
    if (g.phase === 'RUNNING') g.phase = 'PAUSED';
    else if (g.phase === 'PAUSED') g.phase = 'RUNNING';
    set({ g });
  },

  toggleMute: () => {
    const g = get().g;
    const settings = { ...g.settings, muted: !g.settings.muted };
    sound.setMuted(settings.muted);
    if (!settings.muted && g.phase === 'RUNNING') sound.startDrone();
    saveSettings(settings);
    set({ g: { ...g, settings } });
  },

  toggleCrt: () => {
    const g = get().g;
    const settings = { ...g.settings, crtScanlines: !g.settings.crtScanlines };
    saveSettings(settings);
    set({ g: { ...g, settings } });
  },
}));
