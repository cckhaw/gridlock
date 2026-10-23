import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import GridMap from '../components/GridMap';
import { GRID_EDGES, DISTRICT_ORDER } from '../engine/constants';
import { mulberry32 } from '../engine/rng';
import { useGame } from '../store/useGame';
import type { DistrictId, HazardType, NodeStatus } from '../types/game';
import { alertFromLog, type CityAlert } from './alertText';
import { buildDistrict, PAD, windowTexture, type DistrictView } from './buildDistricts';

const WORLD = { w: 24, d: 17 };
const OK = new THREE.Color(0x00f5d4);
const AMBER = new THREE.Color(0xffb703);
const RED = new THREE.Color(0xff2a55);
const BLUE = new THREE.Color(0x3a86ff);
const DEAD = new THREE.Color(0x1b2230);
const DEAD_LINE = new THREE.Color(0x2a3344);

const STATUS_RANK: Record<NodeStatus, number> = { NOMINAL: 0, ISOLATED: 1, CAUTION: 2, CRITICAL: 3, BLACKOUT: 4 };

const FX: Record<HazardType, { color: number; i: number }> = {
  LIGHTNING_STRIKE: { color: 0xdfeaff, i: 40 },
  TRANSFORMER_BLOWOUT: { color: 0xffc070, i: 14 },
  DEMAND_SURGE: { color: 0x33e0ff, i: 12 },
  HEATWAVE: { color: 0xff8a2a, i: 10 },
};

const worldPos = (px: number, py: number) => new THREE.Vector3((px - 0.5) * WORLD.w, 0, (py - 0.5) * WORLD.d);

function makeBolt(x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: 0xe6f0ff });
  let prev = new THREE.Vector3(x + (Math.random() - 0.5) * 3, 20, z + (Math.random() - 0.5) * 3);
  const steps = 9;
  for (let i = 1; i <= steps; i++) {
    const k = i / steps;
    const next = new THREE.Vector3(x + (1 - k) * (Math.random() - 0.5) * 3, 20 * (1 - k) + 0.3 * k, z + (1 - k) * (Math.random() - 0.5) * 3);
    const len = prev.distanceTo(next);
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, len, 5), mat);
    seg.position.copy(prev).add(next).multiplyScalar(0.5);
    seg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), next.clone().sub(prev).normalize());
    g.add(seg);
    prev = next;
  }
  return g;
}

