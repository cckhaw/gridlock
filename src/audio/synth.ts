/** Tiny Web Audio synthesizer — no assets, lazily created on first user gesture. */
let ctx: AudioContext | null = null;
let muted = false;
let drone: { osc: OscillatorNode; gain: GainNode } | null = null;

function ac(): AudioContext | null {
  if (muted) return null;
  try {
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new Ctor();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, dur: number, type: OscillatorType = 'square', vol = 0.06, slideTo?: number, delay = 0) {
  const a = ac();
  if (!a) return;
  const t0 = a.currentTime + delay;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noise(dur: number, vol = 0.08, lowpass = 1200) {
  const a = ac();
  if (!a) return;
  const len = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = lowpass;
  const g = a.createGain();
  g.gain.value = vol;
  src.connect(f).connect(g).connect(a.destination);
  src.start();
}

export const sound = {
  setMuted(m: boolean) {
    muted = m;
    if (m) this.stopDrone();
  },
  click: () => tone(880, 0.04, 'square', 0.03),
  tab: () => tone(520, 0.05, 'triangle', 0.04),
  warn: () => {
    tone(660, 0.12, 'square', 0.05);
    tone(660, 0.12, 'square', 0.05, undefined, 0.18);
  },
  alarm: () => {
    tone(980, 0.18, 'sawtooth', 0.06, 620);
    tone(980, 0.18, 'sawtooth', 0.06, 620, 0.22);
  },
  blackout: () => {
    tone(140, 0.9, 'sawtooth', 0.12, 38);
    noise(0.8, 0.12, 400);
  },
  coolant: () => noise(0.7, 0.07, 3000),
  reroute: () => tone(300, 0.2, 'triangle', 0.06, 900),
  scan: () => {
    tone(1200, 0.06, 'sine', 0.05);
    tone(1600, 0.06, 'sine', 0.05, undefined, 0.09);
  },
  hazard: () => {
    noise(0.35, 0.14, 2500);
    tone(90, 0.4, 'sawtooth', 0.08, 50);
  },
  success: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, 'triangle', 0.06, undefined, i * 0.12)),
  fail: () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.25, 'sawtooth', 0.06, undefined, i * 0.16)),
  horn: () => {
    tone(330, 0.22, 'square', 0.07);
    tone(415, 0.22, 'square', 0.06);
  },
  pickup: () => {
    tone(660, 0.1, 'triangle', 0.07);
    tone(990, 0.16, 'triangle', 0.07, undefined, 0.1);
  },
  deliver: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.14, 'triangle', 0.06, undefined, i * 0.07)),
  startDrone() {
    const a = ac();
    if (!a || drone) return;
    const osc = a.createOscillator();
    const gain = a.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = 50;
    gain.gain.value = 0.015;
    osc.connect(gain).connect(a.destination);
    osc.start();
    drone = { osc, gain };
  },
  stopDrone() {
    if (!drone) return;
    try {
      drone.osc.stop();
    } catch {
      /* already stopped */
    }
    drone = null;
  },
};

export function vibrate(pattern: number | number[], enabled: boolean) {
  if (!enabled) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* unsupported */
  }
}
