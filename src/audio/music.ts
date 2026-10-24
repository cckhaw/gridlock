import { audioContext } from './synth';

export type TrackId = 'menu' | 'day' | 'night' | 'investigate' | 'tension';

/** CC0 tracks from OpenGameArt.org, see public/music/CREDITS.txt. */
const FILES: Record<TrackId, string> = {
  menu: 'music/menu-heavenly-loop.mp3',
  day: 'music/day-urban-theme.mp3',
  night: 'music/night-space-city.mp3',
  investigate: 'music/investigate-suspicious-loop.mp3',
  tension: 'music/tension-panic-mode.mp3',
};

const VOLUME: Record<TrackId, number> = { menu: 0.4, day: 0.32, night: 0.34, investigate: 0.36, tension: 0.4 };
const FADE = 2.2;

interface Loaded {
  buffer: AudioBuffer;
  start: number;
  end: number;
}

const cache = new Map<TrackId, Promise<Loaded | null>>();
let master: GainNode | null = null;
let current: { id: TrackId; src: AudioBufferSourceNode; gain: GainNode } | null = null;
let wanted: TrackId | null = null;
let enabled = true;
let muted = false;
let unlocked = false;

/** Trim the encoder padding so the loop is seamless. */
function trim(buf: AudioBuffer): { start: number; end: number } {
  const d = buf.getChannelData(0);
  const thr = 0.002;
  let a = 0;
  let b = d.length - 1;
  while (a < d.length && Math.abs(d[a]) < thr) a++;
  while (b > a && Math.abs(d[b]) < thr) b--;
  return { start: a / buf.sampleRate, end: (b + 1) / buf.sampleRate };
}

function load(id: TrackId): Promise<Loaded | null> {
  let p = cache.get(id);
  if (!p) {
    p = (async () => {
      const ctx = audioContext();
      if (!ctx) return null;
      try {
        const res = await fetch(new URL(FILES[id], document.baseURI).href);
        const data = await res.arrayBuffer();
        const buffer = await new Promise<AudioBuffer>((ok, bad) => ctx.decodeAudioData(data, ok, bad));
        return { buffer, ...trim(buffer) };
      } catch {
        cache.delete(id);
        return null;
      }
    })();
    cache.set(id, p);
  }
  return p;
}

function ensureMaster(ctx: AudioContext) {
  if (!master) {
    master = ctx.createGain();
    master.connect(ctx.destination);
  }
  master.gain.value = enabled && !muted ? 1 : 0;
  return master;
}

async function apply() {
  if (!unlocked) return;
  const id = enabled && !muted ? wanted : null;
  if (current?.id === id) return;
  const ctx = audioContext();
  if (!ctx) return;
  const m = ensureMaster(ctx);
  const now = ctx.currentTime;
  const old = current;
  if (old) {
    old.gain.gain.cancelScheduledValues(now);
    old.gain.gain.setValueAtTime(old.gain.gain.value, now);
    old.gain.gain.linearRampToValueAtTime(0, now + FADE);
    old.src.stop(now + FADE + 0.1);
    current = null;
  }
  if (!id) return;
  const t = await load(id);
  if (!t || wanted !== id || !enabled || muted || (current && (current as { id: TrackId }).id === id)) return;
  const src = ctx.createBufferSource();
  src.buffer = t.buffer;
  src.loop = true;
  src.loopStart = t.start;
  src.loopEnd = t.end;
  const gain = ctx.createGain();
  gain.gain.value = 0;
  src.connect(gain).connect(m);
  src.start(0, t.start);
  gain.gain.linearRampToValueAtTime(VOLUME[id], ctx.currentTime + FADE);
  current = { id, src, gain };
}

export const music = {
  /** Call from a user gesture; starts whatever is wanted. */
  unlock() {
    if (unlocked) return;
    const ctx = audioContext();
    if (!ctx) return;
    unlocked = true;
    void apply();
  },
  play(id: TrackId | null) {
    wanted = id;
    if (id) void load(id); // warm the cache
    void apply();
  },
  setEnabled(on: boolean) {
    enabled = on;
    void apply();
  },
  setMuted(m: boolean) {
    muted = m;
    void apply();
  },
  /** Debug / test hook: what is playing right now. */
  status() {
    return { playing: current?.id ?? null, wanted, enabled, muted, unlocked, ctx: audioContext()?.state ?? null, gain: current ? Math.round(current.gain.gain.value * 100) / 100 : 0 };
  },
  suspend() {
    void audioContext()?.suspend();
  },
  resume() {
    void audioContext()?.resume();
  },
};
