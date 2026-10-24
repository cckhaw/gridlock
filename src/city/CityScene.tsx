import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { sound } from '../audio/synth';
import GridMap from '../components/GridMap';
import { DISTRICT_ORDER, GRID_EDGES } from '../engine/constants';
import { mulberry32 } from '../engine/rng';
import { crewTargets, currentObjective, needsHelp, progress } from '../engine/sim';
import { useGame } from '../store/useGame';
import type { DistrictId, GameState, HazardType, NodeStatus } from '../types/game';
import { CityAlerts, DistrictLabels } from './CityOverlay';
import { buildDistrict, PAD, type DistrictView } from './buildDistricts';
import { animateCrewmate, buildGround, buildLamps, buildSky, buildSmoke, buildTraffic, buildTrees, lam, ROADS, type CrewMood } from './props';
import { makeWallTextures } from './textures';
import { buildTruck, DEPOT, stepTruck, truck } from './truck';

const WORLD = { w: 24, d: 17 };
const OK = new THREE.Color(0x30d158);
const AMBER = new THREE.Color(0xff9f0a);
const RED = new THREE.Color(0xff453a);
const BLUE = new THREE.Color(0x0a84ff);
const DEAD = new THREE.Color(0x20262f);
const DEAD_LINE = new THREE.Color(0x4a5568);
const RANK: Record<NodeStatus, number> = { NOMINAL: 0, ISOLATED: 1, CAUTION: 2, CRITICAL: 3, BLACKOUT: 4 };
const MOOD: Record<NodeStatus, CrewMood> = { NOMINAL: 'CALM', CAUTION: 'WORRIED', CRITICAL: 'PANIC', BLACKOUT: 'DOWN', ISOLATED: 'ISO' };

const FX: Record<HazardType, { color: number; i: number }> = {
  LIGHTNING_STRIKE: { color: 0xdfeaff, i: 40 },
  TRANSFORMER_BLOWOUT: { color: 0xffc070, i: 14 },
  DEMAND_SURGE: { color: 0x33e0ff, i: 12 },
  HEATWAVE: { color: 0xff8a2a, i: 10 },
};

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Target night factor 0..1 for the AUTO day/night cycle. */
function autoNight(g: GameState): number {
  if (g.mode === 'PRACTICE') return smooth(0.35, 0.65, 0.5 - 0.5 * Math.cos((g.tick / 240) * Math.PI * 2));
  return smooth(0.3, 0.72, progress(g));
}

const worldPos = (px: number, py: number) => new THREE.Vector3((px - 0.5) * WORLD.w, 0, (py - 0.5) * WORLD.d);

function makeBolt(x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: 0xf2f7ff });
  let prev = new THREE.Vector3(x + (Math.random() - 0.5) * 3, 22, z + (Math.random() - 0.5) * 3);
  const steps = 9;
  for (let i = 1; i <= steps; i++) {
    const k = i / steps;
    const next = new THREE.Vector3(x + (1 - k) * (Math.random() - 0.5) * 3, 22 * (1 - k) + 0.3 * k, z + (1 - k) * (Math.random() - 0.5) * 3);
    const len = prev.distanceTo(next);
    const seg = new THREE.Mesh(new THREE.BoxGeometry(0.16, len, 0.16), mat);
    seg.position.copy(prev).add(next).multiplyScalar(0.5);
    seg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), next.clone().sub(prev).normalize());
    g.add(seg);
    prev = next;
  }
  return g;
}

