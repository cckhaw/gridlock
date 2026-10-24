import type { DistrictId } from '../types/game';

export const C = {
  TICK_MS: 1000,
  DURATION_SEC: 300,
  MAX_LOGS: 700,

  // Thermal model
  TEMP_NOMINAL: 60,
  TEMP_HEAT_RATE: 1.5,
  TEMP_COOL_RATE: 5,
  TEMP_STABILIZE_RATE: 2,
  OVERLOAD_LOAD: 0.9,
  TEMP_WARN: 80,
  TEMP_CRIT: 95,

  // Integrity model
  INTEGRITY_WARN_DECAY: 1,
  INTEGRITY_CRIT_DECAY: 5,

  // Actions
  COOLANT_COST_MW: 50,
  COOLANT_DURATION: 5,
  COOLANT_COOLDOWN: 15,
  DIAGNOSTIC_TIME_SOLO: 4,
  SCAN_TIME: 5,
  REROUTE_STEP_MW: 60,
  KIT_COOLDOWN: 8,
  KIT_INTEGRITY: 25,
  KIT_COOL: 20,
  KIT_BASE_CREDITS: 100,
  MAX_WRONG_VOTES: 3,

  // Hazards
  HAZARD_MIN_SEC: 15,
  HAZARD_MAX_SEC: 20,
  FIRST_HAZARD_SEC: 8,

  // Escalation / sizing
  CAPACITY_FACTOR: 1.4,
  DEFEAT_BLACKOUTS: 4,
} as const;

export interface DifficultyDef {
  label: string;
  blurb: string;
  reserveFactor: { SOLO_CRISIS: number; SABOTEUR_DEDUCTION: number };
  ramp: { SOLO_CRISIS: number; SABOTEUR_DEDUCTION: number };
  hazardScale: number;
  /** Saboteur tactic gap multiplier (smaller = more frequent). */
  saboteurGap: number;
  scanAccuracy: number;
  scans: number;
  scoreMult: number;
}

export const DIFFICULTY: Record<'CADET' | 'OPERATOR' | 'VETERAN', DifficultyDef> = {
  CADET: {
    label: 'CADET', blurb: 'Generous reserve, mild storm, reliable scans.',
    reserveFactor: { SOLO_CRISIS: 1.12, SABOTEUR_DEDUCTION: 1.16 },
    ramp: { SOLO_CRISIS: 0.07, SABOTEUR_DEDUCTION: 0.03 },
    hazardScale: 0.8, saboteurGap: 1.3, scanAccuracy: 0.9, scans: 4, scoreMult: 0.75,
  },
  OPERATOR: {
    label: 'OPERATOR', blurb: 'The intended experience.',
    reserveFactor: { SOLO_CRISIS: 1.08, SABOTEUR_DEDUCTION: 1.12 },
    ramp: { SOLO_CRISIS: 0.1, SABOTEUR_DEDUCTION: 0.05 },
    hazardScale: 1, saboteurGap: 1, scanAccuracy: 0.8, scans: 3, scoreMult: 1,
  },
  VETERAN: {
    label: 'VETERAN', blurb: 'Thin reserve, violent storm, noisy scans.',
    reserveFactor: { SOLO_CRISIS: 1.07, SABOTEUR_DEDUCTION: 1.08 },
    ramp: { SOLO_CRISIS: 0.11, SABOTEUR_DEDUCTION: 0.08 },
    hazardScale: 1.15, saboteurGap: 0.65, scanAccuracy: 0.7, scans: 2, scoreMult: 1.5,
  },
};

interface DistrictDef {
  name: string;
  shortName: string;
  icon: string;
  baseLoad: number;
  position: { x: number; y: number };
}

export const DISTRICT_ORDER: DistrictId[] = [
  'downtown',
  'industrial',
  'hospital',
  'metro',
  'residential',
  'water',
  'defense',
  'research',
];

export const DISTRICT_DEFS: Record<DistrictId, DistrictDef> = {
  downtown: { name: 'Downtown', shortName: 'DWN', icon: 'Building2', baseLoad: 600, position: { x: 0.5, y: 0.5 } },
  industrial: { name: 'Industrial Hub', shortName: 'IND', icon: 'Factory', baseLoad: 900, position: { x: 0.12, y: 0.5 } },
  hospital: { name: 'Hospital District', shortName: 'HSP', icon: 'Hospital', baseLoad: 400, position: { x: 0.5, y: 0.12 } },
  metro: { name: 'Metro Transit', shortName: 'MTR', icon: 'TrainFront', baseLoad: 500, position: { x: 0.88, y: 0.5 } },
  residential: { name: 'Residential North', shortName: 'RES', icon: 'Home', baseLoad: 550, position: { x: 0.75, y: 0.88 } },
  water: { name: 'Water Treatment', shortName: 'WTR', icon: 'Droplets', baseLoad: 300, position: { x: 0.25, y: 0.88 } },
  defense: { name: 'Defense Complex', shortName: 'DEF', icon: 'ShieldHalf', baseLoad: 450, position: { x: 0.88, y: 0.12 } },
  research: { name: 'Research Lab', shortName: 'LAB', icon: 'FlaskConical', baseLoad: 250, position: { x: 0.12, y: 0.12 } },
};

const EDGES: [DistrictId, DistrictId][] = [
  ['research', 'hospital'],
  ['research', 'industrial'],
  ['hospital', 'defense'],
  ['hospital', 'downtown'],
  ['defense', 'metro'],
  ['industrial', 'downtown'],
  ['industrial', 'water'],
  ['downtown', 'metro'],
  ['downtown', 'water'],
  ['downtown', 'residential'],
  ['metro', 'residential'],
  ['water', 'residential'],
];

export const GRID_EDGES = EDGES;

export const ADJACENCY: Record<DistrictId, DistrictId[]> = (() => {
  const adj = Object.fromEntries(DISTRICT_ORDER.map((id) => [id, [] as DistrictId[]])) as Record<
    DistrictId,
    DistrictId[]
  >;
  for (const [a, b] of EDGES) {
    adj[a].push(b);
    adj[b].push(a);
  }
  return adj;
})();
