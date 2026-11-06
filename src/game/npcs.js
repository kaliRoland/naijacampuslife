import * as THREE from 'three';
import { makePerson, animatePlayer, animateIdle } from './models.js';

const SKINS = [0x8d5524, 0x6b3e1f, 0xa1693a, 0x4e2e17, 0x7a4a26];
const TOPS = [0xe53935, 0xfdd835, 0x43a047, 0x8e24aa, 0xff7043, 0x00acc1, 0xf5f5f5, 0x3949ab, 0xec407a];
const BOTTOMS = [0x2b3a67, 0x1b1b1b, 0x5d4037, 0x37474f, 0x6d4c41];
const HAIRS = [0x15110e, 0x0d0a08, 0x2a1b12];
const pick = (a, i) => a[i % a.length];

const people = [];   // { obj, kind, ... }

function spawn(scene, i, x, z, opts = {}) {
  const p = makePerson({
    skin: pick(SKINS, i * 3 + 1), top: pick(TOPS, i * 2 + 1), bottom: pick(BOTTOMS, i + 2),
    hair: pick(HAIRS, i), female: i % 2 === 1, bag: i % 3 === 0 ? 0x6d4c41 : false, ...opts,
  });
  p.position.set(x, 0, z);
  scene.add(p);
  return p;
}
function suitcase(p, color) {
  const s = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.25), new THREE.MeshLambertMaterial({ color, flatShading: true }));
  s.position.set(0.62, 0.4, 0.1); p.add(s);
  const h = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.05, 0.05), new THREE.MeshLambertMaterial({ color: 0x222222 }));
  h.position.set(0.62, 0.78, 0.1); p.add(h);
}

// People who walk between waypoints (they turn around at the end)
const ROUTES = [
  [[-3, 14], [-3, -4], [-8, -13], [-8, -30]],
  [[3, -26], [8, -13], [3, -3], [3, 15]],
  [[24, -23], [10, -23], [10, -42], [3, -50]],
  [[-20, 23], [20, 23]],
  [[18, 22], [-14, 22.5]],
  [[-24, -23], [-10, -23], [-10, -12]],
  [[0, -50], [-9, -44], [-9, -30], [-20, -22.5]],
];
// Pairs / small groups chatting: [x, z, faceX, faceZ]
const CHATS = [
  [[7.5, -8], [8.9, -8.4]], [[-11, -30], [-12.2, -30.7]], [[-3.5, 9], [-4.7, 9.6], [-3.6, 10.8]],
  [[14, -26], [15.3, -26.4]], [[-27, -21], [-28.2, -21.5], [-26.6, -22.7]],
];

export function createNPCs(scene) {
  let i = 0;
  ROUTES.forEach(route => {
    const p = spawn(scene, ++i, route[0][0], route[0][1]);
    if (i % 3 === 1) suitcase(p, 0x1565c0);
    people.push({ obj: p, kind: 'walk', route, leg: 0, dir: 1, speed: 1.6 + (i % 4) * 0.25 });
  });
  CHATS.forEach(group => {
    const cx = group.reduce((a, g) => a + g[0], 0) / group.length, cz = group.reduce((a, g) => a + g[1], 0) / group.length;
    group.forEach(([x, z]) => {
      const p = spawn(scene, ++i, x, z);
      p.rotation.y = Math.atan2(cx - x, cz - z);
      people.push({ obj: p, kind: 'idle' });
    });
  });
  // Security guards in uniform at the gate
  const guard = spawn(scene, ++i, 11, 7.6, { top: 0x263238, bottom: 0x1c2329, cap: 0x263238, bag: false, skin: 0x4e2e17, shoe: 0x111111, female: false });
  guard.rotation.y = 0.3; people.push({ obj: guard, kind: 'idle' });
  const guard2 = spawn(scene, ++i, 5.2, 9, { top: 0x263238, bottom: 0x1c2329, cap: 0x263238, bag: false, skin: 0x6b3e1f, shoe: 0x111111, female: false });
  guard2.rotation.y = -0.6; people.push({ obj: guard2, kind: 'idle' });
}

export function updateNPCs(dt, t) {
  for (const n of people) {
    const o = n.obj;
    if (n.kind === 'idle') { animateIdle(o, t); continue; }
    const target = n.route[n.leg + n.dir] ?? n.route[n.leg];
    const dx = target[0] - o.position.x, dz = target[1] - o.position.z, d = Math.hypot(dx, dz);
    if (d < 0.3) {
      const next = n.leg + n.dir;
      n.leg = next;
      if (n.leg + n.dir < 0 || n.leg + n.dir >= n.route.length) n.dir *= -1;
      continue;
    }
    const step = Math.min(d, n.speed * dt);
    o.position.x += dx / d * step; o.position.z += dz / d * step;
    let a = Math.atan2(dx, dz) - o.rotation.y; a = Math.atan2(Math.sin(a), Math.cos(a));
    o.rotation.y += a * Math.min(1, dt * 8);
    const py = o.position.y;
    animatePlayer(o, 0.6, dt);
    void py;
  }
}

// Let other files register standing people so they get the idle animation
export function addIdle(obj) { people.push({ obj, kind: "idle" }); }
