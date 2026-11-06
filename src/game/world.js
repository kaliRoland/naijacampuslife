import * as THREE from 'three';
import { makeDanfo } from './models.js';

const mats = {};
const mat = (c, o = {}) => { const k = c + JSON.stringify(o); return mats[k] || (mats[k] = new THREE.MeshLambertMaterial({ color: c, flatShading: true, ...o })); };
// y is the BASE of the box here
const box = (w, h, d, c, x, y, z, parent, o) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof c === 'number' ? mat(c, o) : c);
  m.position.set(x, y + h / 2, z); parent.add(m); return m;
};
const colliders = [];
const solid = (x, z, w, d) => colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });

function textTexture(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
const sign = (text, sub, w, h, bg, fg, parent, x, y, z, ry = 0) => {
  const tex = textTexture(1024, Math.round(1024 * h / w), (g, W, H) => {
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.strokeStyle = fg; g.lineWidth = 8; g.strokeRect(12, 12, W - 24, H - 24);
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `bold ${sub ? H * 0.42 : H * 0.5}px Georgia, serif`; g.fillText(text, W / 2, sub ? H * 0.42 : H / 2, W - 60);
    if (sub) { g.font = `italic ${H * 0.2}px Georgia, serif`; g.fillText(sub, W / 2, H * 0.78, W - 60); }
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex }));
  m.position.set(x, y, z); m.rotation.y = ry; parent.add(m); return m;
};

// Building with a window-grid facade on the +z (front) face
function building(w, h, d, wall, roof, floors, cols, x, z, parent, label) {
  const tex = textTexture(512, 256, (g, W, H) => {
    g.fillStyle = '#' + wall.toString(16).padStart(6, '0'); g.fillRect(0, 0, W, H);
    const cw = W / cols, rh = H / floors;
    for (let r = 0; r < floors; r++) for (let c = 0; c < cols; c++) {
      g.fillStyle = '#22343f'; g.fillRect(c * cw + cw * 0.22, r * rh + rh * 0.2, cw * 0.56, rh * 0.55);
      g.fillStyle = '#7fb3cf'; g.fillRect(c * cw + cw * 0.25, r * rh + rh * 0.23, cw * 0.5, rh * 0.22);
      g.fillStyle = '#b9b2a0'; g.fillRect(c * cw + cw * 0.18, r * rh + rh * 0.77, cw * 0.64, rh * 0.06);
    }
  });
  const side = mat(wall);
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [side, side, side, side, new THREE.MeshLambertMaterial({ map: tex }), side]);
  m.position.set(x, h / 2, z); parent.add(m);
  box(w + 1, 0.8, d + 1, roof, x, h, z, parent);
  box(w + 0.4, 0.5, d + 0.4, 0x6d6a60, x, 0, z, parent);
  box(3, 3, 0.6, 0x3b2f2a, x, 0, z + d / 2 + 0.1, parent);                          // door
  box(5, 0.4, 2, roof, x, 3.2, z + d / 2 + 0.9, parent);                            // porch roof
  for (const s of [-2.2, 2.2]) box(0.4, 3.2, 0.4, 0xeeeae0, x + s, 0, z + d / 2 + 1.6, parent);
  if (label) sign(label, null, Math.min(w * 0.7, 12), 1.6, '#0b3d2e', '#f2c94c', parent, x, h - 1.2, z + d / 2 + 0.06);
  solid(x, z, w + 1, d + 1);
}

