// Hostel Block A, inside (M-01 The Bed): a corridor, Room 14 (the player's), Room 12 (Uche),
// Room 15 (Chuks) and the warden's office. Blocky on purpose. It lives far from the campus
// (x = OX) and the game switches to it when the player walks through the hostel door.
import * as THREE from 'three';
import { makePerson } from './models.js';
import { addIdle } from './npcs.js';

export const OX = 600;                                // the hostel is built 600 units to the right of the campus
export const SPAWN = { x: OX + 0, z: 8.8 };            // where you appear when you come in
export const EXIT = { x: OX + 0, z: 11.2 };           // the door back out
export const BOUNDS = { minX: OX - 10.6, maxX: OX + 9.6, minZ: -17.6, maxZ: 11.8 };

const mats = {};
const mat = (c, o = {}) => { const k = c + JSON.stringify(o); return mats[k] || (mats[k] = new THREE.MeshLambertMaterial({ color: c, flatShading: true, ...o })); };

export function createHostel(scene) {
  const g = new THREE.Group(); g.visible = false; scene.add(g);
  const colliders = [];
  const solidBox = (minX, maxX, minZ, maxZ) => colliders.push({ minX: OX + minX, maxX: OX + maxX, minZ, maxZ });

  // y is the BASE of the box. x is relative to the hostel, z is absolute.
  const box = (w, h, d, c, x, y, z, o, solid = false) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c, o)); m.position.set(OX + x, y + h / 2, z); g.add(m);
    if (solid) solidBox(x - w / 2, x + w / 2, z - d / 2, z + d / 2);
    return m;
  };
  const WALL = 0xd9d2c0, TRIM = 0x0b3d2e, H = 3.4, T = 0.4;
  const wallX = (x, z1, z2) => box(T, H, z2 - z1, WALL, x, 0, (z1 + z2) / 2, {}, true);     // wall running along z
  const wallZ = (z, x1, x2) => box(x2 - x1, H, T, WALL, (x1 + x2) / 2, 0, z, {}, true);     // wall running along x

  // ---- floors ----
  box(5, 0.2, 30, 0x8a8f94, 0, -0.2, -3);                              // corridor
  box(8.5, 0.2, 17, 0xb08968, -6.75, -0.2, -9);                        // rooms 12 and 14
  box(7.5, 0.2, 9, 0xb08968, 6.25, -0.2, -5);                          // room 15
  box(7.5, 0.2, 8, 0xc9b79c, 6.25, -0.2, 7);                           // warden's office
  for (let z = -16; z <= 11; z += 6) box(5, 0.02, 0.1, 0x6f7479, 0, 0.0, z);   // floor tile lines
  box(5, 0.05, 1.2, 0x0b3d2e, 0, 0.0, 11.1);                           // doormat

  // ---- corridor walls (with gaps for the doors) ----
  wallX(-2.5, -18, -14); wallX(-2.5, -11, -7); wallX(-2.5, -4, 12);                // west: doors at -14..-11 (Room 12), -7..-4 (Room 14)
  wallX(2.5, -18, -7); wallX(2.5, -4, 5.5); wallX(2.5, 8.5, 12);                   // east: doors at -7..-4 (Room 15), 5.5..8.5 (office)
  wallZ(-18, -2.5, 2.5);                                                          // north end
  wallZ(12, -2.5, -1.5); wallZ(12, 1.5, 2.5);                                     // south end, gap = hostel door
  // ---- rooms ----
  wallX(-11, -17.5, -0.5); wallZ(-17.5, -11, -2.5); wallZ(-9.5, -11, -2.5); wallZ(-0.5, -11, -2.5);          // west rooms
  wallX(10, -9.5, -0.5); wallZ(-9.5, 2.5, 10); wallZ(-0.5, 2.5, 10);                                          // Room 15
  wallX(10, 3, 11); wallZ(3, 2.5, 10); wallZ(11, 2.5, 10);                                                    // warden's office
  for (const z of [-12.5, -5.5]) box(0.5, 0.5, 3.2, TRIM, -2.5, H - 0.5, z);                                  // door lintels (west)
  for (const z of [-5.5, 7]) box(0.5, 0.5, 3.2, TRIM, 2.5, H - 0.5, z);                                       // door lintels (east)
  box(5, 0.5, 0.5, TRIM, 0, H - 0.1, -17.7);                                                                  // green band, north wall

  // ---- Room 14: bunks, your bed (with a stranger's duffel on it), desk, window ----
  const bunk = (x, z, top = true) => {
    box(2.2, 0.15, 3.4, 0x5d4037, x, 0.5, z, {}, true);                // lower frame
    box(2.0, 0.25, 3.2, 0x1e5fbf, x, 0.65, z);                         // mattress
    box(0.2, 2.2, 0.2, 0x5d4037, x - 1.0, 0, z - 1.6); box(0.2, 2.2, 0.2, 0x5d4037, x + 1.0, 0, z - 1.6);
    box(0.2, 2.2, 0.2, 0x5d4037, x - 1.0, 0, z + 1.6); box(0.2, 2.2, 0.2, 0x5d4037, x + 1.0, 0, z + 1.6);
    if (top) { box(2.0, 0.25, 3.2, 0x1e88e5, x, 1.7, z); }
  };
  bunk(-9.6, -7.6);                                                    // your bunk (bed 3, by the window)
  bunk(-9.6, -2.6);
  const duffel = box(1.5, 0.7, 0.8, 0x8b1e1e, -9.6, 0.9, -7.3);        // the stranger's duffel on your bed
  box(1.0, 0.1, 0.3, 0x333333, -9.6, 1.6, -7.3);                       // its handle
  box(0.1, 1.4, 2.2, 0x7fb3cf, -10.8, 1.4, -6.5, { emissive: 0x1a3548 });   // window glass
  box(2.2, 0.15, 1.1, 0x8d6e63, -5.5, 1.0, -1.3, {}, true); box(0.15, 1.0, 0.15, 0x333333, -6.4, 0, -1.3); box(0.15, 1.0, 0.15, 0x333333, -4.6, 0, -1.3);   // desk
  box(0.5, 1.7, 0.7, 0x78909c, -10.3, 0, -0.9, {}, true);              // wardrobe
  // ---- Room 12 (Uche): a decent bunk ----
  bunk(-9.6, -14.4); box(0.5, 1.7, 0.7, 0x78909c, -10.3, 0, -10.2, {}, true);
  // ---- Room 15 (Chuks): bunk and a little shrine-like shelf (just a shelf) ----
  bunk(8.9, -5.5, false); box(1.4, 1.0, 0.5, 0x6d4c41, 5.5, 0, -9.0, {}, true);
  // ---- warden's office ----
  box(1.2, 0.2, 3.2, 0x6d4c41, 7.8, 0.9, 7, {}, true); box(0.2, 0.9, 3.0, 0x6d4c41, 7.8, 0, 7);
  box(0.3, 0.05, 0.4, 0xffffff, 7.8, 1.1, 6.2); box(0.5, 0.35, 0.4, 0x222222, 7.8, 1.1, 7.6);
  box(1.0, 1.9, 0.6, 0x546e7a, 9.4, 0, 4.3, {}, true);                 // filing cabinet
  box(0.6, 0.5, 0.6, 0x8b1e1e, 5.0, 0, 9.8);                           // chair

  // ---- signs (our own text on small plates) ----
  const sign = (text, w, h, x, y, z, ry, bg = '#0b3d2e', fg = '#f2c94c') => {
    const c = document.createElement('canvas'); c.width = 512; c.height = Math.round(512 * h / w);
    const x2 = c.getContext('2d'); x2.fillStyle = bg; x2.fillRect(0, 0, c.width, c.height);
    x2.strokeStyle = fg; x2.lineWidth = 6; x2.strokeRect(6, 6, c.width - 12, c.height - 12);
    x2.fillStyle = fg; x2.font = `bold ${Math.round(c.height * 0.5)}px Georgia, serif`; x2.textAlign = 'center'; x2.textBaseline = 'middle'; x2.fillText(text, c.width / 2, c.height / 2, c.width - 24);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex }));
    m.position.set(OX + x, y, z); m.rotation.y = ry; g.add(m);
  };
  sign("LION'S DEN HOSTEL · BLOCK A", 3.8, 0.7, 0, 2.6, -17.75, 0);
  sign('ROOM 14', 1.5, 0.5, -2.25, 2.9, -5.5, Math.PI / 2);
  sign('ROOM 12', 1.5, 0.5, -2.25, 2.9, -12.5, Math.PI / 2);
  sign('ROOM 15', 1.5, 0.5, 2.25, 2.9, -5.5, -Math.PI / 2);
  sign("WARDEN'S OFFICE", 2.2, 0.5, 2.25, 2.9, 7, -Math.PI / 2);
  sign('LIGHTS OUT 10 PM · NO NOISE', 3, 0.5, 0, 2.2, 11.8, Math.PI, '#8b1e1e', '#ffffff');
  sign('EXIT', 1.2, 0.4, 0, 3.0, 11.78, Math.PI, '#0b3d2e', '#ffffff');

  // ---- ceiling lamps along the corridor ----
  for (const z of [-14, -6, 2, 9]) { box(0.8, 0.12, 0.8, 0xfff2b0, 0, H - 0.2, z, { emissive: 0xb59a3a }); }

  // ---- the people (marked so the game can hide them outside the hostel) ----
  const people = [];
  const person = (opts, x, z, face, scale = 1) => {
    const p = makePerson(opts);
    p.position.set(OX + x, 0, z); p.rotation.y = face; p.scale.setScalar(scale); p.userData.loc = 'hostel';
    scene.add(p); addIdle(p); people.push(p); p.visible = false;
    return p;
  };
  const EAST = Math.PI / 2, WEST = -Math.PI / 2, SOUTH = 0, NORTH = Math.PI;
  const talkers = [
    { id: 'm01_killer', name: 'Killer', x: -3.3, z: -5.6, radius: 4.2,
      p: person({ top: 0x263238, bottom: 0x1b1b1b, hair: 0x15110e, skin: 0x4e2e17, bag: false, shoe: 0x333333 }, -3.3, -5.6, EAST, 1.14) },
    { id: 'm01_quiet', name: 'The Quiet One', x: -6.5, z: -2.3, radius: 3.6,
      p: person({ top: 0x90a4ae, bottom: 0x37474f, hair: 0x15110e, skin: 0x8d5524, bag: false }, -6.5, -2.3, EAST) },
    { id: 'm01_uche', name: 'Uche', x: -1.5, z: -12.6, radius: 3.6,
      p: person({ top: 0xff7043, bottom: 0x2b3a67, hair: 0x15110e, skin: 0x7a4a26, bag: false }, -1.5, -12.6, SOUTH) },
    { id: 'm01_chuks', name: 'Chuks', x: 1.5, z: -5.2, radius: 3.6,
      p: person({ top: 0xf5f5f5, bottom: 0x1b1b1b, hair: 0x15110e, skin: 0x6b3e1f, bag: false }, 1.5, -5.2, WEST) },
    { id: 'm01_warden', name: 'Warden Bassey', x: 6.4, z: 7, radius: 4.6,
      p: person({ top: 0x6d4c41, bottom: 0x37474f, hair: 0x9e9e9e, skin: 0x6b3e1f, bag: false, cap: 0x6d4c41 }, 6.4, 7, WEST) },
  ];
  // two of Killer's friends, and the other roommate (the Hustler)
  person({ top: 0x7b1fa2, bottom: 0x1b1b1b, hair: 0x0d0a08, skin: 0x6b3e1f, bag: false }, -5.4, -4.4, EAST, 1.05);
  person({ top: 0xb71c1c, bottom: 0x263238, hair: 0x15110e, skin: 0x7a4a26, bag: false }, -5.4, -6.9, EAST, 1.05);
  person({ top: 0xfdd835, bottom: 0x2b3a67, hair: 0x15110e, skin: 0x8d5524, bag: false, female: false }, -8.2, -1.4, EAST);

  // ---- things you can inspect ----
  const bed = { id: 'm01_bed', name: 'Your bed (Room 14)', x: -8.0, z: -6.6, radius: 3.4, kind: 'inspect' };
  const door = { id: 'door:campus', name: 'Leave the hostel', x: 0, z: 10.9, radius: 2.4, kind: 'door' };

  return {
    group: g, colliders, people, bounds: BOUNDS, spawn: SPAWN, exit: EXIT, duffel,
    // x is made absolute here (the hostel sits OX units to the right of the campus)
    interactables: [
      ...talkers.map(t => ({ id: t.id, name: t.name, x: OX + t.x, z: t.z, radius: t.radius, kind: 'talk', obj: t.p })),
      { ...bed, x: OX + bed.x, obj: null }, { ...door, x: OX + door.x, obj: null },
    ],
    x: OX,
  };
}