export default function CityScene() {
  const host = useRef<HTMLDivElement>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = host.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    } catch {
      setFailed(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(el.clientWidth || 300, el.clientHeight || 300);
    renderer.domElement.style.display = 'block';
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a1226);
    scene.fog = new THREE.FogExp2(0x0a1226, 0.012);
    const camera = new THREE.PerspectiveCamera(36, 1, 0.5, 200);

    const ambient = new THREE.AmbientLight(0x6678a8, 0.55);
    scene.add(ambient);
    const moon = new THREE.DirectionalLight(0x8fa8ff, 0.7);
    moon.position.set(-10, 20, 8);
    scene.add(moon);
    scene.add(new THREE.HemisphereLight(0x3a4a7a, 0x0a0f1c, 0.35));

    // Ground and street grid
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.MeshStandardMaterial({ color: 0x0b111f, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);
    const streets = new THREE.GridHelper(60, 30, 0x1b2845, 0x121b30);
    streets.position.y = 0.02;
    scene.add(streets);

    // Districts
    const tex = windowTexture();
    const views = {} as Record<DistrictId, DistrictView>;
    const nodes = useGame.getState().g.nodes;
    const pickables: THREE.Object3D[] = [];
    for (const id of DISTRICT_ORDER) {
      const v = buildDistrict(id, tex);
      const p = worldPos(nodes[id].position.x, nodes[id].position.y);
      v.group.position.copy(p);
      scene.add(v.group);
      views[id] = v;
      pickables.push(v.group);
    }

    // Background filler city
    {
      const rng = mulberry32(99);
      const geo = new THREE.BoxGeometry(1, 1, 1);
      const mat = new THREE.MeshStandardMaterial({ color: 0x151d30, emissive: new THREE.Color(0xffd9a0), emissiveMap: tex, emissiveIntensity: 0.16, roughness: 0.9 });
      const mesh = new THREE.InstancedMesh(geo, mat, 110);
      const m4 = new THREE.Matrix4();
      let n = 0;
      let guard = 0;
      while (n < 110 && guard++ < 5000) {
        const x = (rng() - 0.5) * 56;
        const z = (rng() - 0.5) * 44;
        const near = DISTRICT_ORDER.some((id) => {
          const q = views[id].group.position;
          return Math.abs(x - q.x) < PAD.w / 2 + 1.3 && Math.abs(z - q.z) < PAD.d / 2 + 1.3;
        });
        if (near) continue;
        const h = 0.5 + rng() * rng() * 3.4;
        const w = 0.7 + rng() * 0.8;
        m4.makeScale(w, h, w).setPosition(x, h / 2, z);
        mesh.setMatrixAt(n++, m4);
      }
      mesh.count = n;
      scene.add(mesh);
    }

    // Power lines with moving energy packets
    interface Line {
      a: DistrictId;
      b: DistrictId;
      curve: THREE.QuadraticBezierCurve3;
      mat: THREE.MeshBasicMaterial;
      packets: THREE.Mesh[];
      packetMat: THREE.MeshBasicMaterial;
    }
    const lines: Line[] = GRID_EDGES.map(([a, b]) => {
      const pa = views[a].group.position.clone().setY(1.0);
      const pb = views[b].group.position.clone().setY(1.0);
      const mid = pa.clone().add(pb).multiplyScalar(0.5).setY(3.4);
      const curve = new THREE.QuadraticBezierCurve3(pa, mid, pb);
      const mat = new THREE.MeshBasicMaterial({ color: 0x00f5d4 });
      scene.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 28, 0.05, 5), mat));
      const packetMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const packets = [0, 1, 2].map(() => {
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), packetMat);
        scene.add(m);
        return m;
      });
      return { a, b, curve, mat, packets, packetMat };
    });

    // Alert markers (bobbing cone above stressed districts) and selection ring
    const markerGeo = new THREE.ConeGeometry(0.35, 0.8, 4);
    markerGeo.rotateX(Math.PI);
    const markers = {} as Record<DistrictId, THREE.Mesh>;
    for (const id of DISTRICT_ORDER) {
      const m = new THREE.Mesh(markerGeo, new THREE.MeshBasicMaterial({ color: 0xff2a55 }));
      m.visible = false;
      scene.add(m);
      markers[id] = m;
    }
    const ring = new THREE.Mesh(new THREE.RingGeometry(3.25, 3.45, 64), new THREE.MeshBasicMaterial({ color: 0x3a86ff, side: THREE.DoubleSide, transparent: true }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.3;
    scene.add(ring);

    // Rain
    const RAIN = 650;
    const rainPos = new Float32Array(RAIN * 6);
    const rainSeed = new Float32Array(RAIN * 3);
    for (let i = 0; i < RAIN; i++) {
      rainSeed[i * 3] = (Math.random() - 0.5) * 60;
      rainSeed[i * 3 + 1] = Math.random() * 24;
      rainSeed[i * 3 + 2] = (Math.random() - 0.5) * 46;
    }
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
    const rainMat = new THREE.LineBasicMaterial({ color: 0x9db8ff, transparent: true, opacity: 0.2 });
    const rain = new THREE.LineSegments(rainGeo, rainMat);
    rain.frustumCulled = false;
    scene.add(rain);

    // Lightning bolts
    const bolts = new Map<string, { obj: THREE.Group; born: number }>();
    let flash = 0;

    // Camera / controls
    const target = new THREE.Vector3(0, 0.5, 0);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(target);
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.rotateSpeed = 0.55;
    controls.minPolarAngle = 0.3;
    controls.maxPolarAngle = 1.2;
    controls.minAzimuthAngle = -0.9;
    controls.maxAzimuthAngle = 0.9;
    controls.minDistance = 14;
    controls.maxDistance = 70;
    let interacted = false;
    controls.addEventListener('start', () => {
      interacted = true;
    });

    const fit = () => {
      const w = el.clientWidth || 300;
      const h = el.clientHeight || 300;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      if (interacted) return;
      const vf = THREE.MathUtils.degToRad(camera.fov) / 2;
      const hf = Math.atan(Math.tan(vf) * camera.aspect);
      const portrait = camera.aspect < 1;
      const halfW = (WORLD.w / 2 + 2.2) * (portrait ? 0.92 : 1);
      const halfD = WORLD.d / 2 + 2.4;
      const elev = THREE.MathUtils.degToRad(portrait ? 56 : 48);
      const distH = halfW / Math.tan(hf);
      const distV = (halfD * Math.sin(elev) + 3.5) / Math.tan(vf);
      const dist = Math.max(distH, distV) * 1.02;
      camera.position.set(0, target.y + Math.sin(elev) * dist, Math.cos(elev) * dist);
      camera.lookAt(target);
      controls.update();
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);

    // Picking
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let down: { x: number; y: number; t: number } | null = null;
    const onDown = (e: PointerEvent) => {
      down = { x: e.clientX, y: e.clientY, t: performance.now() };
    };
    const onUp = (e: PointerEvent) => {
      if (!down) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      const quick = performance.now() - down.t < 600;
      down = null;
      if (moved > 6 || !quick) return;
      const r = renderer.domElement.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(pickables, true)[0];
      let o: THREE.Object3D | null = hit?.object ?? null;
      while (o && !o.userData.id) o = o.parent;
      if (o) useGame.getState().selectNode(o.userData.id as DistrictId);
    };
    renderer.domElement.addEventListener('pointerdown', onDown);
    renderer.domElement.addEventListener('pointerup', onUp);

    // Frame loop
    const tmp = new THREE.Vector3();
    const clock = new THREE.Clock();
    let t = 0;
    let raf = 0;
    const phases = Object.fromEntries(DISTRICT_ORDER.map((id, i) => [id, i * 1.7])) as Record<DistrictId, number>;

    const frame = () => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(clock.getDelta(), 0.1);
      t += dt;
      const g = useGame.getState().g;
      const storm = Math.min(1, 0.25 + 0.75 * (g.tick / g.durationSec));

      // Hazard FX targets per district
      const fxTarget: Partial<Record<DistrictId, { color: number; i: number }>> = {};
      for (const h of g.hazards) {
        const f = FX[h.type];
        let i = f.i;
        if (h.type === 'DEMAND_SURGE') i *= 0.7 + 0.3 * Math.sin(t * 8);
        if (h.type === 'TRANSFORMER_BLOWOUT') i *= Math.random() > 0.35 ? 1 : 0.1;
        fxTarget[h.targetNodeId] = { color: f.color, i };
        if (h.type === 'LIGHTNING_STRIKE' && !bolts.has(h.id)) {
          const p = views[h.targetNodeId].group.position;
          const obj = makeBolt(p.x, p.z);
          scene.add(obj);
          bolts.set(h.id, { obj, born: t });
          flash = 1;
        }
      }
      for (const [id, b] of bolts) {
        const age = t - b.born;
        b.obj.visible = age < 0.9 && Math.sin(age * 60) > -0.4;
        if (age > 1) {
          scene.remove(b.obj);
          b.obj.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
          bolts.delete(id);
        }
      }
      flash = Math.max(0, flash - dt * 2.2);
      ambient.intensity = 0.55 + flash * 2.2;

      // Sky and rain follow the storm
      (scene.background as THREE.Color).setRGB(0.04 - 0.02 * storm + flash * 0.3, 0.07 - 0.03 * storm + flash * 0.3, 0.15 - 0.07 * storm + flash * 0.4);
      (scene.fog as THREE.FogExp2).color.copy(scene.background as THREE.Color);
      rainMat.opacity = 0.1 + 0.4 * storm;
      for (let i = 0; i < RAIN; i++) {
        let y = rainSeed[i * 3 + 1] - dt * (22 + 10 * storm);
        if (y < 0) y += 24;
        rainSeed[i * 3 + 1] = y;
        const x = rainSeed[i * 3] + (y - 12) * 0.05;
        const z = rainSeed[i * 3 + 2];
        rainPos.set([x, y, z, x - 0.05, y + 0.7, z], i * 6);
      }
      rainGeo.attributes.position.needsUpdate = true;

      // Districts
      const scr: Record<string, { x: number; y: number; vis: boolean }> = {};
      const scrL: Record<string, { x: number; y: number; vis: boolean }> = {};
      const w = el.clientWidth;
      const h = el.clientHeight;
      for (const id of DISTRICT_ORDER) {
        const v = views[id];
        const n = g.nodes[id];
        const ph = phases[id];
        let c: THREE.Color = v.windowColor;
        let inten = 1;
        let rimC: THREE.Color = OK;
        let li = 5;
        switch (n.status) {
          case 'CAUTION':
            c = AMBER;
            inten = 0.95 + 0.25 * Math.sin(t * 5 + ph);
            rimC = AMBER;
            break;
          case 'CRITICAL':
            c = RED;
            inten = 1.3 + 0.9 * Math.sin(t * 9 + ph);
            rimC = RED;
            li = 8;
            break;
          case 'BLACKOUT':
            c = DEAD;
            inten = 0.02;
            rimC = DEAD_LINE;
            li = 0;
            break;
          case 'ISOLATED':
            c = BLUE;
            inten = 0.4;
            rimC = BLUE;
            li = 1.5;
            break;
        }
        v.wall.emissive.lerp(c, 0.12);
        v.wall.emissiveIntensity += (inten - v.wall.emissiveIntensity) * 0.2;
        v.rim.color.lerp(rimC, 0.12);
        v.light.color.lerp(c, 0.12);
        v.light.intensity += (li * (0.9 + 0.1 * Math.sin(t * 3 + ph)) - v.light.intensity) * 0.15;
        for (const a of v.accents) {
          const baseI = (a.mat.userData.baseI ??= (a.mat as THREE.MeshStandardMaterial).emissiveIntensity) as number;
          const m = a.mat as THREE.MeshStandardMaterial;
          m.emissive.lerp(n.status === 'NOMINAL' ? a.base : c, 0.12);
          m.emissiveIntensity += ((n.status === 'BLACKOUT' ? 0.02 : baseI * Math.max(0.4, inten)) - m.emissiveIntensity) * 0.2;
        }
        const fx = fxTarget[id];
        if (fx) v.fx.color.setHex(fx.color);
        v.fx.intensity += ((fx ? fx.i : 0) - v.fx.intensity) * 0.35;
        const online = n.status !== 'BLACKOUT' && n.status !== 'ISOLATED';
        v.anim.forEach((fn) => fn(t, online));

        const mk = markers[id];
        const bad = n.status === 'CRITICAL' || n.status === 'CAUTION' || n.status === 'BLACKOUT';
        mk.visible = bad;
        if (bad) {
          (mk.material as THREE.MeshBasicMaterial).color.copy(n.status === 'CAUTION' ? AMBER : n.status === 'BLACKOUT' ? new THREE.Color(0x8a96aa) : RED);
          mk.position.set(v.group.position.x, v.topY + 1.5 + Math.sin(t * 4 + ph) * 0.25, v.group.position.z);
          mk.rotation.y = t * 2;
        }

        tmp.set(v.group.position.x, v.topY + 0.9, v.group.position.z).project(camera);
        scr[id] = { x: (tmp.x * 0.5 + 0.5) * w, y: (-tmp.y * 0.5 + 0.5) * h, vis: tmp.z < 1 };
        tmp.set(v.group.position.x, 0.3, v.group.position.z + PAD.d / 2 + 0.5).project(camera);
        scrL[id] = { x: (tmp.x * 0.5 + 0.5) * w, y: (-tmp.y * 0.5 + 0.5) * h, vis: tmp.z < 1 };
      }

      // Selection ring
      const sel = views[g.selectedNodeId];
      ring.position.x = sel.group.position.x;
      ring.position.z = sel.group.position.z;
      (ring.material as THREE.MeshBasicMaterial).opacity = 0.55 + 0.45 * Math.sin(t * 4);
      ring.scale.setScalar(1 + 0.02 * Math.sin(t * 4));

      // Power lines
      for (const L of lines) {
        const na = g.nodes[L.a];
        const nb = g.nodes[L.b];
        const dead = na.status === 'BLACKOUT' || nb.status === 'BLACKOUT' || na.isolated || nb.isolated;
        const worst = STATUS_RANK[na.status] >= STATUS_RANK[nb.status] ? na.status : nb.status;
        const col = dead ? DEAD_LINE : worst === 'CRITICAL' ? RED : worst === 'CAUTION' ? AMBER : OK;
        L.mat.color.lerp(col, 0.12);
        L.packetMat.color.copy(L.mat.color).lerp(new THREE.Color(0xffffff), 0.5);
        const forward = na.supply - na.demand >= nb.supply - nb.demand;
        L.packets.forEach((p, k) => {
          p.visible = !dead;
          if (dead) return;
          let u = (t * 0.28 + k / 3) % 1;
          if (!forward) u = 1 - u;
          L.curve.getPoint(u, p.position);
        });
      }

      controls.update();
      renderer.render(scene, camera);

      // HTML overlay (labels and alerts) follows the 3D anchors
      const ov = overlay.current;
      if (ov) {
        ov.querySelectorAll<HTMLElement>('[data-anchor]').forEach((node) => {
          const s = (node.dataset.kind === 'alert' ? scr : scrL)[node.dataset.anchor!];
          if (!s) return;
          const lift = node.dataset.kind === 'alert' ? 34 + Number(node.dataset.slot ?? 0) * 46 : 0;
          node.style.transform = `translate(${s.x.toFixed(1)}px, ${(s.y - lift).toFixed(1)}px) translate(-50%, ${node.dataset.kind === 'alert' ? '-100%' : '0'})`;
          node.style.visibility = s.vis ? 'visible' : 'hidden';
        });
      }
    };
    frame();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onDown);
      renderer.domElement.removeEventListener('pointerup', onUp);
      controls.dispose();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
      });
      tex.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  if (failed) return <GridMap />;
  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-scada-border/70 bg-scada-bg" aria-label="City power map">
      <div ref={host} className="absolute inset-0" />
      <div ref={overlay} className="pointer-events-none absolute inset-0 overflow-hidden">
        <DistrictLabels />
        <CityAlerts />
      </div>
    </div>
  );
}

