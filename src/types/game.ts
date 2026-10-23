/**
 * Blackout Protocol — shared type definitions.
 * Simulation constants are documented next to the fields they govern.
 */

// ---------------------------------------------------------------------------
// Enumerations
// ---------------------------------------------------------------------------

export type GameMode = 'SOLO_CRISIS' | 'SABOTEUR_DEDUCTION';

export type GamePhase = 'MENU' | 'BRIEFING' | 'RUNNING' | 'PAUSED' | 'VICTORY' | 'DEFEAT';

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

export type NodeStatus = 'NOMINAL' | 'CAUTION' | 'CRITICAL' | 'BLACKOUT';

export type AlarmLevel = 'NOMINAL' | 'CAUTION' | 'CRITICAL';

// ---------------------------------------------------------------------------
// District nodes
// ---------------------------------------------------------------------------

export interface DistrictNode {
  id: DistrictId;
  name: string;
  /** Lucide icon name used by the UI. */
  icon: string;
  /** Adjacent online nodes receive redistributed demand on blackout. */
  adjacent: DistrictId[];
  /** Normalised (0–1) position in the grid map SVG. */
  position: { x: number; y: number };

  /** Base load in MW before weather drift (range 100–1200). */
  baseLoad: number;
  /** Current demand in MW = baseLoad + weather drift + surge + redistributed load. */
  demand: number;
  /** Current allocation in MW. */
  supply: number;
  /** demand - supply. Positive = under-supplied. */
  delta: number;
  /** Rated capacity in MW; load > 90% of this heats the node. */
  capacity: number;

  /** °C. Stabilises toward 60 when balanced; +1.5/s when stressed; -5/s with coolant. */
  temperature: number;
  /** 0–100. Static <80°C; -1%/s 80–95°C; -5%/s ≥95°C. 0 → cascading blackout. */
  integrity: number;
  status: NodeStatus;

  coolantActive: boolean;
  /** Remaining coolant flush duration (seconds). */
  coolantRemaining: number;
  /** Cooldown before coolant can be used again (seconds). */
  coolantCooldown: number;
  /** Isolated nodes are cut from the grid (no cascade in or out). */
  isolated: boolean;
  /** Seconds remaining on an active diagnostic scan of this node, if any. */
  diagnosticRemaining: number;

  /** Demand absorbed from blacked-out neighbours (MW), tracked for the UI. */
  redistributedLoad: number;
  /** Controller of this node. */
  controller: Controller;
}

export type Controller =
  | { kind: 'PLAYER' }
  | { kind: 'AI'; engineerId: string }
  | { kind: 'PLAYER_ALL' };

/** Cost constants for actions; kept in the type layer so UI and engine agree. */
export interface ActionCosts {
  coolantReserveMW: number; // 50
  rerouteReserveMW: number;
  isolateReserveMW: number;
  diagnosticReserveMW: number;
}

// ---------------------------------------------------------------------------
// Player actions & hazards
// ---------------------------------------------------------------------------

export type ActionType = 'REROUTE' | 'COOLANT' | 'ISOLATE' | 'DIAGNOSTIC' | 'SET_SUPPLY';

export interface PlayerAction {
  type: ActionType;
  nodeId: DistrictId;
  /** SET_SUPPLY: target MW. REROUTE: MW moved from `fromNodeId`. */
  amountMW?: number;
  fromNodeId?: DistrictId;
}

export type HazardType = 'LIGHTNING_STRIKE' | 'TRANSFORMER_BLOWOUT' | 'DEMAND_SURGE' | 'HEATWAVE';

export interface HazardEvent {
  id: string;
  type: HazardType;
  targetNodeId: DistrictId;
  /** Game tick at which the hazard spawned. */
  startedAtTick: number;
  durationSec: number;
  remainingSec: number;
  /** Demand multiplier / MW delta / integrity hit depending on `type`. */
  magnitude: number;
}

// ---------------------------------------------------------------------------
// Telemetry
// ---------------------------------------------------------------------------

export type LogCategory = 'SYSTEM' | 'ALLOCATION' | 'COOLANT' | 'ALARM' | 'HAZARD' | 'SCAN' | 'VOTE';

export type LogSeverity = 'INFO' | 'WARN' | 'CRIT';

/**
 * Public telemetry entry. In deduction mode every AI action is logged here
 * with a timestamp; saboteur tells must be inferable only by cross-referencing.
 */
export interface TelemetryLog {
  id: string;
  /** Game tick (1 tick = 1000ms). */
  tick: number;
  /** Formatted countdown timestamp, e.g. "04:32". */
  timestamp: string;
  severity: LogSeverity;
  category: LogCategory;
  /** Who/what produced the entry ("SYSTEM", "ENG-03", "PLAYER"). */
  source: string;
  nodeId?: DistrictId;
  message: string;
}

// ---------------------------------------------------------------------------
// Deduction mode
// ---------------------------------------------------------------------------

export type SaboteurTactic =
  | 'UNDER_SUPPLY'
  | 'DELAY_COOLANT'
  | 'FAKE_OVERLOAD';

export type ScanStatus = 'UNSCANNED' | 'SCANNING' | 'CLEAN' | 'ANOMALY';

export interface AIEngineer {
  id: string;
  callsign: string;
  nodeId: DistrictId;
  /** Hidden from the UI until the game ends. */
  role: Exclude<PlayerRole, 'PLAYER'>;
  tactics: SaboteurTactic[];
  scanStatus: ScanStatus;
  scanProgress: number; // 0–1
  /** Player-visible suspicion marker (0–1), derived from log evidence. */
  suspicion: number;
  /** Isolated by successful vote. */
  isolated: boolean;
  /** Player's current vote. */
  votedFor: boolean;
}

export interface VoteResult {
  engineerId: string;
  correct: boolean;
  tick: number;
}

// ---------------------------------------------------------------------------
// Game state
// ---------------------------------------------------------------------------

export interface GameSettings {
  crtScanlines: boolean;
  muted: boolean;
  haptics: boolean;
}

export interface GameState {
  mode: GameMode;
  phase: GamePhase;
  activeTab: ActiveTab;
  selectedNodeId: DistrictId;

  /** Elapsed ticks (1000ms each). */
  tick: number;
  /** Total duration in seconds (300 = 5:00). */
  durationSec: number;
  timeRemainingSec: number;

  nodes: Record<DistrictId, DistrictNode>;
  /** Global spare MW pool used by coolant/reroute actions. */
  reserveMW: number;
  /** Master grid health 0–100 (drives the green→amber→red top-bar meter). */
  gridHealth: number;
  blackoutCount: number;

  hazards: HazardEvent[];
  /** Ticks until the next hazard spawns (15–20s window). */
  nextHazardInSec: number;

  logs: TelemetryLog[];
  /** Per-tab unread/alert badge counts. */
  badges: Record<ActiveTab, number>;

  // Deduction mode
  playerRole: PlayerRole;
  playerNodeId: DistrictId | null;
  engineers: AIEngineer[];
  votes: VoteResult[];
  /** Diagnostic scans the player may still run. */
  scansRemaining: number;

  settings: GameSettings;
  /** Seed for deterministic simulation / replays. */
  seed: number;
}