export default function CityScene({ bleed = false }: { bleed?: boolean }) {
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
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.75 : 2));
    renderer.setSize(el.clientWidth || 300, el.clientHeight || 300);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.display = 'block';
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const sky = new THREE.Color(0x78c8ff);
    scene.background = sky.clone();
    scene.fog = new THREE.FogExp2(0x78c8ff, 0.011);
    const camera = new THREE.PerspectiveCamera(36, 1, 0.5, 260);

    const hemi = new THREE.HemisphereLight(0xcfe8ff, 0x6a8f5a, 1.0);
    scene.add(hemi);
    const ambient = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(ambient);
    const sun = new THREE.DirectionalLight(0xfff4e0, 1.7);
    sun.castShadow = true;
    sun.shadow.mapSize.set(coarse ? 1024 : 2048, coarse ? 1024 : 2048);
    const sc = sun.shadow.camera;
    sc.left = -24;
    sc.right = 24;
    sc.top = 20;
    sc.bottom = -20;
    sc.near = 1;
    sc.far = 90;
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.04;
    scene.add(sun, sun.target);
    const moon = new THREE.DirectionalLight(0x8fa8ff, 0);
    moon.position.set(12, 24, -8);
    scene.add(moon);

    buildGround(scene);
    const skyProps = buildSky(scene);
    const traffic = buildTraffic(scene);
    const lamps = buildLamps();
    scene.add(lamps.group);
    const smoke = buildSmoke(scene);

    // Districts
    const tex = makeWallTextures();
    const views = {} as Record<DistrictId, DistrictView>;
    const nodes = useGame.getState().g.nodes;
    const pickables: THREE.Object3D[] = [];
    for (const id of DISTRICT_ORDER) {
      const v = buildDistrict(id, tex);
      v.group.position.copy(worldPos(nodes[id].position.x, nodes[id].position.y));
      scene.add(v.group);
      views[id] = v;
      pickables.push(v.group);
    }

    const inPad = (x: number, z: number, m = 1.2) =>
      DISTRICT_ORDER.some((id) => {
        const q = views[id].group.position;
        return Math.abs(x - q.x) < PAD.w / 2 + m && Math.abs(z - q.z) < PAD.d / 2 + m;
      });
    const onRoad = (x: number, z: number) =>
      ROADS.horizontals.some((r) => Math.abs(z - r) < 1.7) ||
      (z > ROADS.vz[0] - 1 && z < ROADS.vz[1] + 1 && ROADS.verticals.some((r) => Math.abs(x - r) < 1.7)) ||
      (Math.abs(x - DEPOT.x) < 3 && Math.abs(z - DEPOT.z) < 2.4);
    buildTrees(scene, (x, z) => inPad(x, z, 0.9) || onRoad(x, z), 90);

    // Filler city beyond the districts
    {
      const rng = mulberry32(99);
      const mat = new THREE.MeshLambertMaterial({ color: 0xffffff, map: tex.map, emissiveMap: tex.mask, emissive: new THREE.Color(0xffd9a0), emissiveIntensity: 0 });
      const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat, 60);
      mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(60 * 3), 3);
      const m4 = new THREE.Matrix4();
      const col = new THREE.Color();
      const tints = [0xd8e4f5, 0xf0d9c4, 0xd9e8d0, 0xe5d4f0, 0xf5e6b8];
      let n = 0;
      let guard = 0;
      while (n < 60 && guard++ < 5000) {
        const x = (rng() - 0.5) * 70;
        const z = -10 - rng() * 28;
        if (Math.abs(x) < 17 && z > -14) continue;
        const h = 1.2 + rng() * rng() * 6;
        const w = 1 + rng() * 1.3;
        m4.makeScale(w, h, w).setPosition(x, h / 2, z);
        mesh.setMatrixAt(n, m4);
        mesh.setColorAt(n, col.setHex(tints[Math.floor(rng() * tints.length)]));
        n++;
      }
      mesh.count = n;
      mesh.castShadow = mesh.receiveShadow = true;
      scene.add(mesh);
      scene.userData.fillerMat = mat;
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
      const pa = views[a].group.position.clone().setY(1.3);
      const pb = views[b].group.position.clone().setY(1.3);
      const mid = pa.clone().add(pb).multiplyScalar(0.5).setY(3.9);
      const curve = new THREE.QuadraticBezierCurve3(pa, mid, pb);
      const mat = new THREE.MeshBasicMaterial({ color: 0x30d158 });
      scene.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 28, 0.032, 5), mat));
      const packetMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const packets = [0, 1, 2].map(() => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.14), packetMat);
        scene.add(m);
        return m;
      });
      return { a, b, curve, mat, packets, packetMat };
    });
    // Pylons at each district
    const pylonMat = lam(0x39424f);
    for (const id of DISTRICT_ORDER) {
      const p = views[id].group.position;
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.3, 0.16), pylonMat);
      m.position.set(p.x, 0.85, p.z);
      m.castShadow = true;
      scene.add(m);
    }

    // Alert markers (bobbing cone) and selection ring
    const markerGeo = new THREE.ConeGeometry(0.4, 0.9, 4);
    markerGeo.rotateX(Math.PI);
    const markers = {} as Record<DistrictId, THREE.Mesh>;
    for (const id of DISTRICT_ORDER) {
      const m = new THREE.Mesh(markerGeo, new THREE.MeshBasicMaterial({ color: 0xff2a55 }));
      m.visible = false;
      scene.add(m);
      markers[id] = m;
    }
    const ring = new THREE.Mesh(new THREE.RingGeometry(3.15, 3.5, 4, 1, Math.PI / 4), new THREE.MeshBasicMaterial({ color: 0x2f7bff, side: THREE.DoubleSide, transparent: true }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.45;
    scene.add(ring);

    // Rain
    const RAIN = 700;
    const rainPos = new Float32Array(RAIN * 6);
    const rainSeed = new Float32Array(RAIN * 3);
    for (let i = 0; i < RAIN; i++) {
      rainSeed[i * 3] = (Math.random() - 0.5) * 60;
      rainSeed[i * 3 + 1] = Math.random() * 24;
      rainSeed[i * 3 + 2] = (Math.random() - 0.5) * 46;
    }
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
    const rainMat = new THREE.LineBasicMaterial({ color: 0xb7cdf5, transparent: true, opacity: 0 });
    const rain = new THREE.LineSegments(rainGeo, rainMat);
    rain.frustumCulled = false;
    scene.add(rain);

    const bolts = new Map<string, { obj: THREE.Group; born: number }>();
    let flash = 0;

    // Depot, beams and the repair truck
    const depot = new THREE.Group();
    depot.position.set(DEPOT.x, 0, DEPOT.z);
    const slab = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.1, 2.4), lam(0x9aa5b8));
    slab.position.y = 0.09;
    slab.receiveShadow = true;
    depot.add(slab);
    const depotRing = new THREE.Mesh(new THREE.RingGeometry(1.45, 1.75, 4, 1, Math.PI / 4), new THREE.MeshBasicMaterial({ color: 0xffd400, side: THREE.DoubleSide, transparent: true }));
    depotRing.rotation.x = -Math.PI / 2;
    depotRing.position.y = 0.16;
    depot.add(depotRing);
    const depotBeam = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 4.5, 4, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd400, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }));
    depotBeam.rotation.y = Math.PI / 4;
    depotBeam.position.y = 2.25;
    depot.add(depotBeam);
    const crate = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.45, 0.5), lam(0xff7a1a, { emissive: new THREE.Color(0x401800) }));
    crate.position.set(-1.9, 0.35, 0);
    crate.castShadow = true;
    depot.add(crate);
    const sign = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.45, 0.08), new THREE.MeshBasicMaterial({ color: 0xffd400 }));
    sign.position.set(1.6, 1.2, -0.9);
    const signPole = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.0, 0.08), lam(0x39424f));
    signPole.position.set(1.6, 0.6, -0.9);
    depot.add(sign, signPole);
    scene.add(depot);
    const destRing = new THREE.Mesh(new THREE.RingGeometry(2.55, 2.9, 4, 1, Math.PI / 4), new THREE.MeshBasicMaterial({ color: 0x00ff88, side: THREE.DoubleSide, transparent: true }));
    destRing.rotation.x = -Math.PI / 2;
    destRing.position.y = 0.5;
    scene.add(destRing);
    const destBeam = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 12, 4, 1, true), new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }));
    destBeam.rotation.y = Math.PI / 4;
    scene.add(destBeam);
    const { group: truckGroup, beaconMat, headMats, spot: truckSpot } = buildTruck();
    truckGroup.scale.setScalar(1.3);
    scene.add(truckGroup);
    const blockers = DISTRICT_ORDER.flatMap((id) => {
      const q = views[id].group.position;
      return views[id].blockers.map((b) => ({ x: q.x + b.x, z: q.z + b.z, hw: b.hw, hd: b.hd }));
    });
    blockers.push({ x: DEPOT.x - 1.9, z: DEPOT.z, hw: 0.25, hd: 0.25 });
    let lastView = useGame.getState().cityView;
    let lastInside: DistrictId | null = null;
    let lastAct = 0;

    const onKey = (e: KeyboardEvent, isDown: boolean) => {
      const st = useGame.getState();
      if (e.target instanceof HTMLInputElement && e.code.startsWith('Arrow')) return;
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        if (st.g.phase !== 'RUNNING' || st.tutorialOpen) return;
        if (isDown) truck.keys.add(e.code);
        else truck.keys.delete(e.code);
        e.preventDefault();
        return;
      }
      if (!isDown) return;
      if (e.code === 'KeyE' && st.g.phase === 'RUNNING') sound.horn();
      if (e.code === 'KeyV') st.toggleView();
      if (e.code === 'KeyN') st.cycleTimeOfDay();
      if (e.code === 'F1' || (e.key === '?' && !e.ctrlKey)) {
        e.preventDefault();
        st.openTutorial();
      }
    };
    const kd = (e: KeyboardEvent) => onKey(e, true);
    const ku = (e: KeyboardEvent) => onKey(e, false);
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);

    // Camera / controls
    const target = new THREE.Vector3(0, 0.5, 0);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(target);
    controls.enablePan = true;
    controls.screenSpacePanning = false;
    controls.panSpeed = 1.1;
    controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
    controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE };
    controls.enableDamping = true;
    controls.rotateSpeed = 0.55;
    controls.minPolarAngle = 0.3;
    controls.maxPolarAngle = 1.2;
    controls.minAzimuthAngle = -0.9;
    controls.maxAzimuthAngle = 0.9;
    controls.minDistance = 14;
    controls.maxDistance = 70;
    let interacted = false;
    let skipFit = false;
    controls.addEventListener('start', () => {
      interacted = true;
    });

    // Free camera: pan around the city with a finger / mouse drag or the arrow keys.
    const fwd = new THREE.Vector3();
    const right = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    const moveGround = (rightAmt: number, fwdAmt: number) => {
      camera.getWorldDirection(fwd);
      fwd.y = 0;
      fwd.normalize();
      right.crossVectors(fwd, up).normalize();
      const mx = right.x * rightAmt + fwd.x * fwdAmt;
      const mz = right.z * rightAmt + fwd.z * fwdAmt;
      camera.position.x += mx;
      camera.position.z += mz;
      controls.target.x += mx;
      controls.target.z += mz;
    };
    const clampTarget = () => {
      const cx = Math.max(-17, Math.min(17, controls.target.x));
      const cz = Math.max(-13, Math.min(13, controls.target.z));
      camera.position.x += cx - controls.target.x;
      camera.position.z += cz - controls.target.z;
      controls.target.x = cx;
      controls.target.z = cz;
    };
    /** Leave the truck-follow camera without a jump. */
    const enterFree = () => {
      controls.target.set(truck.x + Math.sin(truck.heading) * 4, 0.3, truck.z + Math.cos(truck.heading) * 4);
      interacted = true;
      skipFit = true;
      useGame.setState({ cityView: 'OVERVIEW' });
      controls.update();
    };
    const panPixels = (dx: number, dy: number) => {
      const dist = camera.position.distanceTo(controls.target);
      const k = (2 * dist * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)) / Math.max(1, el.clientHeight);
      moveGround(-dx * k, dy * k);
    };

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
      const dist = Math.max(halfW / Math.tan(hf), (halfD * Math.sin(elev) + 3.5) / Math.tan(vf)) * 1.02;
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
    let drag: { x: number; y: number; manual: boolean } | null = null;
    const onDown = (e: PointerEvent) => {
      down = { x: e.clientX, y: e.clientY, t: performance.now() };
      drag = { x: e.clientX, y: e.clientY, manual: false };
    };
    const onMove = (e: PointerEvent) => {
      if (!drag || !down) return;
      // In the truck-follow camera OrbitControls is off, so the first drag switches to the free camera and pans it.
      if (useGame.getState().cityView === 'CHASE' && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8) {
        enterFree();
        drag.manual = true;
      }
      if (drag.manual) {
        panPixels(e.clientX - drag.x, e.clientY - drag.y);
        clampTarget();
      }
      drag.x = e.clientX;
      drag.y = e.clientY;
    };
    const onUp = (e: PointerEvent) => {
      drag = null;
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
    renderer.domElement.addEventListener('pointermove', onMove);

    // Frame loop
    const tmp = new THREE.Vector3();
    const tmpC = new THREE.Color();
    const clock = new THREE.Clock();
    let t = 0;
    let raf = 0;
    let night = autoNight(useGame.getState().g) * 0;
    const skyDay = new THREE.Color(0x78c8ff);
    const skyDusk = new THREE.Color(0xff9a6a);
    const skyNight = new THREE.Color(0x0a1226);
    const skyStorm = new THREE.Color(0x7d8ea3);
    const sunDir = new THREE.Vector3();
    const emitAcc: Record<string, number> = {};
    const phases = Object.fromEntries(DISTRICT_ORDER.map((id, i) => [id, i * 1.7])) as Record<DistrictId, number>;
    const darkness: Record<string, number> = {};

    const frame = () => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(clock.getDelta(), 0.1);
      t += dt;
      const gs = useGame.getState();
      const g = gs.g;

      // --- time of day, weather and light
      const tod = g.settings.timeOfDay;
      const nt = tod === 'DAY' ? 0 : tod === 'NIGHT' ? 1 : autoNight(g);
      night += (nt - night) * Math.min(1, dt * 1.2);
      const stormBase = g.mode === 'PRACTICE' ? 0.1 + (g.practice.hazards ? 0.2 : 0) : 0.2 + 0.8 * progress(g);
      const storm = Math.min(1, stormBase * (g.difficulty === 'CADET' ? 0.6 : 1) + (g.hazards.length ? 0.15 : 0));

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

      // sky colour: day -> dusk -> night, greyed by storm
      const dusk = Math.sin(Math.min(1, night) * Math.PI);
      sky.copy(skyDay).lerp(skyStorm, storm * 0.6).lerp(skyDusk, dusk * 0.55).lerp(skyNight, smooth(0.35, 1, night));
      sky.r += flash * 0.5;
      sky.g += flash * 0.5;
      sky.b += flash * 0.6;
      (scene.background as THREE.Color).copy(sky);
      (scene.fog as THREE.FogExp2).color.copy(sky);
      (scene.fog as THREE.FogExp2).density = 0.009 + storm * 0.006 + night * 0.004;
      sunDir.set(-0.5, 0.78 * (1 - night * 0.7) + 0.12, 0.42).normalize();
      sun.position.copy(sunDir).multiplyScalar(36);
      sun.target.position.set(0, 0, 0);
      sun.intensity = 1.9 * (1 - smooth(0.3, 0.85, night)) * (1 - 0.55 * storm);
      sun.color.setHex(0xfff4e0).lerp(tmpC.setHex(0xff9a55), dusk * 0.8);
      moon.intensity = 0.7 * smooth(0.3, 1, night);
      hemi.intensity = (0.3 + 0.8 * (1 - night)) * (1 - 0.3 * storm);
      hemi.color.setHex(0xcfe8ff).lerp(tmpC.setHex(0x4a5a8a), night);
      hemi.groundColor.setHex(0x6a8f5a).lerp(tmpC.setHex(0x1a2030), night);
      ambient.intensity = 0.12 + night * 0.1 + flash * 2.4;
      skyProps.update(dt, night, storm, sunDir);
      lamps.update(night);
      traffic.update(dt, night);
      (scene.userData.fillerMat as THREE.MeshLambertMaterial).emissiveIntensity = night * 0.9;

      rainMat.opacity = Math.max(0, storm - 0.3) * 0.75;
      rain.visible = rainMat.opacity > 0.01;
      if (rain.visible) {
        for (let i = 0; i < RAIN; i++) {
          let y = rainSeed[i * 3 + 1] - dt * (22 + 10 * storm);
          if (y < 0) y += 24;
          rainSeed[i * 3 + 1] = y;
          const x = rainSeed[i * 3] + (y - 12) * 0.05;
          const z = rainSeed[i * 3 + 2];
          rainPos.set([x, y, z, x - 0.05, y + 0.7, z], i * 6);
        }
        rainGeo.attributes.position.needsUpdate = true;
      }

      // --- districts
      const scr: Record<string, { x: number; y: number; vis: boolean }> = {};
      const scrL: Record<string, { x: number; y: number; vis: boolean }> = {};
      const w = el.clientWidth;
      const h = el.clientHeight;
      for (const id of DISTRICT_ORDER) {
        const v = views[id];
        const n = g.nodes[id];
        const ph = phases[id];
        let c: THREE.Color = v.windowColor;
        let inten = night * 1.15;
        let rimC: THREE.Color = OK;
        let li = 5;
        let dark = 1;
        switch (n.status) {
          case 'CAUTION':
            c = AMBER;
            inten = (0.5 + 0.5 * night) * (0.85 + 0.3 * Math.sin(t * 5 + ph));
            rimC = AMBER;
            break;
          case 'CRITICAL':
            c = RED;
            inten = (0.9 + 0.5 * night) * (1 + 0.5 * Math.sin(t * 9 + ph));
            rimC = RED;
            li = 8;
            break;
          case 'BLACKOUT':
            c = DEAD;
            inten = 0;
            rimC = DEAD_LINE;
            li = 0;
            dark = 0.5;
            break;
          case 'ISOLATED':
            c = BLUE;
            inten = 0.3 + 0.3 * night;
            rimC = BLUE;
            li = 1.5;
            dark = 0.8;
            break;
        }
        darkness[id] = (darkness[id] ?? 1) + (dark - (darkness[id] ?? 1)) * 0.08;
        v.walls.forEach((m, i) => {
          m.emissive.lerp(c, 0.12);
          m.emissiveIntensity += (inten - m.emissiveIntensity) * 0.2;
          m.color.copy(v.wallBase[i]).multiplyScalar(darkness[id]);
        });
        v.rim.color.lerp(rimC, 0.12);
        v.lamp.color.lerp(n.status === 'BLACKOUT' ? DEAD_LINE : rimC, 0.15);
        v.light.color.lerp(c, 0.12);
        v.light.intensity += (li * night * (0.9 + 0.1 * Math.sin(t * 3 + ph)) - v.light.intensity) * 0.15;
        for (const a of v.accents) {
          a.mat.emissive.lerp(n.status === 'NOMINAL' ? a.base : c, 0.12);
          const goal = n.status === 'BLACKOUT' ? 0 : a.baseI * (n.status === 'NOMINAL' ? 0.6 + 0.4 * night : Math.max(0.5, inten));
          a.mat.emissiveIntensity += (goal - a.mat.emissiveIntensity) * 0.2;
        }
        const fx = fxTarget[id];
        if (fx) v.fx.color.setHex(fx.color);
        v.fx.intensity += ((fx ? fx.i : 0) - v.fx.intensity) * 0.35;
        const online = n.status !== 'BLACKOUT' && n.status !== 'ISOLATED';
        v.anim.forEach((fn) => fn(t, online));
        v.crew.forEach((cm) => animateCrewmate(cm, t, MOOD[n.status]));

        // smoke and steam
        const p = v.group.position;
        const emit = (kind: 'steam' | 'smoke' | 'ash' | 'spark', rate: number, x: number, y: number, z: number) => {
          emitAcc[id + kind] = (emitAcc[id + kind] ?? 0) + rate * dt;
          while (emitAcc[id + kind] >= 1) {
            emitAcc[id + kind] -= 1;
            smoke.emit(kind, p.x + x, y, p.z + z);
          }
        };
        if (id === 'industrial' && online) v.stacks.forEach((s) => emit(n.status === 'NOMINAL' ? 'steam' : 'smoke', 2.2, s.x, s.y, s.z));
        if (n.status === 'CAUTION') emit('steam', 2, (Math.random() - 0.5) * 2, v.topY + 0.3, (Math.random() - 0.5) * 1.5);
        if (n.status === 'CRITICAL') {
          emit('smoke', 6, (Math.random() - 0.5) * 2, v.topY + 0.2, (Math.random() - 0.5) * 1.5);
          emit('spark', 5, (Math.random() - 0.5) * 2, v.topY, (Math.random() - 0.5) * 1.5);
        }
        if (n.status === 'BLACKOUT') emit('ash', 1.6, (Math.random() - 0.5) * 2, v.topY * 0.6, (Math.random() - 0.5) * 1.5);

        const mk = markers[id];
        const bad = n.status === 'CRITICAL' || n.status === 'CAUTION' || n.status === 'BLACKOUT';
        mk.visible = bad;
        if (bad) {
          (mk.material as THREE.MeshBasicMaterial).color.copy(n.status === 'CAUTION' ? AMBER : n.status === 'BLACKOUT' ? tmpC.setHex(0x8a96aa) : RED);
          mk.position.set(p.x, v.topY + 1.7 + Math.sin(t * 4 + ph) * 0.25, p.z);
          mk.rotation.y = t * 2;
        }

        tmp.set(p.x, v.topY + 1.0, p.z).project(camera);
        scr[id] = { x: (tmp.x * 0.5 + 0.5) * w, y: (-tmp.y * 0.5 + 0.5) * h, vis: tmp.z < 1 };
        tmp.set(p.x, 0.3, p.z + PAD.d / 2 + 0.5).project(camera);
        scrL[id] = { x: (tmp.x * 0.5 + 0.5) * w, y: (-tmp.y * 0.5 + 0.5) * h, vis: tmp.z < 1 };
      }
      smoke.update(dt);

      const sel = views[g.selectedNodeId];
      ring.position.x = sel.group.position.x;
      ring.position.z = sel.group.position.z;
      (ring.material as THREE.MeshBasicMaterial).opacity = 0.6 + 0.4 * Math.sin(t * 4);
      ring.scale.setScalar(1 + 0.02 * Math.sin(t * 4));

      for (const L of lines) {
        const na = g.nodes[L.a];
        const nb = g.nodes[L.b];
        const dead = na.status === 'BLACKOUT' || nb.status === 'BLACKOUT' || na.isolated || nb.isolated;
        const worst = RANK[na.status] >= RANK[nb.status] ? na.status : nb.status;
        const col = dead ? DEAD_LINE : worst === 'CRITICAL' ? RED : worst === 'CAUTION' ? AMBER : OK;
        L.mat.color.lerp(col, 0.12);
        L.packetMat.color.copy(L.mat.color).lerp(tmpC.setHex(0xffffff), 0.55);
        const forward = na.supply - na.demand >= nb.supply - nb.demand;
        L.packets.forEach((p, k) => {
          p.visible = !dead;
          if (dead) return;
          let u = (t * 0.28 + k / 3) % 1;
          if (!forward) u = 1 - u;
          L.curve.getPoint(u, p.position);
          p.rotation.y = t * 2;
        });
      }

      // --- truck, zones, beams and camera
      const running = g.phase === 'RUNNING' && !gs.tutorialOpen;
      if (running) stepTruck(dt, blockers);
      truckGroup.position.set(truck.x, 0, truck.z);
      truckGroup.rotation.y = truck.heading;
      beaconMat.color.setHex(Math.sin(t * 9) > 0 ? 0xffa500 : 0x553300);
      truckSpot.intensity = 55 * night;
      headMats.forEach((m) => m.color.setRGB(0.7 + night * 0.3, 0.7 + night * 0.28, 0.5 + night * 0.1));
      const obj = currentObjective(g);
      const needKit = !g.crew.hasKit;
      (depotRing.material as THREE.MeshBasicMaterial).opacity = needKit ? 0.6 + 0.4 * Math.sin(t * 5) : 0.15;
      (depotBeam.material as THREE.MeshBasicMaterial).opacity = needKit ? 0.13 + 0.05 * Math.sin(t * 5) : 0.03;
      depotRing.scale.setScalar(needKit ? 1 + 0.05 * Math.sin(t * 5) : 1);
      const tgt = obj.kind === 'DELIVER' && obj.targetNodeId ? views[obj.targetNodeId].group.position : null;
      destRing.visible = destBeam.visible = !!tgt;
      if (tgt) {
        destRing.position.x = destBeam.position.x = tgt.x;
        destRing.position.z = destBeam.position.z = tgt.z;
        destBeam.position.y = 6;
        (destRing.material as THREE.MeshBasicMaterial).opacity = 0.6 + 0.4 * Math.sin(t * 6);
        destRing.scale.setScalar(1 + 0.05 * Math.sin(t * 6));
      }
      if (running && t - lastAct > 0.5) {
        if (Math.hypot(truck.x - DEPOT.x, truck.z - DEPOT.z) < DEPOT.r && !g.crew.hasKit && g.crew.kitCooldown <= 0) {
          gs.takeKit();
          lastAct = t;
        }
        let inside: DistrictId | null = null;
        for (const id of DISTRICT_ORDER) {
          const q = views[id].group.position;
          if (Math.abs(truck.x - q.x) < PAD.w / 2 + 0.4 && Math.abs(truck.z - q.z) < PAD.d / 2 + 0.4) inside = id;
        }
        if (inside !== lastInside) {
          lastInside = inside;
          if (inside) gs.selectNode(inside);
        }
        if (inside && g.crew.hasKit && crewTargets(g).some((n) => n.id === inside) && needsHelp(g, g.nodes[inside])) {
          gs.dropKit(inside);
          lastAct = t;
        }
      }
      const chase = gs.cityView === 'CHASE';
      if (chase !== (lastView === 'CHASE')) {
        if (skipFit) skipFit = false;
        else {
          interacted = false;
          if (!chase) fit();
        }
      }
      // Arrow keys pan the camera (and leave truck-follow if needed)
      const pk = truck.keys;
      const ax = (pk.has('ArrowRight') ? 1 : 0) - (pk.has('ArrowLeft') ? 1 : 0);
      const az = (pk.has('ArrowUp') ? 1 : 0) - (pk.has('ArrowDown') ? 1 : 0);
      if ((ax || az) && running) {
        if (gs.cityView === 'CHASE') enterFree();
        const sp = Math.max(8, camera.position.distanceTo(controls.target) * 0.75) * dt;
        moveGround(ax * sp, az * sp);
        clampTarget();
      }
      lastView = gs.cityView;
      const wantFov = chase ? (camera.aspect < 0.8 ? 50 : 44) : 36;
      if (Math.abs(camera.fov - wantFov) > 0.05) {
        camera.fov += (wantFov - camera.fov) * Math.min(1, dt * 5);
        camera.updateProjectionMatrix();
      }
      controls.enabled = !chase;
      if (chase) {
        const fx = Math.sin(truck.heading);
        const fz = Math.cos(truck.heading);
        const tall = camera.aspect < 0.8;
        const back = (tall ? 13.5 : 10.8) + Math.abs(truck.speed) * 0.35;
        const want = tmp.set(truck.x - fx * back, (tall ? 10.5 : 8.2) + Math.abs(truck.speed) * 0.2, truck.z - fz * back);
        camera.position.lerp(want, 1 - Math.pow(0.001, dt));
        camera.lookAt(truck.x + fx * 4, 0.3, truck.z + fz * 4);
      } else {
        controls.update();
        clampTarget();
      }
      renderer.render(scene, camera);

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
      renderer.domElement.removeEventListener('pointermove', onMove);
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
      truck.keys.clear();
      controls.dispose();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
      });
      tex.map.dispose();
      tex.mask.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  if (failed) return <GridMap />;
  return (
    <div className={`relative h-full w-full overflow-hidden bg-scada-bg ${bleed ? '' : 'rounded-2xl'}`} aria-label="City power map">
      <div ref={host} className="absolute inset-0" />
      <div ref={overlay} className="pointer-events-none absolute inset-0 overflow-hidden">
        <DistrictLabels />
        <CityAlerts />
      </div>
    </div>
  );
}