const tree = (x, z, parent, s = 1) => {
  box(0.7 * s, 2.6 * s, 0.7 * s, 0x6b4a2b, x, 0, z, parent);
  const f = new THREE.Mesh(new THREE.IcosahedronGeometry(2.1 * s, 0), mat(0x2e7d32));
  f.position.set(x, 4 * s, z); parent.add(f);
  const f2 = new THREE.Mesh(new THREE.IcosahedronGeometry(1.5 * s, 0), mat(0x3b9a3f));
  f2.position.set(x + 0.9 * s, 4.9 * s, z + 0.3 * s); parent.add(f2);
  solid(x, z, 1, 1);
};
const bench = (x, z, ry, parent) => {
  const b = new THREE.Group();
  box(2, 0.12, 0.6, 0x8d6e63, 0, 0.5, 0, b); box(2, 0.5, 0.1, 0x8d6e63, 0, 0.7, -0.3, b);
  box(0.12, 0.5, 0.5, 0x333333, -0.85, 0, 0, b); box(0.12, 0.5, 0.5, 0x333333, 0.85, 0, 0, b);
  b.position.set(x, 0, z); b.rotation.y = ry; parent.add(b);
};
const lamp = (x, z, parent, flag) => {
  box(0.2, 5, 0.2, 0x2a2a2a, x, 0, z, parent);
  box(0.9, 0.2, 0.3, 0x2a2a2a, x, 5, z, parent);
  box(0.5, 0.25, 0.4, 0xfff2b0, x, 4.75, z, parent, { emissive: 0x887733 });
  if (flag) box(0.06, 1.6, 1.0, 0x0b3d2e, x + 0.15, 2.8, z + 0.6, parent);
};
const ironGate = (x, z, w, parent) => {                    // sliding iron gate leaf, parked open
  box(w, 0.15, 0.15, 0x1f1f1f, x, 0.3, z, parent); box(w, 0.15, 0.15, 0x1f1f1f, x, 2.6, z, parent);
  for (let i = 0; i <= 10; i++) box(0.1, 2.4, 0.1, 0x1f1f1f, x - w / 2 + (w / 10) * i, 0.3, z, parent);
  for (let i = 0; i < 10; i++) box(0.14, 0.35, 0.14, 0xf2c94c, x - w / 2 + (w / 10) * i, 2.7, z, parent);
};