const DOT: Record<NodeStatus, string> = {
  NOMINAL: 'bg-scada-mint',
  CAUTION: 'bg-scada-amber',
  CRITICAL: 'bg-scada-crimson animate-alarm-pulse',
  BLACKOUT: 'bg-scada-dim',
  ISOLATED: 'bg-scada-cobalt',
};

function DistrictLabels() {
  const nodes = useGame((s) => s.g.nodes);
  const selected = useGame((s) => s.g.selectedNodeId);
  const selectNode = useGame((s) => s.selectNode);
  return (
    <>
      {DISTRICT_ORDER.map((id) => {
        const n = nodes[id];
        return (
          <div key={id} data-anchor={id} data-kind="label" className="absolute left-0 top-0 will-change-transform" style={{ visibility: 'hidden' }}>
            <button
              onClick={() => selectNode(id)}
              className={`pointer-events-auto flex min-h-8 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold text-white shadow-lg backdrop-blur ${
                selected === id ? 'border-scada-cobalt bg-scada-cobalt/40' : 'border-white/15 bg-black/55'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${DOT[n.status]}`} />
              {n.name.split(' ')[0]}
              {n.ownerId === 'PLAYER' && useGame.getState().g.mode === 'SABOTEUR_DEDUCTION' ? <span className="text-scada-mint">· you</span> : null}
            </button>
          </div>
        );
      })}
    </>
  );
}

