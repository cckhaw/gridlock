/**
 * Blackout Protocol — shared type definitions.
 */

export type GameMode = 'SOLO_CRISIS' | 'SABOTEUR_DEDUCTION' | 'PRACTICE';

export type TimeOfDay = 'DAY' | 'NIGHT' | 'AUTO';

export type Difficulty = 'CADET' | 'OPERATOR' | 'VETERAN';

export interface RunStats {
  healthSum: number;
  minHealth: number;
  coolantUses: number;
  hazardsSeen: number;
  peakTemp: number;
}

export type GamePhase = 'MENU' | 'RUNNING' | 'PAUSED' | 'VICTORY' | 'DEFEAT';

/** Mobile bottom-dock tabs (all four are shown side-by-side on desktop). */
export type ActiveTab = 'GRID' | 'FOCUS' | 'LOGS' | 'DEDUCT';

/** Who is behind a node: the human, an honest AI engineer, or a hidden saboteur. */
export type PlayerRole = 'PLAYER' | 'ENGINEER' | 'SABOTEUR';

export type DistrictId =
  | 'downtown'
  | 'industrial'
  | 'hospital'
  | 'metro'
  | 'residential'
  | 'water'
  | 'defense'
  | 'research';

export type NodeStatus = 'NOMINAL' | 'CAUTION' | 'CRITICAL' | 'BLACKOUT' | 'ISOLATED';

export interface DistrictNode {
  id: DistrictId;
  name: string;
  shortName: string;
  /** Lucide icon name used by the UI. */
  icon: string;
  /** Adjacent nodes receive redistributed demand on blackout. */
  adjacent: DistrictId[];
  /** Normalised (0–1) position in the grid map SVG. */
  position: { x: number; y: number };

  /** Base load in MW before weather drift (range 100–1200). */
  baseLoad: number;
  /** Current demand in MW = base + weather drift + surge + redistributed load. */
  demand: number;
  /** Current allocation in MW. */
  supply: number;
  /** demand - effective supply. Positive = under-supplied. */
  delta: number;
  /** Rated capacity in MW; load > 90% of this heats the node. */
  capacity: number;

  /** °C. Stabilises toward 60 when balanced; +1.5/s when stressed; -5/s with coolant. */
  temperature: number;
  /** 0–100. Static <80°C; -1%/s 80–95°C; -5%/s ≥95°C. 0 → cascading blackout. */
  integrity: number;
  status: NodeStatus;

  coolantActive: boolean;
  coolantRemaining: number;
  coolantCooldown: number;
  isolated: boolean;
  /** Seconds remaining on a diagnostic sweep / scan of this node. */
  diagnosticRemaining: number;

  /** Demand absorbed from blacked-out neighbours (MW). */
  redistributedLoad: number;
  /** Last supply value written to the public log (throttles slider spam). */
  loggedSupply: number;
  /** 'PLAYER' or an AIEngineer id. */
  ownerId: string;
}

export type ActionType = 'REROUTE' | 'COOLANT' | 'ISOLATE' | 'DIAGNOSTIC' | 'SET_SUPPLY';

export interface PlayerAction {
  type: ActionType;
  nodeId: DistrictId;
  amountMW?: number;
}

export type HazardType = 'LIGHTNING_STRIKE' | 'TRANSFORMER_BLOWOUT' | 'DEMAND_SURGE' | 'HEATWAVE';

export interface HazardEvent {
  id: string;
  type: HazardType;
  targetNodeId: DistrictId;
  startedAtTick: number;
  durationSec: number;
  remainingSec: number;
  /** Fraction: demand uplift (surge) or supply loss (blowout). */
  magnitude: number;
}

export type LogCategory = 'SYSTEM' | 'ALLOCATION' | 'COOLANT' | 'ALARM' | 'HAZARD' | 'SCAN' | 'VOTE';
export type LogSeverity = 'INFO' | 'WARN' | 'CRIT';

