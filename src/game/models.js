import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const mats = {};
const mat = (c, opts = {}) => {
  const k = c + JSON.stringify(opts);
  return mats[k] || (mats[k] = new THREE.MeshLambertMaterial({ color: c, flatShading: true, ...opts }));
};
const box = (w, h, d, c, x, y, z, parent, opts) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c, opts));
  m.position.set(x, y, z); parent.add(m); return m;   // y is the CENTRE here
};

// ---------- Danfo bus (faces +x) ----------
function bannerTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#111'; g.fillRect(0, 0, 512, 64);
  g.fillStyle = '#f5c518'; g.font = 'bold 40px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('GOD DEY · OSHODI EXPRESS', 256, 34);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function makeDanfo() {
  const bus = new THREE.Group();
  const YEL = 0xf5c518, BLK = 0x111111, GLASS = 0x20303c;

  // Main body, lower and upper with the classic black stripe between
  box(9.2, 1.3, 3.3, YEL, 0, 1.45, 0, bus);                         // lower
  box(9.22, 0.45, 3.32, BLK, 0, 2.3, 0, bus);                        // stripe
  box(9.2, 1.5, 3.3, YEL, 0, 3.3, 0, bus);                           // upper (window band)
  box(9.4, 0.18, 3.5, 0xdcdcdc, 0, 4.12, 0, bus);                    // roof
  box(2.6, 1.0, 3.3, YEL, 5.7, 1.1, 0, bus);                         // bonnet
  box(0.2, 1.0, 3.0, 0x2a2a2a, 7.05, 1.1, 0, bus);                   // grille
  box(0.6, 0.35, 3.5, 0xbbbbbb, 7.2, 0.55, 0, bus);                  // front bumper
  box(0.4, 0.35, 3.5, 0xbbbbbb, -4.7, 0.55, 0, bus);                 // rear bumper

  // Windows both sides + windscreen + rear window
  for (const side of [-1, 1]) {
    for (let i = 0; i < 5; i++) {
      box(1.35, 1.0, 0.08, GLASS, -3.3 + i * 1.6, 3.35, side * 1.68, bus);
    }
    box(1.4, 0.8, 0.08, GLASS, 3.6, 3.4, side * 1.68, bus);          // driver-side window
    box(0.2, 0.15, 0.2, BLK, 4.9, 2.7, side * 1.9, bus);             // side mirror
  }
  box(0.08, 1.15, 2.7, GLASS, 4.6, 3.35, 0, bus);                    // windscreen
  box(0.08, 1.0, 2.6, GLASS, -4.62, 3.35, 0, bus);                   // rear window

  // Sliding door on the pavement (z-) side, facing the pavement
  box(1.5, 2.2, 0.1, 0x222222, 1.6, 2.3, -1.7, bus);
  box(0.12, 0.3, 0.14, 0xdddddd, 2.2, 2.4, -1.78, bus);

  // Lights and plate
  for (const z of [-1.1, 1.1]) {
    box(0.15, 0.4, 0.55, 0xfffbe0, 7.08, 1.45, z, bus, { emissive: 0x666633 });   // headlights
    box(0.1, 0.35, 0.4, 0xd32f2f, -4.62, 1.45, z, bus, { emissive: 0x330000 });   // tail lights
  }
  box(0.08, 0.35, 1.0, 0xffffff, 7.12, 0.85, 0, bus);                // number plate (front)

  // Destination banner above the windscreen
  const banner = new THREE.Mesh(new THREE.PlaneGeometry(4, 0.5), new THREE.MeshBasicMaterial({ map: bannerTexture() }));
  banner.position.set(1.0, 2.3, 1.67); bus.add(banner);
  const banner2 = banner.clone(); banner2.position.z = -1.67; banner2.rotation.y = Math.PI; bus.add(banner2);

  // Roof rack with luggage
  box(6, 0.12, 2.6, 0x444444, -0.5, 4.3, 0, bus);
  box(1.4, 0.7, 1.2, 0x8d6e63, -2, 4.7, 0, bus);
  box(1.0, 0.5, 1.0, 0x1565c0, 0.4, 4.6, 0.3, bus);

  // Wheels (cylinders with hubs)
  const wheelGeo = new THREE.CylinderGeometry(0.62, 0.62, 0.45, 14);
  const hubGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.5, 8);
  bus.userData.wheels = [];
  for (const x of [-2.9, 4.8]) for (const z of [-1.55, 1.55]) {
    const w = new THREE.Group();
    const tire = new THREE.Mesh(wheelGeo, mat(0x1b1b1b)); const hub = new THREE.Mesh(hubGeo, mat(0xbdbdbd));
    w.add(tire, hub); w.rotation.x = Math.PI / 2; w.position.set(x, 0.62, z);
    bus.add(w); bus.userData.wheels.push(w);
  }
  return bus;
}