const TONE = {
  crit: 'border-scada-crimson bg-[#3a0a1c]/95 text-white shadow-glow-crimson',
  warn: 'border-scada-amber bg-[#3a2a05]/95 text-white shadow-glow-amber',
  info: 'border-scada-mint bg-[#04312c]/95 text-white shadow-glow-mint',
} as const;

function CityAlerts() {
  const logs = useGame((s) => s.g.logs);
  const selectNode = useGame((s) => s.selectNode);
  const [alerts, setAlerts] = useState<CityAlert[]>([]);
  const lastSeen = useRef(useGame.getState().g.logCounter);

  useEffect(() => {
    const fresh = logs.filter((l) => Number(l.id.slice(1)) > lastSeen.current);
    if (!fresh.length) return;
    lastSeen.current = Number(fresh[fresh.length - 1].id.slice(1));
    const made: CityAlert[] = [];
    for (const l of fresh) {
      if (!l.nodeId) continue;
      const a = alertFromLog(l);
      if (a) made.push({ key: l.id, nodeId: l.nodeId, born: Date.now(), ...a });
    }
    if (made.length) setAlerts((cur) => [...cur, ...made].slice(-10));
  }, [logs]);

  useEffect(() => {
    const id = window.setInterval(() => setAlerts((cur) => (cur.some((a) => Date.now() - a.born > 5500) ? cur.filter((a) => Date.now() - a.born <= 5500) : cur)), 500);
    return () => window.clearInterval(id);
  }, []);

  const slots: Record<string, number> = {};
  return (
    <>
      {alerts.map((a) => {
        const slot = (slots[a.nodeId] = (slots[a.nodeId] ?? -1) + 1);
        return (
          <div key={a.key} data-anchor={a.nodeId} data-kind="alert" data-slot={slot} className="absolute left-0 top-0 will-change-transform" style={{ visibility: 'hidden' }}>
            <button
              onClick={() => selectNode(a.nodeId as DistrictId)}
              className={`pointer-events-auto animate-pop-in flex max-w-[190px] items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-left text-xs font-bold ${TONE[a.tone]}`}
            >
              <span className="text-base leading-none">{a.icon}</span>
              <span className="leading-tight">{a.text}</span>
            </button>
          </div>
        );
      })}
    </>
  );
}