export interface TelemetryLog {
  id: string;
  tick: number;
  /** Countdown timestamp, e.g. "04:32". */
  timestamp: string;
  severity: LogSeverity;
  category: LogCategory;
  source: string;
  nodeId?: DistrictId;
  message: string;
}

export type SaboteurTactic = 'UNDER_SUPPLY' | 'DELAY_COOLANT' | 'FAKE_OVERLOAD';
export type ScanStatus = 'UNSCANNED' | 'SCANNING' | 'CLEAN' | 'ANOMALY';

export interface HistoryPoint {
  tick: number;
  health: number;
  /** Rounded °C per district, in DISTRICT_ORDER. */
  temps: number[];
  /** Bitmask (DISTRICT_ORDER) of blacked-out / isolated districts. */
  down: number;
}

export type TimelineKind = 'HAZARD' | 'BLACKOUT' | 'TACTIC' | 'SCAN' | 'VOTE' | 'COOLANT';

export interface TimelineEvent {
  tick: number;
  kind: TimelineKind;
  label: string;
  nodeId?: DistrictId;
  engineerId?: string;
  /** Only shown in the post-game replay. */
  secret?: boolean;
}

export interface AIEngineer {
  id: string;
  callsign: string;
  nodeId: DistrictId;
  /** Hidden from the UI until revealed. */
  role: Exclude<PlayerRole, 'PLAYER'>;
  tactics: SaboteurTactic[];
  activeTactic: SaboteurTactic | null;
  tacticUntilTick: number;
  nextTacticTick: number;
  coolantReadyTick: number;
  /** Per-activation randomness (0–1) so tactics aren't identical each time. */
  tacticParam: number;
  lastReportTick: number;
  scanStatus: ScanStatus;
  /** Player-set suspect marker. */
  flagged: boolean;
  /** Removed by a vote. */
  isolated: boolean;
  revealed: boolean;
}

export interface VoteResult {
  engineerId: string;
  correct: boolean;
  tick: number;
}

export interface CrewState {
  credits: number;
  deliveries: number;
  revives: number;
  hasKit: boolean;
  /** Seconds until the depot has another repair kit. */
  kitCooldown: number;
}

export interface Assist {
  /** Autopilot keeps your districts' power matched to demand. */
  autoBalance: boolean;
  /** Autopilot flushes coolant when a district runs hot. */
  autoCool: boolean;
}

export interface PracticeState {
  /** Storm hazards strike on their own (otherwise only when you trigger them). */
  hazards: boolean;
  done: { kit: boolean; deliver: boolean; slider: boolean; cool: boolean; divert: boolean; hazard: boolean };
}

export interface GameSettings {
  timeOfDay: TimeOfDay;
  music: boolean;
  crtScanlines: boolean;
  muted: boolean;
  haptics: boolean;
}

export interface GameState {
  mode: GameMode;
  difficulty: Difficulty;
  stats: RunStats;
  crew: CrewState;
  assist: Assist;
  /** Autopilot toggles are offered (Cadet and Practice). */
  assistAllowed: boolean;
  practice: PracticeState;
  defeatBlackouts: number;
  phase: GamePhase;
  activeTab: ActiveTab;
  selectedNodeId: DistrictId;

  tick: number;
  durationSec: number;
  timeRemainingSec: number;

  nodes: Record<DistrictId, DistrictNode>;
  /** Total generation available to the grid (MW). */
  generationMW: number;
  /** Unallocated MW = generation - Σsupply - coolant holds. */
  reserveMW: number;
  /** Master grid health 0–100. */
  gridHealth: number;
  blackoutCount: number;

  hazards: HazardEvent[];
  nextHazardInSec: number;

  logs: TelemetryLog[];
  logCounter: number;
  history: HistoryPoint[];
  timeline: TimelineEvent[];
  badges: Record<ActiveTab, number>;

  playerRole: PlayerRole;
  playerNodeId: DistrictId | null;
  engineers: AIEngineer[];
  votes: VoteResult[];
  scansRemaining: number;
  wrongVotes: number;

  endReason: string | null;
  settings: GameSettings;
  seed: number;
}