export function buildWorld(scene) {
  scene.background = new THREE.Color(0x9fd3f0);
  scene.fog = new THREE.Fog(0x9fd3f0, 45, 120);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x556b55, 1.1));
  const sun = new THREE.DirectionalLight(0xfff2cc, 1.2); sun.position.set(30, 50, 20); scene.add(sun);

  const g = new THREE.Group(); scene.add(g);
  const STONE = 0xe8e0cc, GREEN = 0x0b3d2e, GOLD = 0xf2c94c;

  // ---- Ground ----
  box(240, 0.2, 240, 0x6aa84f, 0, -0.2, 0, g);                       // grass
  box(240, 0.2, 10, 0x3a3a3a, 0, -0.1, 30, g);                       // road
  box(240, 0.2, 5, 0xb0a99a, 0, -0.1, 22, g);                        // pavement
  for (let x = -110; x < 110; x += 12) box(5, 0.05, 0.4, 0xffffff, x, 0.02, 30, g);
  box(12, 0.2, 24, 0xb0a99a, 0, -0.1, 7, g);                         // gate forecourt
  box(10, 0.2, 55, 0xc9c1b0, 0, -0.1, -29, g);                       // main avenue
  box(22, 0.2, 22, 0xd4ccb8, 0, -0.08, -20, g);                      // plaza around the fountain
  box(50, 0.2, 4, 0xc9c1b0, 0, -0.1, -23, g);                        // cross path to the buildings
  box(5, 0.2, 7, 0xc9c1b0, -22, -0.1, -22.5, g);                     // spurs to the doors
  box(5, 0.2, 7, 0xc9c1b0, 22, -0.1, -22.5, g);

  // ---- The gate ----
  for (const s of [-1, 1]) {
    const x = s * 6.2;
    box(2.8, 0.8, 2.8, 0x5a5a50, x, 0, 0, g);                         // plinth
    box(2.2, 7, 2.2, STONE, x, 0.8, 0, g);                            // pillar
    box(2.2, 0.4, 2.2, GREEN, x, 3.2, 0, g);                          // green band
    box(2.8, 0.5, 2.8, STONE, x, 7.8, 0, g);                          // cap
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8), mat(GOLD)); ball.position.set(x, 8.8, 0); g.add(ball);
    box(2.8, 0.3, 2.8, GOLD, x, 8.3, 0, g);
    solid(x, 0, 2.8, 2.8);
  }
  box(11, 1.6, 1.6, STONE, 0, 7.6, 0, g);                             // gate beam
  box(11, 0.3, 1.8, GREEN, 0, 9.1, 0, g);                             // beam top trim
  box(2.4, 1.6, 1.8, GOLD, 0, 9.4, 0, g);                             // crest block
  const lion = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.4, 6), mat(0x8b1e1e)); lion.position.set(0, 10.9, 0); g.add(lion);
  for (const [z, ry] of [[0.85, 0], [-0.85, Math.PI]]) {              // banner on both faces
    sign("LION'S DEN UNIVERSITY", 'Knowledge · Courage · Service', 10.6, 1.45, '#0b3d2e', '#f2c94c', g, 0, 7.6 + 0.8, z, ry);
  }
  ironGate(-12.2, -1.3, 8, g); ironGate(12.2, -1.3, 8, g);            // open sliding gates, parked inside
  // Perimeter wall with pilasters and green cap
  for (const s of [-1, 1]) {
    box(60, 3.2, 1, STONE, s * 37.4, 0, 0, g); box(60, 0.35, 1.3, GREEN, s * 37.4, 3.2, 0, g);
    for (let i = 0; i < 6; i++) box(1, 3.7, 1.4, STONE, s * (10 + i * 10), 0, 0, g);
  }
  // Welcome banner stand on the pavement and signboard
  for (const s of [-1, 1]) box(0.25, 4.5, 0.25, 0x333333, s * 6, 0, 17, g);
  sign('WELCOME, FRESHERS!', 'Registration is open at the Admin Block', 12, 2, '#8b1e1e', '#ffffff', g, 0, 4, 17.2);
  sign("LION'S DEN UNIVERSITY", 'All visitors report to security', 4.5, 2.2, '#f5f1e6', '#0b3d2e', g, -9, 2.6, 10);
  box(0.2, 1.4, 0.2, 0x333333, -9, 0, 9.95, g);
  // Guard house + boom barrier
  box(4, 3.4, 4, 0xf0ece0, 11, 0, 4, g); box(4.6, 0.4, 4.6, GREEN, 11, 3.4, 4, g);
  box(0.1, 1.2, 1.8, 0x22343f, 8.95, 1.4, 4, g); box(1.2, 2.3, 0.1, 0x3b2f2a, 11, 0, 6.05, g);
  solid(11, 4, 4.6, 4.6);
  box(0.4, 1.2, 0.4, 0x555555, 7.6, 0, 7, g);
  const boom = box(5, 0.18, 0.18, 0xffffff, 9.9, 2.4, 7, g); boom.rotation.z = 0.5;      // raised barrier

  // ---- Inside the campus ----
  building(20, 9, 12, 0xc9bda3, GREEN, 2, 6, -22, -32, g, 'LECTURE THEATRE');
  building(20, 11, 12, 0xd6cdb6, 0x8b1e1e, 3, 6, 22, -32, g, 'ADMIN BLOCK');
  building(26, 8, 12, 0xcbc2aa, GREEN, 2, 8, 0, -58, g, 'UNIVERSITY LIBRARY');
  building(14, 7, 9, 0xbfb7a0, GREEN, 2, 4, -42, -14, g, null);
  building(14, 7, 9, 0xbfb7a0, GREEN, 2, 4, 42, -14, g, null);

  // Fountain with lion statue on the avenue
  const f = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.8, 0.8, 16), mat(0xaaa59a)); f.position.set(0, 0.4, -20); g.add(f);
  const w = new THREE.Mesh(new THREE.CylinderGeometry(3.1, 3.1, 0.82, 16), mat(0x4fb3d9)); w.position.set(0, 0.42, -20); g.add(w);
  box(1.2, 1.6, 1.2, 0x8a8478, 0, 0.8, -20, g);
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1, 0.8), mat(GOLD)); body.position.set(0, 3, -20); g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8), mat(GOLD)); head.position.set(0.9, 3.6, -20); g.add(head);
  box(0.25, 1.2, 0.25, GOLD, 0.6, 1.8, -19.7, g); box(0.25, 1.2, 0.25, GOLD, -0.6, 1.8, -20.3, g);
  solid(0, -20, 7.6, 7.6);

  // Flower beds beside the forecourt and avenue
  for (const [x, z] of [[-8.5, -6], [8.5, -6], [-8.5, -12], [8.5, -12], [-9, 14], [9, 14]]) {
    box(3, 0.4, 3, 0x6b5a45, x, 0, z, g);
    for (const [dx, dz, c] of [[-0.8, -0.8, 0xe53935], [0.8, -0.8, 0xfdd835], [0, 0.6, 0xec407a], [-0.7, 0.8, 0xfdd835], [0.8, 0.7, 0xe53935]])
      box(0.5, 0.5, 0.5, c, x + dx, 0.4, z + dz, g);
  }
  // Lamps with green flags along the avenue
  for (let z = 10; z > -50; z -= 12) { lamp(-6.5, z, g, true); lamp(6.5, z, g, false); }
  // Trees and benches
  for (const [x, z] of [[-14, 12], [16, 14], [-30, 14], [28, 8], [16, -8], [-14, -44], [14, -44], [-34, -34], [34, -48], [-32, -50], [-48, 6], [50, 4]]) tree(x, z, g);
  for (const [x, z, r] of [[-9, -26, Math.PI / 2], [9, -26, -Math.PI / 2], [-9, -40, Math.PI / 2], [9, -40, -Math.PI / 2]]) bench(x, z, r, g);

  // ---- Registration desk under a canopy (Week 2) ----
  for (const [x, z] of [[13.5, -13.5], [20.5, -13.5], [13.5, -19.5], [20.5, -19.5]]) box(0.2, 3.4, 0.2, 0x444444, x, 0, z, g);
  box(8.4, 0.25, 6.6, 0xffffff, 17, 3.4, -16.5, g);
  for (let i = 0; i < 8; i++) if (i % 2 === 0) box(1.05, 0.28, 6.62, GREEN, 13.1 + i * 1.05 + 0.5, 3.4, -16.5, g);
  sign('STUDENT REGISTRATION', 'Freshers: documents ready!', 7, 1.2, '#0b3d2e', '#f2c94c', g, 17, 2.7, -13.2);
  box(5.4, 0.9, 1.4, 0x7a5a3a, 17, 0, -18, g);                            // desk
  box(5.5, 0.08, 1.5, 0xf2f2f2, 17, 0.9, -18, g);                         // tablecloth
  for (const [dx, c] of [[-1.5, 0xffffff], [-0.6, 0xfff3b0], [0.6, 0xffffff], [1.5, 0xb3e5fc]]) box(0.5, 0.06, 0.7, c, 17 + dx, 0.98, -17.8, g);  // papers
  box(0.7, 0.5, 0.5, 0x222222, 17.9, 0.98, -18.1, g);                     // laptop
  for (const x of [-1.6, 1.6]) box(0.5, 0.9, 0.5, 0x1e5fbf, 17 + x, 0, -19.7, g);   // plastic chairs
  solid(17, -18, 5.4, 1.6);
  for (let i = 0; i < 5; i++) box(0.12, 1, 0.12, 0xb8860b, 15.2 + (i % 2 ? 3.2 : 0), 0, -12.4 + Math.floor(i / 2) * 1.5, g);  // queue stanchions

  // ---- Supplies Kiosk (Week 2) ----
  box(5.2, 3.6, 2, 0x2e7d9a, -14, 0, -9.2, g);                            // kiosk body
  box(5.6, 0.3, 2.6, 0x1b4f63, -14, 3.6, -9.2, g);                        // roof
  box(5.2, 0.9, 0.8, 0x8d6e63, -14, 0, -6.7, g);                          // counter
  box(5.3, 0.08, 0.9, 0xd7ccc8, -14, 0.9, -6.7, g);
  for (let i = 0; i < 6; i++) box(0.9, 0.15, 1.1, i % 2 ? 0xffffff : 0xd32f2f, -16.2 + i * 0.88, 3.0, -5.9, g).rotation.x = -0.25;  // striped awning
  sign('SUPPLIES KIOSK', "Aunty Ngozi's · Photos · Copies · Zobo", 4.8, 0.95, '#1b4f63', '#ffffff', g, -14, 2.7, -8.12);
  for (const [dx, c, h] of [[-1.8, 0xffeb3b, 0.35], [-1.2, 0xe53935, 0.5], [-0.6, 0x43a047, 0.3], [0, 0xffffff, 0.2], [0.6, 0x8e24aa, 0.45], [1.2, 0xff9800, 0.3], [1.8, 0x1e88e5, 0.4]])
    box(0.4, h, 0.4, c, -14 + dx, 0.98, -6.75, g);                        // goods on the counter
  solid(-14, -9.2, 5.2, 2); solid(-14, -6.7, 5.2, 0.9);

  const bus = makeDanfo();
  scene.add(bus);
  bus.position.set(-90, 0, 27);

  return { bus, colliders };
}
