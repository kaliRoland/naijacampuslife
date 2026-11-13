// Things the player can talk to, inspect or walk through, with a gold diamond above each.
// Each belongs to a "set" ('campus' or 'hostel') and only the active set can be used.
import * as THREE from 'three';
import { makePerson } from './models.js';
import { addIdle } from './npcs.js';
import { getState } from '../core/state.js';

let list = [];

// ---------------------------------------------------------------- new content (M-01 and later)
// def: { id, name, x, z, radius, kind:'talk'|'inspect'|'door', obj?, set?, ref?, markerY?, hideWhen? }
// `ref` can point at an object whose x and z change later (for example the hostel door once its model loads).
export function addInteractables(scene, defs, set = 'campus') {
  for (const d of defs) {
    const marker = new THREE.Mesh(new THREE.OctahedronGeometry(0.28), new THREE.MeshBasicMaterial({ color: 0xf2c94c }));
    marker.visible = false; scene.add(marker);
    list.push({ ...d, set: d.set || set, marker, markerY: d.markerY ?? (d.kind === 'talk' ? 3.1 : 2.2) });
  }
}

// ---------------------------------------------------------------- parked Week 2 content (registration, kiosk, fixer)
const LEGACY = [
  { id: 'officer', name: 'Mrs. Adebayo', x: 17, z: -19.3, face: 0, radius: 4.2,
    look: { female: true, top: 0xf5f5f5, skirt: 0x0b3d2e, bottom: 0x0b3d2e, hair: 0x15110e, skin: 0x6b3e1f, bag: false, hem: 0x0b3d2e } },
  { id: 'kiosk', name: 'Aunty Ngozi', x: -14, z: -7.7, face: 0, radius: 4.2,
    look: { female: true, top: 0xe53935, skirt: 0x7b1fa2, bottom: 0x7b1fa2, cap: 0xf2c94c, hair: 0x15110e, skin: 0x8d5524, bag: false } },
  { id: 'fixer', name: 'Skido', x: 11.5, z: -12.2, face: Math.PI * 0.8, radius: 3.4, hideWhen: 'fixerScammed',
    look: { top: 0xff6f00, bottom: 0x1b1b1b, cap: 0x111111, hair: 0x15110e, skin: 0x7a4a26, bag: false } },
];
const QUEUE = [[17.6, -11.4], [17.6, -10], [17.6, -8.6], [15.6, -10.7], [15.6, -9.3]];

export function createLegacyInteractables(scene) {
  const defs = LEGACY.map(t => {
    const obj = makePerson(t.look);
    obj.position.set(t.x, 0, t.z); obj.rotation.y = t.face;
    scene.add(obj); addIdle(obj);
    return { ...t, kind: 'talk', obj };
  });
  addInteractables(scene, defs, 'campus');
  QUEUE.forEach(([x, z], i) => {
    const p = makePerson({ skin: [0x8d5524, 0x6b3e1f, 0xa1693a][i % 3], top: [0x43a047, 0x8e24aa, 0x00acc1, 0xe53935, 0xfdd835][i], bottom: 0x2b3a67, female: i % 2 === 0, bag: 0x6d4c41 });
    p.position.set(x, 0, z); p.rotation.y = Math.PI;
    scene.add(p); addIdle(p);
  });
}

// ---------------------------------------------------------------- every frame
// Returns the nearest usable thing in range, or null.
export function updateInteractables(t, playerPos, activeSet = 'campus') {
  let best = null, bd = Infinity;
  const flags = getState().flags;
  for (const it of list) {
    const here = it.set === activeSet;
    const gone = (it.hideWhen && flags[it.hideWhen]) || !here;
    if (it.obj && it.set === 'campus') it.obj.visible = !gone && activeSet === 'campus';
    it.marker.visible = !gone;
    if (gone) continue;
    const at = it.ref || it;
    it.marker.position.set(at.x, it.markerY + Math.sin(t * 3 + at.x) * 0.15, at.z);
    it.marker.rotation.y = t * 2;
    const d = Math.hypot(playerPos.x - at.x, playerPos.z - at.z);
    if (d < it.radius && d < bd) { best = it; bd = d; }
  }
  return best;
}

export function faceToward(it, pos) {
  if (!it.obj) return;
  const at = it.ref || it;
  it.obj.rotation.y = Math.atan2(pos.x - at.x, pos.z - at.z);
}

export const allInteractables = () => list;
