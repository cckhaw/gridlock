import * as THREE from 'three';
import { mulberry32 } from '../engine/rng';

function pixelate(t: THREE.CanvasTexture, repeat = true) {
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Building facade (daytime glass panes) and its emissive mask (lit windows at night). */
export function makeWallTextures() {
  const S = 64;
  const mk = () => {
    const c = document.createElement('canvas');
    c.width = c.height = S;
    return { c, g: c.getContext('2d')! };
  };
  const wall = mk();
  const mask = mk();
  wall.g.fillStyle = '#f2f4f8';
  wall.g.fillRect(0, 0, S, S);
  wall.g.fillStyle = '#dfe4ee';
  for (let i = 0; i < 4; i++) wall.g.fillRect(0, i * 16, S, 1);
  mask.g.fillStyle = '#000';
  mask.g.fillRect(0, 0, S, S);
  const rng = mulberry32(11);
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const px = x * 16 + 3;
      const py = y * 16 + 3;
      wall.g.fillStyle = '#3f6c9e';
      wall.g.fillRect(px, py, 10, 11);
      wall.g.fillStyle = '#8cc4f2';
      wall.g.fillRect(px, py, 4, 4);
      wall.g.fillStyle = '#2d4f78';
      wall.g.fillRect(px, py + 9, 10, 2);
      const on = rng() > 0.22;
      mask.g.fillStyle = on ? `rgba(255,255,255,${0.7 + rng() * 0.3})` : 'rgba(255,255,255,0.05)';
      mask.g.fillRect(px, py, 10, 11);
    }
  }
  return { map: pixelate(new THREE.CanvasTexture(wall.c)), mask: pixelate(new THREE.CanvasTexture(mask.c)) };
}

/** Minecraft-style pixel grass. */
export function makeGrassTexture() {
  const S = 16;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d')!;
  const rng = mulberry32(5);
  const greens = ['#5db14a', '#66bb52', '#58a845', '#6cc257', '#62b44e'];
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    g.fillStyle = greens[Math.floor(rng() * greens.length)];
    g.fillRect(x, y, 1, 1);
  }
  const t = pixelate(new THREE.CanvasTexture(c));
  t.minFilter = THREE.NearestMipmapLinearFilter;
  t.repeat.set(60, 60);
  return t;
}

export function makeAsphaltTexture() {
  const S = 16;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d')!;
  const rng = mulberry32(8);
  const greys = ['#3b4252', '#394050', '#3e4555', '#363d4c'];
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    g.fillStyle = greys[Math.floor(rng() * greys.length)];
    g.fillRect(x, y, 1, 1);
  }
  const t = pixelate(new THREE.CanvasTexture(c));
  t.minFilter = THREE.NearestMipmapLinearFilter;
  return t;
}
