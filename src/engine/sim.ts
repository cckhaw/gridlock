import type {
  AIEngineer,
  DistrictId,
  DistrictNode,
  Difficulty,
  GameMode,
  GameState,
  HazardEvent,
  TimelineEvent,
  LogCategory,
  LogSeverity,
  NodeStatus,
  PlayerAction,
  SaboteurTactic,
} from '../types/game';
import { ADJACENCY, C, DIFFICULTY, DISTRICT_DEFS, DISTRICT_ORDER } from './constants';
import { mulberry32, pick, shuffle } from './rng';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export const fmtTime = (sec: number) => {
  const s = Math.max(0, Math.floor(sec));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

export function addLog(
  s: GameState,
  severity: LogSeverity,
  category: LogCategory,
  source: string,
  message: string,
  nodeId?: DistrictId,
) {
  s.logs.push({
    id: `L${++s.logCounter}`,
    tick: s.tick,
    timestamp: fmtTime(s.timeRemainingSec),
    severity,
    category,
    source,
    nodeId,
    message,
  });
  if (s.logs.length > C.MAX_LOGS) s.logs.splice(0, s.logs.length - C.MAX_LOGS);
  if (severity !== 'INFO' && s.activeTab !== 'LOGS') s.badges.LOGS += 1;
}

export function addEvent(s: GameState, e: Omit<TimelineEvent, 'tick'>) {
  s.timeline.push({ tick: s.tick, ...e });
}

export const nodeList = (s: GameState): DistrictNode[] => DISTRICT_ORDER.map((id) => s.nodes[id]);

const isOnline = (n: DistrictNode) => n.status !== 'BLACKOUT' && !n.isolated;

export function computeReserve(s: GameState): number {
  let used = 0;
  for (const n of nodeList(s)) {
    if (isOnline(n)) used += n.supply;
    if (n.coolantActive) used += C.COOLANT_COST_MW;
  }
  return Math.floor(s.generationMW - used);
}

export function effectiveSupply(s: GameState, n: DistrictNode): number {
  let f = 1;
  for (const h of s.hazards) {
    if (h.type === 'TRANSFORMER_BLOWOUT' && h.targetNodeId === n.id) f = Math.min(f, 1 - h.magnitude);
  }
  return n.supply * f;
}

/** 0..1 storm progress (practice mode ramps gently over ten minutes and stays mild). */
export function progress(s: GameState): number {
  return s.mode === 'PRACTICE' ? Math.min(1, s.tick / 600) * 0.4 : Math.min(1, s.tick / s.durationSec);
}

const modeKey = (m: GameMode) => (m === 'SABOTEUR_DEDUCTION' ? 'SABOTEUR_DEDUCTION' : 'SOLO_CRISIS');

function weatherDrift(s: GameState, n: DistrictNode, idx: number): number {
  const ramp = DIFFICULTY[s.difficulty].ramp[modeKey(s.mode)];
  return n.baseLoad * (0.03 * Math.sin(s.tick / 8 + idx * 1.3) + ramp * progress(s));
}

function computeDemand(s: GameState, n: DistrictNode, idx: number): number {
  if (n.status === 'BLACKOUT' || n.isolated) return 0;
  let d = clamp(n.baseLoad + weatherDrift(s, n, idx), 100, 1200);
  for (const h of s.hazards) {
    if (h.type === 'DEMAND_SURGE' && h.targetNodeId === n.id) d += n.baseLoad * h.magnitude;
  }
  return d + n.redistributedLoad;
}

function statusOf(n: DistrictNode): NodeStatus {
  if (n.status === 'BLACKOUT') return 'BLACKOUT';
  if (n.isolated) return 'ISOLATED';
  const deficit = n.demand > 0 ? n.delta / n.demand : 0;
  if (n.temperature >= C.TEMP_CRIT || n.integrity < 35 || deficit > 0.2) return 'CRITICAL';
  if (n.temperature >= C.TEMP_WARN || deficit > 0.02) return 'CAUTION';
  return 'NOMINAL';
}

const nodeName = (s: GameState, id: DistrictId) => s.nodes[id].name.toUpperCase();

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

export function createInitialState(
  mode: GameMode,
  seed = Math.floor(Math.random() * 2 ** 31),
  settings: GameState['settings'] = { crtScanlines: true, muted: false, haptics: true, timeOfDay: 'AUTO', music: true },
  difficulty: Difficulty = 'OPERATOR',
): GameState {
  const rng = mulberry32(seed);
  const nodes = {} as Record<DistrictId, DistrictNode>;
  for (const id of DISTRICT_ORDER) {
    const d = DISTRICT_DEFS[id];
    nodes[id] = {
      id,
      name: d.name,
      shortName: d.shortName,
      icon: d.icon,
      adjacent: ADJACENCY[id],
      position: d.position,
      baseLoad: d.baseLoad,
      demand: d.baseLoad,
      supply: d.baseLoad,
      delta: 0,
      capacity: Math.round(d.baseLoad * C.CAPACITY_FACTOR),
      temperature: C.TEMP_NOMINAL,
      integrity: 100,
      status: 'NOMINAL',
      coolantActive: false,
      coolantRemaining: 0,
      coolantCooldown: 0,
      isolated: false,
      diagnosticRemaining: 0,
      redistributedLoad: 0,
      loggedSupply: d.baseLoad,
      ownerId: 'PLAYER',
    };
  }

  const s: GameState = {
    mode,
    difficulty,
    assist: mode === 'PRACTICE' ? { autoBalance: true, autoCool: false } : { autoBalance: DIFFICULTY[difficulty].autoBalance, autoCool: DIFFICULTY[difficulty].autoCool },
    assistAllowed: mode === 'PRACTICE' || DIFFICULTY[difficulty].autoBalance,
    practice: { hazards: false, done: { kit: false, deliver: false, slider: false, cool: false, divert: false, hazard: false } },
    defeatBlackouts: mode === 'PRACTICE' ? 99 : DIFFICULTY[difficulty].defeatBlackouts,
    crew: { credits: 0, deliveries: 0, revives: 0, hasKit: false, kitCooldown: 0 },
    stats: { healthSum: 0, minHealth: 100, coolantUses: 0, hazardsSeen: 0, peakTemp: 60 },
    phase: 'RUNNING',
    activeTab: 'GRID',
    selectedNodeId: 'downtown',
    tick: 0,
    durationSec: mode === 'PRACTICE' ? 1e9 : DIFFICULTY[difficulty].duration,
    timeRemainingSec: mode === 'PRACTICE' ? 1e9 : DIFFICULTY[difficulty].duration,
    nodes,
    generationMW: 0,
    reserveMW: 0,
    gridHealth: 100,
    blackoutCount: 0,
    hazards: [],
    nextHazardInSec: mode === 'PRACTICE' ? 60 : DIFFICULTY[difficulty].firstHazard,
    logs: [],
    logCounter: 0,
    history: [],
    timeline: [],
    badges: { GRID: 0, FOCUS: 0, LOGS: 0, DEDUCT: 0 },
    playerRole: 'PLAYER',
    playerNodeId: null,
    engineers: [],
    votes: [],
    scansRemaining: mode === 'SABOTEUR_DEDUCTION' ? DIFFICULTY[difficulty].scans : 0,
    wrongVotes: 0,
    endReason: null,
    settings,
    seed,
  };

  // Initial demand & balanced supply.
  nodeList(s).forEach((n, i) => {
    n.demand = computeDemand(s, n, i);
    n.supply = Math.ceil(n.demand) + 1;
    n.loggedSupply = n.supply;
  });
  const total = nodeList(s).reduce((a, n) => a + n.supply, 0);
  const factor = mode === 'PRACTICE' ? 1.25 : DIFFICULTY[difficulty].reserveFactor[mode];
  s.generationMW = Math.round((total * factor) / 10) * 10;
  s.reserveMW = computeReserve(s);

  if (mode === 'SABOTEUR_DEDUCTION') {
    const order = shuffle(rng, DISTRICT_ORDER);
    s.playerNodeId = order[0];
    s.selectedNodeId = order[0];
    s.nodes[order[0]].ownerId = 'PLAYER';
    const saboteurIdx = new Set(shuffle(rng, [0, 1, 2, 3, 4, 5, 6]).slice(0, 2));
    const tacticPool: SaboteurTactic[] = ['UNDER_SUPPLY', 'DELAY_COOLANT', 'FAKE_OVERLOAD'];
    s.engineers = order.slice(1).map((nodeId, i): AIEngineer => {
      const id = `ENG-0${i + 1}`;
      s.nodes[nodeId].ownerId = id;
      const sab = saboteurIdx.has(i);
      return {
        id,
        callsign: id,
        nodeId,
        role: sab ? 'SABOTEUR' : 'ENGINEER',
        tactics: sab ? shuffle(rng, tacticPool).slice(0, 2) : [],
        activeTactic: null,
        tacticUntilTick: 0,
        nextTacticTick: 20 + Math.floor(rng() * 20),
        coolantReadyTick: 0,
        tacticParam: 0,
        lastReportTick: 0,
        scanStatus: 'UNSCANNED',
        flagged: false,
        isolated: false,
        revealed: false,
      };
    });
    addLog(s, 'INFO', 'SYSTEM', 'SCADA', `Grid online. You control ${nodeName(s, order[0])}. 7 engineers on shift.`);
    addLog(s, 'WARN', 'SYSTEM', 'SCADA', 'INTEL: 2 engineers are compromised. Cross-reference the log.');
  } else {
    addLog(s, 'INFO', 'SYSTEM', 'SCADA', 'Grid online. Storm front inbound — you control all 8 districts.');
  }
  return s;
}

// ---------------------------------------------------------------------------
// Hazards
// ---------------------------------------------------------------------------

function spawnHazard(s: GameState, rng: () => number) {
  const online = nodeList(s).filter(isOnline);
  if (!online.length) return;
  const target = pick(rng, online);
  const esc = (1 + 0.6 * progress(s)) * (s.mode === 'PRACTICE' ? 0.6 : DIFFICULTY[s.difficulty].hazardScale);
  s.practice.done.hazard = true;
  s.stats.hazardsSeen += 1;
  const roll = rng();
  const base = { id: `H${s.tick}-${target.id}`, targetNodeId: target.id, startedAtTick: s.tick };
  let h: HazardEvent;
  if (roll < 0.25) {
    const dmg = Math.round(15 * esc + rng() * 10);
    target.integrity = Math.max(0, target.integrity - dmg);
    target.temperature += 18;
    h = { ...base, type: 'LIGHTNING_STRIKE', durationSec: 2, remainingSec: 2, magnitude: dmg };
    addLog(s, 'CRIT', 'HAZARD', 'WEATHER', `LIGHTNING STRIKE on ${nodeName(s, target.id)}: -${dmg}% integrity, +18°C`, target.id);
  } else if (roll < 0.5) {
    const mag = Math.min(0.6, 0.3 + 0.15 * rng() * esc);
    h = { ...base, type: 'TRANSFORMER_BLOWOUT', durationSec: 10, remainingSec: 10, magnitude: mag };
    addLog(s, 'CRIT', 'HAZARD', 'WEATHER', `TRANSFORMER BLOWOUT at ${nodeName(s, target.id)}: -${Math.round(mag * 100)}% delivered power for 10s`, target.id);
  } else if (roll < 0.85) {
    const mag = Math.min(0.45, 0.2 + 0.2 * rng() * esc);
    h = { ...base, type: 'DEMAND_SURGE', durationSec: 12, remainingSec: 12, magnitude: mag };
    addLog(s, 'WARN', 'HAZARD', 'WEATHER', `DEMAND SURGE at ${nodeName(s, target.id)}: +${Math.round(mag * 100)}% load for 12s`, target.id);
  } else {
    h = { ...base, type: 'HEATWAVE', durationSec: 15, remainingSec: 15, magnitude: 0.8 };
    addLog(s, 'WARN', 'HAZARD', 'WEATHER', `HEATWAVE over ${nodeName(s, target.id)}: cooling degraded for 15s`, target.id);
  }
  s.hazards.push(h);
  addEvent(s, { kind: 'HAZARD', label: `${h.type.replace('_', ' ')} @ ${nodeName(s, target.id)}`, nodeId: target.id });
}

// ---------------------------------------------------------------------------
// AI engineers (deduction mode)
// ---------------------------------------------------------------------------

function runEngineer(s: GameState, e: AIEngineer, rng: () => number) {
  const n = s.nodes[e.nodeId];
  if (n.status === 'BLACKOUT' || n.isolated) return;
  const sab = e.role === 'SABOTEUR' && !e.isolated;

  if (sab) {
    if (e.activeTactic && s.tick >= e.tacticUntilTick) {
      e.activeTactic = null;
      e.nextTacticTick = s.tick + Math.round((18 + Math.floor(rng() * 14)) * DIFFICULTY[s.difficulty].saboteurGap);
    } else if (!e.activeTactic && s.tick >= e.nextTacticTick) {
      e.activeTactic = pick(rng, e.tactics);
      e.tacticParam = rng();
      e.tacticUntilTick = s.tick + 8 + Math.floor(rng() * 5);
      addEvent(s, { kind: 'TACTIC', label: `${e.callsign} began ${e.activeTactic.replace('_', ' ')}`, nodeId: n.id, engineerId: e.id, secret: true });
      if (e.activeTactic === 'FAKE_OVERLOAD') {
        // Half the time the false alarm frames a neighbour instead of the saboteur's own district.
        const others = nodeList(s).filter((x) => isOnline(x) && x.id !== n.id);
        const framed = rng() < 0.5 && others.length ? pick(rng, others) : n;
        const pct = 112 + Math.floor(rng() * 18);
        addLog(s, 'WARN', 'ALARM', e.callsign, `${e.callsign} reports OVERLOAD on ${nodeName(s, framed.id)}: load ${pct}% — requesting extra allocation`, framed.id);
      }
    }
  } else if (n.temperature >= 88 && s.tick - e.lastReportTick > 15) {
    // Honest engineers raise genuine alarms, so alarms alone are not proof of sabotage.
    e.lastReportTick = s.tick;
    addLog(s, 'WARN', 'ALARM', e.callsign, `${e.callsign} reports OVERLOAD on ${nodeName(s, n.id)}: load ${Math.round((n.supply / n.capacity) * 100)}% — ${Math.round(n.temperature)}°C`, n.id);
  }

  // Allocation
  let target = Math.min(n.capacity, Math.ceil(n.demand) + 1);
  if (sab && e.activeTactic === 'UNDER_SUPPLY') target = Math.floor(n.demand * (0.9 + e.tacticParam * 0.05));
  if (sab && e.activeTactic === 'DELAY_COOLANT') target = Math.floor(n.demand * 0.96);
  if (sab && e.activeTactic === 'FAKE_OVERLOAD') target = Math.min(n.capacity, Math.ceil(n.demand * (1.1 + e.tacticParam * 0.08)));

  if (Math.abs(n.supply - target) >= 6 && rng() < 0.7) {
    const want = target - n.supply;
    const step = want > 0 ? Math.min(want, Math.max(0, computeReserve(s))) : want;
    if (step !== 0) n.supply += step;
  }
  if (Math.abs(n.supply - n.loggedSupply) >= 20) {
    n.loggedSupply = n.supply;
    addLog(s, 'INFO', 'ALLOCATION', e.callsign, `${e.callsign} set ${nodeName(s, n.id)} allocation to ${n.supply} MW`, n.id);
  }

  // Coolant
  if (n.temperature < 78) e.coolantReadyTick = 0;
  if (n.temperature >= 78 && !n.coolantActive && n.coolantCooldown <= 0 && computeReserve(s) >= C.COOLANT_COST_MW && rng() < 0.8) {
    if (e.coolantReadyTick === 0) {
      // Saboteurs stall deliberately; honest engineers occasionally lag by a second or two (red herring).
      const delay = sab && e.activeTactic === 'DELAY_COOLANT' ? 6 + Math.floor(rng() * 3) : rng() < 0.15 ? 1 + Math.floor(rng() * 3) : 0;
      e.coolantReadyTick = s.tick + delay;
    }
    if (s.tick >= e.coolantReadyTick) {
      n.coolantActive = true;
      n.coolantRemaining = C.COOLANT_DURATION;
      n.coolantCooldown = C.COOLANT_COOLDOWN;
      e.coolantReadyTick = 0;
      addLog(s, 'INFO', 'COOLANT', e.callsign, `${e.callsign} COOLANT FLUSH on ${nodeName(s, n.id)} at ${Math.round(n.temperature)}°C`, n.id);
    }
  }
}

const SCAN_HINT: Record<SaboteurTactic, string> = {
  UNDER_SUPPLY: 'allocation trails measured demand',
  DELAY_COOLANT: 'coolant response latency above protocol',
  FAKE_OVERLOAD: 'alarm reports do not match district sensors',
};

function resolveScan(s: GameState, n: DistrictNode, rng: () => number) {
  const e = s.engineers.find((x) => x.nodeId === n.id);
  if (!e) return;
  const acc = DIFFICULTY[s.difficulty].scanAccuracy;
  const anomaly = e.role === 'SABOTEUR' && !e.isolated ? rng() < acc : rng() < (1 - acc) / 2;
  e.scanStatus = anomaly ? 'ANOMALY' : 'CLEAN';
  const hintTactic = e.tactics.length ? pick(rng, e.tactics) : pick(rng, Object.keys(SCAN_HINT) as SaboteurTactic[]);
  addEvent(s, { kind: 'SCAN', label: `Scan of ${e.callsign}: ${anomaly ? 'ANOMALY' : 'clean'} (actually ${e.role === 'SABOTEUR' && !e.isolated ? 'saboteur' : 'innocent'})`, nodeId: n.id, engineerId: e.id });
  addLog(
    s,
    anomaly ? 'WARN' : 'INFO',
    'SCAN',
    'DIAG',
    anomaly
      ? `DIAG ${e.callsign}: ANOMALY — ${SCAN_HINT[hintTactic]}`
      : `DIAG ${e.callsign}: nominal — no deviation detected`,
    n.id,
  );
  if (s.activeTab !== 'DEDUCT') s.badges.DEDUCT += 1;
}

// ---------------------------------------------------------------------------
// Tick
// ---------------------------------------------------------------------------

export function tickGame(prev: GameState): GameState {
  if (prev.phase !== 'RUNNING') return prev;
  const s: GameState = structuredClone(prev);
  const rng = mulberry32(s.seed + s.tick * 9973 + 1);
  s.tick += 1;
  s.timeRemainingSec = Math.max(0, s.durationSec - s.tick);

  if (s.crew.kitCooldown > 0) s.crew.kitCooldown -= 1;

  // 1. Hazards
  for (const h of s.hazards) h.remainingSec -= 1;
  s.hazards = s.hazards.filter((h) => h.remainingSec > 0);
  s.nextHazardInSec -= 1;
  if (s.nextHazardInSec <= 0) {
    if (s.mode !== 'PRACTICE' || s.practice.hazards) spawnHazard(s, rng);
    const [gmin, gmax] = s.mode === 'PRACTICE' ? [45, 60] : DIFFICULTY[s.difficulty].hazardGap;
    s.nextHazardInSec = gmin + Math.floor(rng() * (gmax - gmin + 1));
  }

  // 2. Demand
  nodeList(s).forEach((n, i) => {
    n.demand = computeDemand(s, n, i);
  });

  // 3. AI engineers
  if (s.mode === 'SABOTEUR_DEDUCTION') for (const e of s.engineers) runEngineer(s, e, rng);

  // 3b. Autopilot assist for the player's districts (Cadet and Practice)
  if (s.assist.autoBalance || s.assist.autoCool) {
    for (const n of nodeList(s)) {
      if (n.ownerId !== 'PLAYER' || !isOnline(n)) continue;
      if (s.assist.autoBalance) {
        const want = Math.min(n.capacity, Math.ceil(n.demand) + 1);
        const diff = want - n.supply;
        if (Math.abs(diff) >= 1) n.supply += diff > 0 ? Math.min(diff, Math.max(0, computeReserve(s))) : diff;
      }
      if (s.assist.autoCool && n.temperature >= 75 && !n.coolantActive && n.coolantCooldown <= 0 && computeReserve(s) >= C.COOLANT_COST_MW) {
        n.coolantActive = true;
        n.coolantRemaining = C.COOLANT_DURATION;
        n.coolantCooldown = C.COOLANT_COOLDOWN;
      }
    }
  }

  // 4. Physics
  const prevStatus: Record<string, NodeStatus> = {};
  const newlyBlacked: DistrictNode[] = [];
  for (const n of nodeList(s)) {
    prevStatus[n.id] = n.status;
    if (n.coolantCooldown > 0) n.coolantCooldown -= 1;
    if (n.coolantActive) {
      n.coolantRemaining -= 1;
      if (n.coolantRemaining <= 0) n.coolantActive = false;
    }
    if (n.diagnosticRemaining > 0) {
      n.diagnosticRemaining -= 1;
      if (n.diagnosticRemaining === 0 && s.mode === 'SABOTEUR_DEDUCTION') resolveScan(s, n, rng);
    }

    if (n.status === 'BLACKOUT' || n.isolated) {
      n.temperature = Math.max(25, n.temperature - 2);
      n.delta = 0;
      continue;
    }

    const eff = effectiveSupply(s, n);
    n.delta = n.demand - eff;
    const stressed = eff < n.demand - 0.5 || eff / n.capacity > C.OVERLOAD_LOAD;
    let dT: number;
    if (n.coolantActive) dT = -C.TEMP_COOL_RATE;
    else if (stressed) dT = C.TEMP_HEAT_RATE;
    else dT = clamp(C.TEMP_NOMINAL - n.temperature, -C.TEMP_STABILIZE_RATE, C.TEMP_STABILIZE_RATE);
    if (s.hazards.some((h) => h.type === 'HEATWAVE' && h.targetNodeId === n.id)) dT += 0.8;
    n.temperature = clamp(n.temperature + dT, 25, 140);

    if (n.temperature >= C.TEMP_CRIT) n.integrity -= C.INTEGRITY_CRIT_DECAY;
    else if (n.temperature >= C.TEMP_WARN) n.integrity -= C.INTEGRITY_WARN_DECAY;
    n.integrity = Math.max(0, n.integrity);

    if (n.integrity <= 0) newlyBlacked.push(n);
  }

  // 5. Cascading blackout: redistribute 100% of unhandled demand to online neighbours.
  for (const n of newlyBlacked) n.status = 'BLACKOUT';
  for (const n of newlyBlacked) {
    const shed = n.demand;
    n.demand = 0;
    n.supply = 0;
    n.delta = 0;
    n.redistributedLoad = 0;
    n.coolantActive = false;
    s.blackoutCount += 1;
    addEvent(s, { kind: 'BLACKOUT', label: `${nodeName(s, n.id)} blackout`, nodeId: n.id });
    const targets = n.adjacent.map((id) => s.nodes[id]).filter(isOnline);
    if (targets.length) {
      const share = shed / targets.length;
      for (const t of targets) {
        t.demand += share;
        t.redistributedLoad += share;
        t.delta = t.demand - effectiveSupply(s, t);
      }
      addLog(s, 'CRIT', 'ALARM', 'SCADA', `BLACKOUT ${nodeName(s, n.id)} — ${Math.round(shed)} MW shed onto ${targets.map((t) => t.shortName).join(', ')}`, n.id);
    } else {
      addLog(s, 'CRIT', 'ALARM', 'SCADA', `BLACKOUT ${nodeName(s, n.id)} — ${Math.round(shed)} MW load lost`, n.id);
    }
  }

  // 6. Status transitions
  for (const n of nodeList(s)) {
    n.status = statusOf(n);
    const was = prevStatus[n.id];
    if (n.status !== was && n.status !== 'BLACKOUT' && n.status !== 'ISOLATED' && was !== 'ISOLATED' && was !== 'BLACKOUT') {
      if (n.status === 'CRITICAL') addLog(s, 'CRIT', 'ALARM', 'SCADA', `${nodeName(s, n.id)} CRITICAL — ${Math.round(n.temperature)}°C, integrity ${Math.round(n.integrity)}%`, n.id);
      else if (n.status === 'CAUTION' && was === 'NOMINAL') addLog(s, 'WARN', 'ALARM', 'SCADA', `${nodeName(s, n.id)} caution — ${Math.round(n.temperature)}°C, Δ${Math.round(n.delta)} MW`, n.id);
      else if (n.status === 'NOMINAL') addLog(s, 'INFO', 'SYSTEM', 'SCADA', `${nodeName(s, n.id)} returned to nominal`, n.id);
    }
  }

  // 7. Public sensor telemetry (deduction mode): one district every 2s
  if (s.mode === 'SABOTEUR_DEDUCTION' && s.tick % 2 === 0) {
    const n = s.nodes[DISTRICT_ORDER[(s.tick / 2) % DISTRICT_ORDER.length]];
    if (n.status !== 'BLACKOUT' && !n.isolated) {
      addLog(s, 'INFO', 'SYSTEM', 'SCADA', `${n.shortName} DEM ${Math.round(n.demand)} SUP ${Math.round(n.supply)} T ${Math.round(n.temperature)}°C INT ${Math.round(n.integrity)}%`, n.id);
    }
  }

  // 8. Aggregates
  s.reserveMW = computeReserve(s);
  let wSum = 0;
  let wTotal = 0;
  for (const n of nodeList(s)) {
    wTotal += n.baseLoad;
    if (n.status === 'BLACKOUT' || n.isolated) continue;
    const sat = n.demand > 0 ? Math.min(1, effectiveSupply(s, n) / n.demand) : 1;
    wSum += n.baseLoad * (0.5 * (n.integrity / 100) + 0.5 * sat);
  }
  s.gridHealth = Math.round((wSum / wTotal) * 100);
  s.stats.healthSum += s.gridHealth;
  s.stats.minHealth = Math.min(s.stats.minHealth, s.gridHealth);
  s.stats.peakTemp = Math.max(s.stats.peakTemp, ...nodeList(s).map((n) => n.temperature));
  s.history.push({
    tick: s.tick,
    health: s.gridHealth,
    temps: nodeList(s).map((n) => Math.round(n.temperature)),
    down: nodeList(s).reduce((m, n, i) => (n.status === 'BLACKOUT' || n.isolated ? m | (1 << i) : m), 0),
  });
  s.badges.GRID = nodeList(s).filter((n) => n.status === 'CRITICAL' || n.status === 'BLACKOUT').length;
  s.badges.FOCUS = ['CRITICAL', 'BLACKOUT'].includes(s.nodes[s.selectedNodeId].status) ? 1 : 0;
  if (s.activeTab === 'LOGS') s.badges.LOGS = 0;
  if (s.activeTab === 'DEDUCT') s.badges.DEDUCT = 0;

  // 9. End conditions
  evaluateEnd(s);
  return s;
}

function evaluateEnd(s: GameState) {
  if (s.phase !== 'RUNNING') return;
  const end = (phase: 'VICTORY' | 'DEFEAT', reason: string) => {
    s.phase = phase;
    s.endReason = reason;
    addLog(s, phase === 'VICTORY' ? 'INFO' : 'CRIT', 'SYSTEM', 'SCADA', reason);
  };
  if (s.mode === 'PRACTICE') return;
  if (s.blackoutCount >= s.defeatBlackouts) return end('DEFEAT', `Grid collapse: ${s.blackoutCount} districts blacked out.`);
  if (s.gridHealth < 10) return end('DEFEAT', 'Grid health critical. Total system failure.');
  if (s.mode === 'SABOTEUR_DEDUCTION') {
    if (s.engineers.filter((e) => e.role === 'SABOTEUR').every((e) => e.isolated)) {
      return end('VICTORY', 'Both saboteurs isolated. Grid secured.');
    }
    if (s.wrongVotes >= C.MAX_WRONG_VOTES) return end('DEFEAT', 'Too many innocent engineers isolated. Command lost confidence.');
    if (s.timeRemainingSec <= 0) return end('DEFEAT', 'Storm passed, but saboteurs remain at large.');
  } else if (s.timeRemainingSec <= 0) {
    end('VICTORY', 'Storm survived. Grid held.');
  }
}

// ---------------------------------------------------------------------------
// Player actions
// ---------------------------------------------------------------------------

export function canControl(s: GameState, id: DistrictId): boolean {
  return s.nodes[id].ownerId === 'PLAYER';
}

export function applyAction(prev: GameState, a: PlayerAction): GameState {
  if (prev.phase !== 'RUNNING') return prev;
  const s: GameState = structuredClone(prev);
  const n = s.nodes[a.nodeId];
  const name = nodeName(s, n.id);
  const deduction = s.mode === 'SABOTEUR_DEDUCTION';

  // Deduction mode: DIAGNOSTIC scans an engineer's node.
  if (a.type === 'DIAGNOSTIC' && deduction) {
    const e = s.engineers.find((x) => x.nodeId === n.id);
    if (!e || e.isolated || s.scansRemaining <= 0 || n.diagnosticRemaining > 0 || n.status === 'BLACKOUT') return prev;
    s.scansRemaining -= 1;
    n.diagnosticRemaining = C.SCAN_TIME;
    e.scanStatus = 'SCANNING';
    addLog(s, 'INFO', 'SCAN', 'PLAYER', `Diagnostic scan started on ${e.callsign} (${name})`, n.id);
    return s;
  }

  if (!canControl(s, n.id)) return prev;

  switch (a.type) {
    case 'SET_SUPPLY': {
      if (!isOnline(n)) return prev;
      const want = clamp(Math.round(a.amountMW ?? n.supply), 0, n.capacity);
      const room = computeReserve(s) + n.supply;
      n.supply = Math.min(want, room);
      s.practice.done.slider = true;
      if (deduction && Math.abs(n.supply - n.loggedSupply) >= 20) {
        n.loggedSupply = n.supply;
        addLog(s, 'INFO', 'ALLOCATION', 'PLAYER', `PLAYER set ${name} allocation to ${n.supply} MW`, n.id);
      }
      break;
    }
    case 'COOLANT': {
      if (!isOnline(n) || n.coolantActive || n.coolantCooldown > 0 || computeReserve(s) < C.COOLANT_COST_MW) return prev;
      n.coolantActive = true;
      n.coolantRemaining = C.COOLANT_DURATION;
      n.coolantCooldown = C.COOLANT_COOLDOWN;
      s.stats.coolantUses += 1;
      s.practice.done.cool = true;
      addLog(s, 'INFO', 'COOLANT', 'PLAYER', `PLAYER COOLANT FLUSH on ${name} at ${Math.round(n.temperature)}°C`, n.id);
      break;
    }
    case 'REROUTE': {
      if (!isOnline(n)) return prev;
      let need = Math.min(C.REROUTE_STEP_MW, Math.max(0, Math.ceil(n.demand - n.supply) + 5));
      if (need <= 0) need = C.REROUTE_STEP_MW;
      need = Math.min(need, n.capacity - n.supply);
      let got = 0;
      // Pull surplus from the most oversupplied neighbours first, then from reserve.
      const donors = n.adjacent
        .map((id) => s.nodes[id])
        .filter((d) => isOnline(d) && d.supply - d.demand > 5)
        .sort((x, y) => y.supply - y.demand - (x.supply - x.demand));
      for (const d of donors) {
        const give = Math.min(need - got, Math.floor(d.supply - d.demand - 2));
        if (give > 0) {
          d.supply -= give;
          got += give;
        }
      }
      if (got < need) got += Math.max(0, Math.min(need - got, computeReserve(s)));
      if (got <= 0) {
        addLog(s, 'WARN', 'ALLOCATION', 'PLAYER', `Reroute to ${name} failed: no spare capacity`, n.id);
        return s;
      }
      n.supply += got;
      s.practice.done.divert = true;
      if (deduction) n.loggedSupply = n.supply;
      addLog(s, 'INFO', 'ALLOCATION', 'PLAYER', `PLAYER rerouted +${got} MW to ${name}`, n.id);
      break;
    }
    case 'ISOLATE': {
      if (deduction || n.status === 'BLACKOUT') return prev;
      if (n.isolated) {
        n.isolated = false;
        n.supply = Math.min(n.capacity, computeReserve(s) + 0, Math.ceil(n.baseLoad));
        n.status = 'NOMINAL';
        addLog(s, 'INFO', 'SYSTEM', 'PLAYER', `${name} reconnected to grid`, n.id);
      } else {
        n.isolated = true;
        n.supply = 0;
        n.demand = 0;
        n.coolantActive = false;
        n.status = 'ISOLATED';
        addLog(s, 'WARN', 'SYSTEM', 'PLAYER', `${name} ISOLATED — load shed, no cascade`, n.id);
      }
      break;
    }
    case 'DIAGNOSTIC': {
      if (n.diagnosticRemaining > 0 || n.status === 'BLACKOUT') return prev;
      n.diagnosticRemaining = C.DIAGNOSTIC_TIME_SOLO;
      const idx = DISTRICT_ORDER.indexOf(n.id);
      const probe = { ...s, tick: s.tick + 10 };
      const proj = Math.round(computeDemand(probe, n, idx));
      const heating = n.supply < proj;
      const eta = heating ? Math.max(0, Math.ceil((C.TEMP_WARN - n.temperature) / C.TEMP_HEAT_RATE)) : null;
      addLog(s, 'INFO', 'SCAN', 'DIAG', `DIAG ${name}: demand ${Math.round(n.demand)} → ${proj} MW in 10s${eta !== null ? `; thermal limit in ~${eta}s unless supply raised` : '; thermals stable'}`, n.id);
      break;
    }
  }
  s.reserveMW = computeReserve(s);
  return s;
}

export function voteIsolate(prev: GameState, engineerId: string): GameState {
  if (prev.phase !== 'RUNNING' || prev.mode !== 'SABOTEUR_DEDUCTION') return prev;
  const s: GameState = structuredClone(prev);
  const e = s.engineers.find((x) => x.id === engineerId);
  if (!e || e.isolated) return prev;
  e.isolated = true;
  e.revealed = true;
  e.activeTactic = null;
  const correct = e.role === 'SABOTEUR';
  s.votes.push({ engineerId, correct, tick: s.tick });
  addEvent(s, { kind: 'VOTE', label: `Voted out ${e.callsign} — ${correct ? 'saboteur' : 'innocent'}`, nodeId: e.nodeId, engineerId });
  const n = s.nodes[e.nodeId];
  if (correct) {
    addLog(s, 'INFO', 'VOTE', 'COMMAND', `VOTE PASSED: ${e.callsign} confirmed SABOTEUR. ${nodeName(s, n.id)} reverted to autopilot.`, n.id);
  } else {
    s.wrongVotes += 1;
    addLog(s, 'CRIT', 'VOTE', 'COMMAND', `VOTE PASSED: ${e.callsign} was INNOCENT. ${nodeName(s, n.id)} taken offline. (${s.wrongVotes}/${C.MAX_WRONG_VOTES} errors)`, n.id);
    n.isolated = true;
    n.supply = 0;
    n.demand = 0;
    n.coolantActive = false;
    n.status = 'ISOLATED';
  }
  s.reserveMW = computeReserve(s);
  evaluateEnd(s);
  return s;
}

// ---------------------------------------------------------------------------
// Repair crew (the player's truck): pick up a kit at the depot, deliver to a district
// ---------------------------------------------------------------------------

export function needsHelp(s: GameState, n: DistrictNode): boolean {
  if (n.status === 'BLACKOUT') return true;
  if (n.isolated) return false;
  if (n.status === 'CRITICAL' || n.status === 'CAUTION' || n.temperature >= 72) return true;
  return s.hazards.some((h) => h.targetNodeId === n.id && h.type !== 'LIGHTNING_STRIKE');
}

/** Higher = more urgent. */
export function urgency(s: GameState, n: DistrictNode): number {
  if (!needsHelp(s, n)) return 0;
  const base = n.status === 'BLACKOUT' ? 100 : n.status === 'CRITICAL' ? 80 : n.status === 'CAUTION' ? 40 : 20;
  return base + Math.max(0, n.temperature - 60) + (100 - n.integrity) * 0.3 + n.baseLoad / 100;
}

/** Districts the crew may repair in this mode (deduction mode: only your own). */
export function crewTargets(s: GameState): DistrictNode[] {
  return nodeList(s).filter((n) => (s.mode !== 'SABOTEUR_DEDUCTION' ? true : n.ownerId === 'PLAYER'));
}

export function mostUrgent(s: GameState): DistrictNode | null {
  let best: DistrictNode | null = null;
  let score = 0;
  for (const n of crewTargets(s)) {
    const u = urgency(s, n);
    if (u > score) {
      score = u;
      best = n;
    }
  }
  return best;
}

export function pickupKit(prev: GameState): GameState {
  if (prev.phase !== 'RUNNING' || prev.crew.hasKit || prev.crew.kitCooldown > 0) return prev;
  const s: GameState = structuredClone(prev);
  s.crew.hasKit = true;
  s.practice.done.kit = true;
  addLog(s, 'INFO', 'SYSTEM', 'CREW', 'Repair kit loaded at the depot. Deliver it to a district in trouble.');
  return s;
}

export function deliverKit(prev: GameState, id: DistrictId): GameState {
  if (prev.phase !== 'RUNNING' || !prev.crew.hasKit) return prev;
  const n0 = prev.nodes[id];
  if (!crewTargets(prev).some((n) => n.id === id) || !needsHelp(prev, n0)) return prev;
  const s: GameState = structuredClone(prev);
  const n = s.nodes[id];
  const name = nodeName(s, id);
  const wasDark = n.status === 'BLACKOUT';
  const wasCritical = n.status === 'CRITICAL';
  if (wasDark) {
    n.status = 'NOMINAL';
    n.integrity = 60;
    n.temperature = C.TEMP_NOMINAL;
    n.redistributedLoad = 0;
    n.demand = computeDemand(s, n, DISTRICT_ORDER.indexOf(id));
    n.supply = 0;
    s.crew.revives += 1;
  } else {
    n.integrity = Math.min(100, n.integrity + C.KIT_INTEGRITY);
    n.temperature = Math.max(C.TEMP_NOMINAL, n.temperature - C.KIT_COOL);
  }
  n.coolantCooldown = 0;
  s.hazards = s.hazards.filter((h) => !(h.targetNodeId === id && h.type !== 'LIGHTNING_STRIKE'));
  // Crew also tops the district's power allocation up to its demand when spare power allows.
  const want = Math.min(n.capacity, Math.ceil(n.demand) + 1);
  if (n.supply < want) n.supply = Math.min(want, n.supply + Math.max(0, computeReserve(s)));
  n.loggedSupply = n.supply;
  const reward = C.KIT_BASE_CREDITS + (wasCritical ? 100 : 0) + (wasDark ? 200 : 0);
  s.crew.credits += reward;
  s.crew.deliveries += 1;
  s.practice.done.deliver = true;
  s.crew.hasKit = false;
  s.crew.kitCooldown = C.KIT_COOLDOWN;
  n.status = statusOf(n);
  s.reserveMW = computeReserve(s);
  addLog(s, 'INFO', 'SYSTEM', 'CREW', `Repair crew ${wasDark ? 'restored' : 'serviced'} ${name}. +${reward} credits.`, id);
  addEvent(s, { kind: 'COOLANT', label: `Crew ${wasDark ? 'restored' : 'serviced'} ${name}`, nodeId: id });
  return s;
}

export interface Objective {
  kind: 'PICKUP' | 'DELIVER' | 'STANDBY' | 'INVESTIGATE';
  title: string;
  detail: string;
  targetNodeId?: DistrictId;
}

export function currentObjective(s: GameState): Objective {
  const target = mostUrgent(s);
  if (s.mode === 'SABOTEUR_DEDUCTION') {
    const caught = s.engineers.filter((e) => e.role === 'SABOTEUR' && e.isolated).length;
    if (target && s.crew.hasKit) {
      return { kind: 'DELIVER', title: `Deliver the kit to ${target.name}`, detail: 'Your own district needs help (green beam).', targetNodeId: target.id };
    }
    return {
      kind: 'INVESTIGATE',
      title: `Catch both saboteurs (${caught}/2)`,
      detail: s.scansRemaining > 0 ? 'Read NEWS, Inspect suspects, then Vote out.' : 'Out of scans — rely on the NEWS log, then Vote out.',
    };
  }
  if (s.mode === 'PRACTICE' && !target && !s.crew.hasKit && !s.practice.done.kit) {
    return { kind: 'PICKUP', title: 'Practice: drive into the yellow ring', detail: 'Load a repair kit at the depot. No timer — take your time!' };
  }
  if (target) {
    return s.crew.hasKit
      ? { kind: 'DELIVER', title: `Deliver the kit to ${target.name}`, detail: target.status === 'BLACKOUT' ? 'Lights are out — restore it!' : 'It is overheating — drive to the green beam.', targetNodeId: target.id }
      : { kind: 'PICKUP', title: 'Pick up a repair kit at the DEPOT', detail: `${target.name} needs help. Drive into the yellow ring.` };
  }
  return s.crew.hasKit
    ? { kind: 'STANDBY', title: 'Kit loaded — stand by', detail: 'Deliver it to the first district that raises an alert.' }
    : { kind: 'PICKUP', title: 'Grab a repair kit at the DEPOT', detail: 'All quiet for now. Stock up before the next hazard.' };
}

// ---------------------------------------------------------------------------
// Practice / assist helpers
// ---------------------------------------------------------------------------

export function setAssist(prev: GameState, patch: Partial<GameState['assist']>): GameState {
  if (!prev.assistAllowed) return prev;
  return { ...prev, assist: { ...prev.assist, ...patch } };
}

export function setPracticeHazards(prev: GameState, on: boolean): GameState {
  if (prev.mode !== 'PRACTICE') return prev;
  return { ...prev, practice: { ...prev.practice, hazards: on } };
}

/** Practice only: strike the city with a storm hazard right now. */
export function triggerHazard(prev: GameState): GameState {
  if (prev.mode !== 'PRACTICE' || prev.phase !== 'RUNNING') return prev;
  const s: GameState = structuredClone(prev);
  spawnHazard(s, mulberry32(s.seed + s.tick * 31 + s.logCounter));
  return s;
}
