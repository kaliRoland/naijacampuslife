// People the player can talk to (Week 2): officer, kiosk seller, the fixer. Plus the queue of students.
import * as THREE from 'three';
import { makePerson } from './models.js';
import { addIdle } from './npcs.js';
import { game } from './state.js';

const TALKERS = [
  { id: 'officer', name: 'Mrs. Adebayo', x: 17, z: -19.3, face: 0, radius: 4.2,
    look: { female: true, top: 0xf5f5f5, skirt: 0x0b3d2e, bottom: 0x0b3d2e, hair: 0x15110e, skin: 0x6b3e1f, bag: false, hem: 0x0b3d2e } },
  { id: 'kiosk', name: 'Aunty Ngozi', x: -14, z: -7.7, face: 0, radius: 4.2,
    look: { female: true, top: 0xe53935, skirt: 0x7b1fa2, bottom: 0x7b1fa2, cap: 0xf2c94c, hair: 0x15110e, skin: 0x8d5524, bag: false } },
  { id: 'fixer', name: 'Skido', x: 11.5, z: -12.2, face: Math.PI * 0.8, radius: 3.4, hideWhen: 'fixerScammed',
    look: { top: 0xff6f00, bottom: 0x1b1b1b, cap: 0x111111, hair: 0x15110e, skin: 0x7a4a26, bag: false } },
];

const QUEUE = [[17.6, -11.4], [17.6, -10], [17.6, -8.6], [15.6, -10.7], [15.6, -9.3]];

let list = [];

export function createInteractables(scene) {
  list = TALKERS.map(t => {
    const obj = makePerson(t.look);
    obj.position.set(t.x, 0, t.z); obj.rotation.y = t.face;
    scene.add(obj); addIdle(obj);
    const marker = new THREE.Mesh(new THREE.OctahedronGeometry(0.28), new THREE.MeshBasicMaterial({ color: 0xf2c94c }));
    marker.position.set(t.x, 3.1, t.z); scene.add(marker);
    return { ...t, obj, marker };
  });
  // Waiting students facing the desk
  QUEUE.forEach(([x, z], i) => {
    const p = makePerson({ skin: [0x8d5524, 0x6b3e1f, 0xa1693a][i % 3], top: [0x43a047, 0x8e24aa, 0x00acc1, 0xe53935, 0xfdd835][i], bottom: 0x2b3a67, female: i % 2 === 0, bag: 0x6d4c41 });
    p.position.set(x, 0, z); p.rotation.y = Math.PI;
    scene.add(p); addIdle(p);
  });
}

// Call every frame. Returns the nearest talker in range, or null.
export function updateInteractables(t, playerPos) {
  let best = null, bd = Infinity;
  for (const it of list) {
    const gone = it.hideWhen && game.flags[it.hideWhen];
    it.obj.visible = !gone; it.marker.visible = !gone;
    if (gone) continue;
    it.marker.position.y = 3.1 + Math.sin(t * 3 + it.x) * 0.15; it.marker.rotation.y = t * 2;
    const d = Math.hypot(playerPos.x - it.x, playerPos.z - it.z);
    if (d < it.radius && d < bd) { best = it; bd = d; }
  }
  return best;
}

export function faceToward(it, pos) {
  it.obj.rotation.y = Math.atan2(pos.x - it.x, pos.z - it.z);
}