// ---------- Person (faces +z), jointed so arms and legs can swing ----------
// Every person made, so the real character models can replace the simple ones once loaded
export const PEOPLE = [];
export function makePerson(o = {}) {
  const SKIN = o.skin ?? 0x8d5524, TOP = o.top ?? 0x1e88e5, BOTTOM = o.bottom ?? 0x2b3a67;
  const HAIR = o.hair ?? 0x15110e, SHOE = o.shoe ?? 0xf2f2f2, female = !!o.female;
  const p = new THREE.Group();
  const part = (w, h, d, c, x, y, z, parent) => box(w, h, d, c, x, y, z, parent);

  part(0.62, 0.7, 0.34, TOP, 0, 1.4, 0, p);                          // torso
  part(0.64, 0.12, 0.36, o.hem ?? TOP, 0, 1.08, 0, p);
  if (female) part(0.74, 0.5, 0.42, o.skirt ?? BOTTOM, 0, 0.95, 0, p); // skirt
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 14, 12), mat(SKIN)); head.position.y = 2.0; p.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.285, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), mat(HAIR));
  hair.position.y = 2.03; p.add(hair);
  if (female) part(0.5, 0.5, 0.16, HAIR, 0, 1.85, -0.22, p);         // long hair
  if (o.cap) part(0.56, 0.1, 0.62, o.cap, 0, 2.27, 0.05, p);         // cap
  part(0.12, 0.12, 0.12, SKIN, 0, 1.78, 0, p);                       // neck
  part(0.05, 0.05, 0.04, 0x111111, -0.1, 2.02, 0.26, p);             // eyes
  part(0.05, 0.05, 0.04, 0x111111, 0.1, 2.02, 0.26, p);
  if (o.bag !== false) part(0.34, 0.5, 0.14, o.bag ?? 0x37474f, 0, 1.45, -0.24, p);

  const limb = (x, y, w, h, d, c, tipC, tipH) => {                   // pivot at the top of the limb
    const g = new THREE.Group(); g.position.set(x, y, 0);
    part(w, h, d, c, 0, -h / 2, 0, g);
    if (tipC) part(w + 0.02, tipH, d + (tipH > 0.15 ? 0.14 : 0), tipC, 0, -h + tipH / 2, tipH > 0.15 ? 0.06 : 0, g);
    p.add(g); return g;
  };
  const sleeve = o.longSleeve ? TOP : TOP;
  p.userData.armL = limb(-0.4, 1.7, 0.18, 0.62, 0.2, sleeve, SKIN, 0.18);
  p.userData.armR = limb(0.4, 1.7, 0.18, 0.62, 0.2, sleeve, SKIN, 0.18);
  p.userData.legL = limb(-0.17, 1.05, 0.26, 1.05, 0.28, BOTTOM, SHOE, 0.2);
  p.userData.legR = limb(0.17, 1.05, 0.26, 1.05, 0.28, BOTTOM, SHOE, 0.2);
  p.userData.phase = Math.random() * 6;
  // Fewer draw calls: merge each body part's pieces that share a colour
  [p, p.userData.armL, p.userData.armR, p.userData.legL, p.userData.legR].forEach(mergeChildren);
  PEOPLE.push({ group: p, opts: o });
  return p;
}

export function makePlayer(scene) {
  const p = makePerson();
  scene.add(p);
  return p;
}

// Call every frame; `speed` is 0..1 of walking pace. Standing people (speed 0) get a gentle idle sway.
export function animatePlayer(p, speed, dt) {
  const u = p.userData;
  if (u.char) { u.char.setMove(speed); u.char.update(dt); return; }
  u.phase += dt * 10 * Math.max(speed, 0.0);
  const s = Math.sin(u.phase) * 0.8 * speed;
  u.legL.rotation.x = s; u.legR.rotation.x = -s;
  u.armL.rotation.x = -s * 0.9; u.armR.rotation.x = s * 0.9;
  p.position.y = Math.abs(Math.sin(u.phase)) * 0.05 * speed;
}

// Standing person chatting: small arm gestures
export function animateIdle(p, t, dt = 0.016) {
  const u = p.userData, k = t + u.phase;
  if (u.char) { u.char.setMove(0); u.char.update(dt); return; }
  u.armR.rotation.x = -0.5 + Math.sin(k * 2.2) * 0.35;
  u.armL.rotation.x = Math.sin(k * 0.9) * 0.08;
  u.legL.rotation.x = u.legR.rotation.x = 0;
}

export { box as _box, mat as _mat };

function mergeChildren(group) {
  const by = new Map(), gone = [];
  for (const o of group.children) {
    if (!o.isMesh) continue;
    o.updateMatrix();
    const g = o.geometry.clone().applyMatrix4(o.matrix), f = g.index ? g.toNonIndexed() : g;
    for (const k of Object.keys(f.attributes)) if (!['position', 'normal', 'uv'].includes(k)) f.deleteAttribute(k);
    (by.get(o.material) || by.set(o.material, []).get(o.material)).push(f); gone.push(o);
  }
  gone.forEach(o => group.remove(o));
  for (const [m, gs] of by) group.add(new THREE.Mesh(mergeGeometries(gs, false), m));
}
